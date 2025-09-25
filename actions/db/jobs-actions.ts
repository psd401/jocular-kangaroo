"use server"

import { InsertJob, SelectJob } from "@/types/db-types"
import { ActionState } from "@/types"
import { createLogger, generateRequestId, startTimer, sanitizeForLogging } from "@/lib/logger"
import { db } from "@/lib/db/drizzle-client"
import { jobs } from "@/src/db/schema"
import { eq } from "drizzle-orm"
import { handleError, createSuccess, ErrorFactories } from "@/lib/error-utils"

export async function createJobAction(
  job: Omit<InsertJob, "id" | "createdAt" | "updatedAt">
): Promise<ActionState<SelectJob>> {
  const requestId = generateRequestId()
  const timer = startTimer("createJobAction")
  const log = createLogger({ requestId, action: "createJobAction" })

  try {
    log.info("Action started", { params: sanitizeForLogging(job) })

    if (!job.userId) {
      log.warn("Missing userId")
      throw ErrorFactories.validation("A userId must be provided to create a job.")
    }

    // Convert userId to number if it's a string
    const userIdNum = typeof job.userId === 'string' ? parseInt(job.userId, 10) : job.userId;
    if (isNaN(userIdNum)) {
      log.warn("Invalid userId", { userId: job.userId })
      throw ErrorFactories.validation("Invalid userId provided.")
    }

    const result = await db
      .insert(jobs)
      .values({
        userId: userIdNum,
        status: job.status || 'pending',
        jobType: job.type,
        inputData: job.input ? JSON.parse(job.input) : null,
        outputData: job.output ? JSON.parse(job.output) : null,
        errorMessage: job.error || null,
      })
      .returning()

    if (!result || result.length === 0) {
      throw ErrorFactories.database("Failed to create job: no record returned.")
    }

    const newJob = result[0];
    const selectJob: SelectJob = {
      id: newJob.id,
      userId: newJob.userId!,
      status: newJob.status,
      type: newJob.jobType,
      input: newJob.inputData ? JSON.stringify(newJob.inputData) : '',
      output: newJob.outputData ? JSON.stringify(newJob.outputData) : null,
      error: newJob.errorMessage,
      createdAt: newJob.createdAt,
      updatedAt: newJob.createdAt, // Jobs don't have separate updatedAt in schema
    }

    timer({ status: "success" })
    log.info("Job created successfully", { jobId: newJob.id })
    return createSuccess(selectJob, "Job created successfully")
  } catch (error) {
    timer({ status: "error" })
    return handleError(error, "Failed to create job", {
      context: "createJobAction",
      requestId,
      operation: "createJob"
    })
  }
}

export async function getJobAction(id: string): Promise<ActionState<SelectJob>> {
  const requestId = generateRequestId()
  const timer = startTimer("getJobAction")
  const log = createLogger({ requestId, action: "getJobAction" })

  try {
    log.info("Action started", { params: sanitizeForLogging({ id }) })

    const idNum = parseInt(id, 10);
    if (isNaN(idNum)) {
      log.warn("Invalid job ID", { id })
      throw ErrorFactories.validation("Invalid job ID")
    }

    const result = await db
      .select()
      .from(jobs)
      .where(eq(jobs.id, idNum))
      .limit(1)

    if (!result || result.length === 0) {
      timer({ status: "success" })
      log.info("Job not found", { jobId: idNum })
      throw ErrorFactories.notFound("Job not found")
    }

    const job = result[0];
    const selectJob: SelectJob = {
      id: job.id,
      userId: job.userId!,
      status: job.status,
      type: job.jobType,
      input: job.inputData ? JSON.stringify(job.inputData) : '',
      output: job.outputData ? JSON.stringify(job.outputData) : null,
      error: job.errorMessage,
      createdAt: job.createdAt,
      updatedAt: job.createdAt, // Jobs don't have separate updatedAt in schema
    }

    timer({ status: "success" })
    log.info("Job retrieved successfully", { jobId: idNum })
    return createSuccess(selectJob, "Job retrieved successfully")
  } catch (error) {
    timer({ status: "error" })
    return handleError(error, "Failed to get job", {
      context: "getJobAction",
      requestId,
      operation: "getJob"
    })
  }
}

