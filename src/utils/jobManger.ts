// utils/jobManager.ts
import { generateReadmeFromRepo } from "./readmeGenerator";
import { v4 as uuidv4 } from "uuid";

// In-memory job storage (replace with database in production)
type JobStatus = "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";

interface Job {
  id: string;
  repoUrl: string;
  status: JobStatus;
  content?: string;
  error?: string;
  progress: number;
  createdAt: Date;
  updatedAt: Date;
}

// Simple in-memory store (replace with a real database for production)
const jobs = new Map<string, Job>();

// Clean up old jobs periodically
setInterval(() => {
  const now = new Date();
  for (const [id, job] of jobs.entries()) {
    // Remove jobs older than 1 hour
    if (now.getTime() - job.createdAt.getTime() > 3600000) {
      jobs.delete(id);
    }
  }
}, 300000); // Run every 5 minutes

export async function startReadmeGeneration(repoUrl: string): Promise<string> {
  const jobId = uuidv4();
  
  // Create a new job
  const job: Job = {
    id: jobId,
    repoUrl,
    status: "PENDING",
    progress: 0,
    createdAt: new Date(),
    updatedAt: new Date()
  };
  
  jobs.set(jobId, job);
  
  // Start processing in the background
  processJob(job);
  
  return jobId;
}

export async function getReadmeGenerationStatus(jobId: string) {
  const job = jobs.get(jobId);
  
  if (!job) {
    return {
      jobId,
      status: "FAILED",
      error: "Job not found",
      progress: 0,
    };
  }
  
  return {
    jobId: job.id,
    status: job.status,
    content: job.content,
    error: job.error,
    progress: job.progress,
  };
}

async function processJob(job: Job) {
  try {
    // Update job status
    job.status = "PROCESSING";
    job.progress = 10;
    job.updatedAt = new Date();
    
    // Fetch repo content and generate README
    job.progress = 30;
    jobs.set(job.id, job);
    
    const readme = await generateReadmeFromRepo(job.repoUrl);
    
    // Update job with results
    job.status = "COMPLETED";
    job.content = readme;
    job.progress = 100;
    job.updatedAt = new Date();
    jobs.set(job.id, job);
  } catch (error) {
    // Handle errors
    job.status = "FAILED";
    job.error = error instanceof Error ? error.message : "Unknown error occurred";
    job.updatedAt = new Date();
    jobs.set(job.id, job);
  }
}