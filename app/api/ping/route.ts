import { generateRequestId, createLogger } from "@/lib/logger"

export async function GET() {
  const requestId = generateRequestId()
  const logger = createLogger({ requestId, route: "/api/ping", method: "GET" })
  
  logger.info("Ping endpoint accessed")
  
  return new Response("pong", { 
    status: 200,
    headers: { "Content-Type": "text/plain" }
  });
}