export async function getUserJobsAction(userId: string): Promise<ActionState<SelectJob[]>> {
  const requestId = generateRequestId()
  const timer = startTimer("getUserJobsAction")
  const log = createLogger({ requestId, action: "getUserJobsAction" })

  try {
    log.info("Action started", { params: sanitizeForLogging({ userId }) })

    const userIdNum = parseInt(userId, 10);
    if (isNaN(userIdNum)) {
      log.warn("Invalid user ID", { userId })
      throw ErrorFactories.validation("Invalid user ID")
    }

    const result = await db
      .select()
      .from(jobs)
      .where(eq(jobs.userId, userIdNum))

    const selectJobs: SelectJob[] = result.map(job => ({
      id: job.id,
      userId: job.userId!,
      status: job.status,
      type: job.jobType,
      input: job.inputData ? JSON.stringify(job.inputData) : '',
      output: job.outputData ? JSON.stringify(job.outputData) : null,
      error: job.errorMessage,
      createdAt: job.createdAt,
      updatedAt: job.createdAt, // Jobs don't have separate updatedAt in schema
    }))

    timer({ status: "success" })
    log.info("Jobs retrieved successfully", { count: selectJobs.length })
    return createSuccess(selectJobs, "Jobs retrieved successfully")
  } catch (error) {
    timer({ status: "error" })
    return handleError(error, "Failed to get jobs", {
      context: "getUserJobsAction",
      requestId,
      operation: "getUserJobs"
    })
  }
}

export async function updateJobAction(
  id: string,
  data: Partial<Omit<InsertJob, 'id' | 'userId'>>
): Promise<ActionState<SelectJob>> {
  const requestId = generateRequestId()
  const timer = startTimer("updateJobAction")
  const log = createLogger({ requestId, action: "updateJobAction" })

  try {
    log.info("Action started", { params: sanitizeForLogging({ id, data }) })

    const idNum = parseInt(id, 10);
    if (isNaN(idNum)) {
      log.warn("Invalid job ID", { id })
      throw ErrorFactories.validation("Invalid job ID")
    }

    // Build update object
    const updateData: Partial<typeof jobs.$inferInsert> = {}

    if (data.status !== undefined) {
      updateData.status = data.status
    }
    if (data.output !== undefined) {
      updateData.outputData = data.output ? JSON.parse(data.output) : null
    }
    if (data.error !== undefined) {
      updateData.errorMessage = data.error
    }
    if (data.type !== undefined) {
      updateData.jobType = data.type
    }
    if (data.input !== undefined) {
      updateData.inputData = data.input ? JSON.parse(data.input) : null
    }

    if (Object.keys(updateData).length === 0) {
      log.warn("No valid fields to update")
      throw ErrorFactories.validation("No valid fields to update")
    }

    const result = await db
      .update(jobs)
      .set(updateData)
      .where(eq(jobs.id, idNum))
      .returning()

    if (!result || result.length === 0) {
      throw ErrorFactories.notFound("Failed to update job or job not found.")
    }

    const updatedJob = result[0];
    const selectJob: SelectJob = {
      id: updatedJob.id,
      userId: updatedJob.userId!,
      status: updatedJob.status,
      type: updatedJob.jobType,
      input: updatedJob.inputData ? JSON.stringify(updatedJob.inputData) : '',
      output: updatedJob.outputData ? JSON.stringify(updatedJob.outputData) : null,
      error: updatedJob.errorMessage,
      createdAt: updatedJob.createdAt,
      updatedAt: updatedJob.createdAt, // Jobs don't have separate updatedAt in schema
    }

    timer({ status: "success" })
    log.info("Job updated successfully", { jobId: idNum })
    return createSuccess(selectJob, "Job updated successfully")
  } catch (error) {
    timer({ status: "error" })
    return handleError(error, "Failed to update job", {
      context: "updateJobAction",
      requestId,
      operation: "updateJob"
    })
  }
}

export async function deleteJobAction(id: string): Promise<ActionState<void>> {
  const requestId = generateRequestId()
  const timer = startTimer("deleteJobAction")
  const log = createLogger({ requestId, action: "deleteJobAction" })

  try {
    log.info("Action started", { params: sanitizeForLogging({ id }) })

    const idNum = parseInt(id, 10);
    if (isNaN(idNum)) {
      log.warn("Invalid job ID", { id })
      throw ErrorFactories.validation("Invalid job ID")
    }

    await db
      .delete(jobs)
      .where(eq(jobs.id, idNum))

    timer({ status: "success" })
    log.info("Job deleted successfully", { jobId: idNum })
    return createSuccess(undefined, "Job deleted successfully")
  } catch (error) {
    timer({ status: "error" })
    return handleError(error, "Failed to delete job", {
      context: "deleteJobAction",
      requestId,
      operation: "deleteJob"
    })
  }
} 