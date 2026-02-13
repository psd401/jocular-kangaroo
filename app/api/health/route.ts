import { NextResponse } from "next/server"
import { validateDataAPIConnection } from "@/lib/db/data-api-adapter"
import { requireAdmin } from "@/lib/auth/admin-check"
import { generateRequestId, createLogger, startTimer } from "@/lib/logger"

const isProd = process.env.NODE_ENV === "production"

/**
 * Health Check API Endpoint (Admin-only)
 *
 * Validates:
 * - Environment variable configuration
 * - AWS credentials and region setup
 * - RDS Data API connectivity
 * - Basic database query execution
 */
export async function GET() {
  // Require admin authentication
  const authError = await requireAdmin()
  if (authError) return authError

  const requestId = generateRequestId()
  const logger = createLogger({ requestId, route: "/api/health", method: "GET" })
  const timer = startTimer("health-check")

  logger.info("Health check initiated")

  interface HealthCheckResult {
    timestamp: string
    status: string
    checks: {
      environment: {
        status: string
        missingCount?: number
        missingVariables?: string[]
        awsRegion?: string
        nodeEnv?: string
        details?: Record<string, unknown>
        error?: string
      }
      authentication: {
        status: string
        authConfigured?: boolean
        error?: string
        hint?: string
      }
      database: {
        status: string
        success?: boolean
        configured?: boolean
        hint?: string
        error?: unknown
        [key: string]: unknown
      }
    }
    diagnostics?: {
      hints: string[]
    }
  }

  const healthCheck: HealthCheckResult = {
    timestamp: new Date().toISOString(),
    status: "checking",
    checks: {
      environment: { status: "pending" },
      authentication: { status: "pending" },
      database: { status: "pending" },
    },
  }

  // 1. Check environment variables
  logger.debug("Checking environment variables")
  try {
    const requiredEnvVars = [
      "AUTH_URL",
      "AUTH_SECRET",
      "AUTH_COGNITO_CLIENT_ID",
      "AUTH_COGNITO_ISSUER",
      "NEXT_PUBLIC_COGNITO_USER_POOL_ID",
      "NEXT_PUBLIC_COGNITO_CLIENT_ID",
      "NEXT_PUBLIC_COGNITO_DOMAIN",
      "NEXT_PUBLIC_AWS_REGION",
      "RDS_RESOURCE_ARN",
      "RDS_SECRET_ARN",
    ]

    const missingVars = requiredEnvVars.filter((varName) => !process.env[varName])
    const region =
      process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || process.env.NEXT_PUBLIC_AWS_REGION

    if (isProd) {
      // Production: expose counts only, not variable names
      healthCheck.checks.environment = {
        status: missingVars.length === 0 ? "healthy" : "unhealthy",
        missingCount: missingVars.length,
        awsRegion: region ? "configured" : "not configured",
        nodeEnv: process.env.NODE_ENV,
      }
    } else {
      healthCheck.checks.environment = {
        status: missingVars.length === 0 ? "healthy" : "unhealthy",
        missingVariables: missingVars,
        awsRegion: region || "not configured",
        nodeEnv: process.env.NODE_ENV,
        details: {
          hasAuthUrl: !!process.env.AUTH_URL,
          hasAuthSecret: !!process.env.AUTH_SECRET,
          hasCognitoConfig:
            !!process.env.AUTH_COGNITO_CLIENT_ID && !!process.env.AUTH_COGNITO_ISSUER,
          hasRdsConfig:
            !!process.env.RDS_RESOURCE_ARN && !!process.env.RDS_SECRET_ARN,
          hasAwsRegion: !!region,
        },
      }
    }
  } catch (error) {
    logger.error("Environment check failed", { error })
    healthCheck.checks.environment = {
      status: "error",
      error: isProd ? "Environment check failed" : (error instanceof Error ? error.message : "Unknown error"),
    }
  }

  // 2. Check authentication config
  logger.debug("Checking authentication")
  healthCheck.checks.authentication = {
    status:
      process.env.AUTH_SECRET && process.env.AUTH_COGNITO_CLIENT_ID
        ? "healthy"
        : "unhealthy",
    authConfigured:
      !!process.env.AUTH_SECRET && !!process.env.AUTH_COGNITO_CLIENT_ID,
  }

  // 3. Check database connectivity
  logger.debug("Checking database connectivity")
  if (process.env.RDS_RESOURCE_ARN && process.env.RDS_SECRET_ARN) {
    try {
      const dbValidation = await validateDataAPIConnection()
      healthCheck.checks.database = {
        status: dbValidation.success ? "healthy" : "unhealthy",
        success: dbValidation.success,
      }
    } catch (error) {
      logger.error("Database check failed", { error })
      healthCheck.checks.database = {
        status: "error",
        error: isProd
          ? "Database connectivity check failed"
          : error instanceof Error
            ? error.message
            : "Unknown error",
      }
    }
  } else {
    healthCheck.checks.database = {
      status: "unhealthy",
      configured: false,
      hint: isProd ? "Database not configured" : "Database environment variables (RDS_RESOURCE_ARN, RDS_SECRET_ARN) not set",
    }
  }

  // 4. Overall health status
  const allHealthy = Object.values(healthCheck.checks).every(
    (check) => check.status === "healthy"
  )

  healthCheck.status = allHealthy ? "healthy" : "unhealthy"

  logger.info("Health check completed", {
    status: healthCheck.status,
    environmentStatus: healthCheck.checks.environment.status,
    authStatus: healthCheck.checks.authentication.status,
    databaseStatus: healthCheck.checks.database.status,
  })

  timer()

  // 5. Add diagnostic hints if unhealthy (non-production only)
  if (!allHealthy && !isProd) {
    healthCheck.diagnostics = {
      hints: [],
    }

    if (healthCheck.checks.environment.status !== "healthy") {
      healthCheck.diagnostics.hints.push(
        "Missing environment variables. Check AWS Amplify console environment variables configuration."
      )
    }

    if (healthCheck.checks.database.status !== "healthy") {
      healthCheck.diagnostics.hints.push(
        "Database connectivity issue. Check RDS_RESOURCE_ARN and RDS_SECRET_ARN values."
      )
    }
  }

  return NextResponse.json(healthCheck, {
    status: allHealthy ? 200 : 503,
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate",
      "Content-Type": "application/json",
    },
  })
}
