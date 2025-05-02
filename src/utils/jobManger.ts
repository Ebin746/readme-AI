import { createClient } from '@supabase/supabase-js';
import { generateReadmeFromRepo } from "./readmeGenerator";
import { v4 as uuidv4 } from "uuid";
import { Database } from '@/types/supabase';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY as string;

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Supabase URL or Service Key is missing in environment variables");
}

const supabase = createClient<Database>(supabaseUrl, supabaseKey);

const activeJobs = new Map<string, { 
  controller: AbortController, 
  updateProgress: (progress: number) => Promise<void>
}>();

async function updateProgressWithRetry(jobId: string, progress: number, retries: number = 3, delay: number = 1000): Promise<void> {
  for (let i = 0; i < retries; i++) {
    try {
      const { error } = await supabase
        .from('readme_jobs')
        .update({ 
          progress, 
          updated_at: new Date().toISOString(),
        })
        .eq('id', jobId);
      
      if (error) {
        throw new Error(`Supabase update error: ${error.message}`);
      }
      return;
    } catch (error) {
      console.warn(`Failed to update progress for job ${jobId}, retrying (${i + 1}/${retries})...`, error);
      if (i === retries - 1) {
        console.error(`Failed to update progress for job ${jobId} after ${retries} attempts:`, error);
        throw error;
      }
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

export async function startReadmeGeneration(repoUrl: string): Promise<string> {
  const jobId = uuidv4();

  try {
    const { error } = await supabase
      .from('readme_jobs')
      .insert([
        { 
          id: jobId,
          repo_url: repoUrl,
          status: 'PENDING',
          progress: 0,
          created_at: new Date().toISOString(),
        },
      ]);

    if (error) {
      throw new Error(`Failed to create job: ${error.message}`);
    }

    const controller = new AbortController();
    
    const updateProgress = async (progress: number) => {
      await updateProgressWithRetry(jobId, progress);
    };

    activeJobs.set(jobId, { controller, updateProgress });

    Promise.race([
      processJob(jobId, repoUrl, controller.signal, updateProgress),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Job timed out after 10 minutes')), 10 * 60 * 1000)
      ),
    ]).catch(async (error) => {
      console.error(`Job ${jobId} failed:`, error);
      try {
        await supabase
          .from('readme_jobs')
          .update({ 
            status: 'FAILED',
            error: error.message || 'Job failed',
            updated_at: new Date().toISOString(),
          })
          .eq('id', jobId);
      } catch (updateError) {
        console.error(`Failed to update job ${jobId} status to FAILED:`, updateError);
      }
      activeJobs.delete(jobId);
    });

    return jobId;
  } catch (error) {
    console.error(`Error starting job ${jobId}:`, error);
    throw error;
  }
}

export async function getReadmeGenerationStatus(jobId: string) {
  try {
    const { data: job, error } = await supabase
      .from('readme_jobs')
      .select('*')
      .eq('id', jobId)
      .single();

    if (error || !job) {
      return {
        jobId,
        status: "FAILED" as const,
        error: error?.message || "Job not found",
        progress: 0,
      };
    }

    return {
      jobId: job.id,
      status: job.status,
      content: job.content,
      error: job.error,
      progress: job.progress || 0,
    };
  } catch (error) {
    console.error(`Error fetching status for job ${jobId}:`, error);
    return {
      jobId,
      status: "FAILED" as const,
      error: error instanceof Error ? error.message : "Failed to fetch job status",
      progress: 0,
    };
  }
}

export async function cancelReadmeGeneration(jobId: string): Promise<boolean> {
  const job = activeJobs.get(jobId);
  if (!job) {
    const { data: jobData } = await supabase
      .from('readme_jobs')
      .select('status')
      .eq('id', jobId)
      .single();
    
    if (!jobData || jobData.status === 'COMPLETED' || jobData.status === 'FAILED') {
      return false;
    }
  }

  try {
    if (job) {
      job.controller.abort();
      activeJobs.delete(jobId);
    }

    const { error } = await supabase
      .from('readme_jobs')
      .update({ 
        status: 'FAILED',
        error: 'Job cancelled by user', 
        updated_at: new Date().toISOString(),
      })
      .eq('id', jobId);

    if (error) {
      console.error(`Failed to cancel job ${jobId}:`, error);
      return false;
    }

    return true;
  } catch (error) {
    console.error(`Error cancelling job ${jobId}:`, error);
    return false;
  }
}

async function processJob(
  jobId: string, 
  repoUrl: string, 
  signal: AbortSignal,
  updateProgress: (progress: number) => Promise<void>
) {
  try {
    console.log(`Starting job ${jobId} for repo ${repoUrl}`);

    const { error: updateError } = await supabase
      .from('readme_jobs')
      .update({ 
        status: 'PROCESSING',
        progress: 10,
        updated_at: new Date().toISOString(),
      })
      .eq('id', jobId);

    if (updateError) {
      throw new Error(`Failed to update job status to PROCESSING: ${updateError.message}`);
    }

    if (signal.aborted) throw new Error("Job was cancelled");

    await updateProgress(20);

    const progressCallback = async (progress: number) => {
      const scaledProgress = Math.min(90, Math.floor(20 + (progress * 0.7)));
      console.log(`Job ${jobId} progress: ${scaledProgress}%`);
      await updateProgress(scaledProgress);
    };

    const readme = await generateReadmeFromRepo(repoUrl, progressCallback, signal);

    if (signal.aborted) throw new Error("Job was cancelled");

    await updateProgress(95);

    const { error: completeError } = await supabase
      .from('readme_jobs')
      .update({ 
        status: 'COMPLETED',
        content: readme,
        progress: 100,
        updated_at: new Date().toISOString(),
      })
      .eq('id', jobId);

    if (completeError) {
      throw new Error(`Failed to save README: ${completeError.message}`);
    }

    console.log(`Job ${jobId} completed successfully`);
  } catch (error) {
    const errorMessage = signal.aborted 
      ? "Job cancelled by user"
      : error instanceof Error ? error.message : "Unknown error occurred";

    console.error(`Job ${jobId} failed:`, error);

    try {
      await supabase
        .from('readme_jobs')
        .update({ 
          status: 'FAILED',
          error: errorMessage,
          updated_at: new Date().toISOString(),
        })
        .eq('id', jobId);
    } catch (updateError) {
      console.error(`Failed to update job ${jobId} status to FAILED:`, updateError);
    }
  } finally {
    activeJobs.delete(jobId);
  }
}