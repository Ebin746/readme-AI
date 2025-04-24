import { createClient } from '@supabase/supabase-js';
import { generateReadmeFromRepo } from "./readmeGenerator";
import { v4 as uuidv4 } from "uuid";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY as string;
const supabase = createClient(supabaseUrl, supabaseKey);

// Track progress for active jobs
const activeJobs = new Map<string, { 
  controller: AbortController, 
  updateProgress: (progress: number) => Promise<void>
}>();

export async function startReadmeGeneration(repoUrl: string): Promise<string> {
  const jobId = uuidv4();
  
  // Create a new job in the database
  await supabase
    .from('readme_jobs')
    .insert([
      { 
        id: jobId,
        repo_url: repoUrl,
        status: 'PENDING',
        progress: 0,
        created_at: new Date().toISOString()
      }
    ]);

  // Create an abort controller to potentially cancel the job
  const controller = new AbortController();
  
  // Function to update progress
  const updateProgress = async (progress: number) => {
    await supabase
      .from('readme_jobs')
      .update({ 
        progress, 
        updated_at: new Date().toISOString()
      })
      .eq('id', jobId);
  };
  
  // Store the job control info
  activeJobs.set(jobId, { controller, updateProgress });

  // Start the job processing (without waiting for completion)
  processJob(jobId, repoUrl, controller.signal, updateProgress).catch(console.error);
  
  return jobId;
}

export async function getReadmeGenerationStatus(jobId: string) {
  const { data: job, error } = await supabase
    .from('readme_jobs')
    .select('*')
    .eq('id', jobId)
    .single();
    
  if (error || !job) {
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

// New function to cancel a job
export async function cancelReadmeGeneration(jobId: string): Promise<boolean> {
  const job = activeJobs.get(jobId);
  if (!job) return false;
  
  job.controller.abort();
  activeJobs.delete(jobId);
  
  await supabase
    .from('readme_jobs')
    .update({ 
      status: 'FAILED',
      error: 'Job cancelled by user', 
      updated_at: new Date().toISOString()
    })
    .eq('id', jobId);
    
  return true;
}

async function processJob(
  jobId: string, 
  repoUrl: string, 
  signal: AbortSignal,
  updateProgress: (progress: number) => Promise<void>
) {
  try {
    // Update job status
    await supabase
      .from('readme_jobs')
      .update({ 
        status: 'PROCESSING',
        progress: 10,
        updated_at: new Date().toISOString()
      })
      .eq('id', jobId);
    
    // Check for abort signal
    if (signal.aborted) throw new Error("Job was cancelled");
    
    // Update progress to 20%
    await updateProgress(20);
      
    // Generate README with progress updates
    const progressCallback = async (progress: number) => {
      // Scale progress from 0-100 to 20-90 range
      const scaledProgress = Math.floor(20 + (progress * 0.7));
      await updateProgress(scaledProgress);
    };
    
    const readme = await generateReadmeFromRepo(repoUrl, progressCallback, signal);
    
    // Check again for abort signal
    if (signal.aborted) throw new Error("Job was cancelled");
    
    // Update job with results
    await supabase
      .from('readme_jobs')
      .update({ 
        status: 'COMPLETED',
        content: readme,
        progress: 100,
        updated_at: new Date().toISOString()
      })
      .eq('id', jobId);
  } catch (error) {
    // Check if this was a cancellation
    const errorMessage = signal.aborted 
      ? "Job cancelled by user"
      : error instanceof Error ? error.message : "Unknown error occurred";

    // Handle errors
    await supabase
      .from('readme_jobs')
      .update({ 
        status: 'FAILED',
        error: errorMessage,
        updated_at: new Date().toISOString()
      })
      .eq('id', jobId);
  } finally {
    // Clean up the active job reference
    activeJobs.delete(jobId);
  }
}