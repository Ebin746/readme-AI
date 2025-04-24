// utils/jobManager.ts
import { createClient } from '@supabase/supabase-js';
import { generateReadmeFromRepo } from "./readmeGenerator";
import { v4 as uuidv4 } from "uuid";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY as string;
const supabase = createClient(supabaseUrl, supabaseKey);

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
  
  // Start the job processing (without waiting for completion)
  processJob(jobId, repoUrl).catch(console.error);
  
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

async function processJob(jobId: string, repoUrl: string) {
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
    
    // Generate README
    const readme = await generateReadmeFromRepo(repoUrl);
    
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
    // Handle errors
    await supabase
      .from('readme_jobs')
      .update({ 
        status: 'FAILED',
        error: error instanceof Error ? error.message : "Unknown error occurred",
        updated_at: new Date().toISOString()
      })
      .eq('id', jobId);
  }
}