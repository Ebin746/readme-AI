"use client";
import { useState, useEffect, useCallback } from "react";
import { createClient } from '@supabase/supabase-js';
import { Database } from "@/types/supabase";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseKey) {
  console.error("Supabase URL or Anon Key is missing in environment variables");
}

export function useReadmeGeneration(repoUrl: string) {
  const [readme, setReadme] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [progress, setProgress] = useState(0);
  const [jobId, setJobId] = useState<string | null>(null);

  const getSupabase = useCallback(() => {
    return createClient<Database>(supabaseUrl, supabaseKey, {
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    });
  }, []);

  useEffect(() => {
    if (!jobId) return;

    const supabase = getSupabase();
    const channelName = `job-${jobId}`;

    const subscription = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'readme_jobs',
          filter: `id=eq.${jobId}`,
        },
        (payload) => {
          console.log('Supabase update received:', payload);
          const job = payload.new;

          setProgress(job.progress || 0);

          if (job.status === 'COMPLETED' && job.content) {
            const cleanedReply = job.content
              .replace(/```markdown/g, "")
              .replace(/```/g, "");
            setReadme(cleanedReply);
            setLoading(false);
            setJobId(null);
          } else if (job.status === 'FAILED') {
            setError(job.error || "⚠️ Job failed. Please check your GitHub token, Supabase configuration, or repository access.");
            setLoading(false);
            setJobId(null);
          }
        }
      )
      .subscribe((status, err) => {
        console.log('Subscription status:', status);
        if (status === 'SUBSCRIBED') {
          console.log(`Subscribed to channel ${channelName}`);
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          console.error('Subscription failed with error:', err);
        }
      });

    // Polling fallback with failure tracking
    let pollFailureCount = 0;
    const MAX_POLL_FAILURES = 5;

    const interval = setInterval(async () => {
      try {
        const response = await fetch("/api/graphql", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            query: `
              query ReadmeJob($jobId: String!) {
                readmeJob(jobId: $jobId) {
                  status
                  progress
                  content
                  error
                }
              }
            `,
            variables: { jobId },
          }),
        });

        if (!response.ok) {
          throw new Error(`HTTP error: ${response.statusText}`);
        }

        const data = await response.json();
        if (data.errors) {
          throw new Error(data.errors[0]?.message || "GraphQL error");
        }

        const job = data.data.readmeJob;

        setProgress(job.progress || 0);

        if (job.status === 'COMPLETED' && job.content) {
          const cleanedReply = job.content
        
          setReadme(cleanedReply);
          setLoading(false);
          setJobId(null);
          setError("");
          clearInterval(interval);
        } else if (job.status === 'FAILED') {
          setError(job.error || "⚠️ Job failed.");
          setLoading(false);
          setJobId(null);
          clearInterval(interval);
        }

        // Reset failure count on successful poll
        pollFailureCount = 0;
      } catch (err) {
        console.error("Polling error:", err);
        pollFailureCount++;

        if (pollFailureCount >= MAX_POLL_FAILURES) {
          console.warn(`Stopping polling for job ${jobId} after ${MAX_POLL_FAILURES} consecutive failures`);
          setError("⚠️ Failed to fetch job status after multiple attempts. Relying on real-time updates.");
          setLoading(false);
          clearInterval(interval);
        } else {
          setError("⚠️ Temporary failure fetching job status. Retrying...");
        }
      }
    }, 10000); // Poll every 10 seconds

    return () => {
      console.log(`Unsubscribing from channel ${channelName}`);
      supabase.removeChannel(subscription);
      clearInterval(interval);
    };
  }, [jobId, getSupabase]);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!repoUrl) {
      setError("⚠️ Please enter a valid GitHub URL.");
      return;
    }

    if (!repoUrl.match(/github\.com\/[^/]+\/[^/]+/)) {
      setError("⚠️ Invalid GitHub repository URL format. Use https://github.com/username/repo");
      return;
    }

    setLoading(true);
    setError("");
    setReadme("");
    setProgress(0);
    setJobId(null);

    try {
      const startJobResponse = await fetch("/api/graphql", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: `
            mutation StartReadmeJob($repoUrl: String!) {
              startReadmeJob(repoUrl: $repoUrl) {
                success
                jobId
                error
              }
            }
          `,
          variables: { repoUrl },
        }),
      });

      if (!startJobResponse.ok) {
        throw new Error(`❌ Failed to start README generation: ${startJobResponse.statusText}`);
      }

      const startJobData = await startJobResponse.json();

      if (startJobData.errors) {
        throw new Error(startJobData.errors[0]?.message || "GraphQL error");
      }

      if (!startJobData?.data?.startReadmeJob?.success) {
        throw new Error(startJobData?.data?.startReadmeJob?.error || "Unknown error");
      }

      const newJobId = startJobData.data.startReadmeJob.jobId;
      setJobId(newJobId);
    } catch (err) {
      console.error("Error starting job:", err);
      setError(err instanceof Error ? err.message : "⚠️ An error occurred.");
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!jobId) return;

    try {
      const cancelResponse = await fetch("/api/graphql", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: `
            mutation CancelReadmeJob($jobId: String!) {
              cancelReadmeJob(jobId: $jobId) {
                success
                error
              }
            }
          `,
          variables: { jobId },
        }),
      });

      if (!cancelResponse.ok) {
        throw new Error(`❌ Failed to cancel job: ${cancelResponse.statusText}`);
      }

      const cancelData = await cancelResponse.json();
      if (cancelData?.data?.cancelReadmeJob?.success) {
        setError("Job cancelled");
        setLoading(false);
        setJobId(null);
      } else {
        throw new Error(cancelData?.data?.cancelReadmeJob?.error || "Failed to cancel job");
      }
    } catch (err) {
      console.error("Error cancelling job:", err);
      setError(err instanceof Error ? err.message : "⚠️ Failed to cancel job.");
    }
  };

  const handleCopy = () => {
    navigator.clipboard
      .writeText(readme)
      .catch((err) => alert("❌ Failed to copy: " + err));
  };

  return {
    readme,
    loading,
    error,
    progress,
    handleGenerate,
    handleCancel,
    handleCopy,
  };
}