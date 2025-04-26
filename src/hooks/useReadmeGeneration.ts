"use client";
import { useState, useEffect, useRef, useCallback } from "react";

export function useReadmeGeneration(repoUrl: string) {
  const [readme, setReadme] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [progress, setProgress] = useState(0);
  const [jobId, setJobId] = useState<string | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup function to clear interval
  const clearStatusInterval = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  // Function to check job status
  const checkJobStatus = useCallback(
    async (currentJobId: string) => {
      if (!currentJobId) return;

      try {
        const statusResponse = await fetch("/api/graphql", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            query: `
              query GetReadmeJobStatus($jobId: String!) {
                readmeJob(jobId: $jobId) {
                  jobId
                  status
                  content
                  error
                  progress
                }
              }
            `,
            variables: { jobId: currentJobId },
          }),
        });

        if (!statusResponse.ok) {
          console.error("Status response not OK", statusResponse.status);
          return;
        }

        const statusData = await statusResponse.json();
        const job = statusData?.data?.readmeJob;

        if (!job) {
          console.error("Invalid response format:", statusData);
          return;
        }

        setProgress(job.progress || 0);

        if (job.status === "FAILED") {
          setError(job.error || "⚠️ Job failed.");
          setLoading(false);
          setJobId(null);
          clearStatusInterval();
          return;
        }

        if (job.status === "COMPLETED" && job.content) {
          const cleanedReply = job.content
            .replace(/```markdown/g, "")
            .replace(/```/g, "");
          setReadme(cleanedReply);
          setLoading(false);
          setJobId(null);
          clearStatusInterval();
        }
      } catch (err) {
        console.error("Error checking job status:", err);
      }
    },
    [clearStatusInterval]
  );

  // Set up polling when job starts and clean up when done
  useEffect(() => {
    clearStatusInterval();

    if (loading && jobId) {
      checkJobStatus(jobId);

      intervalRef.current = setInterval(() => {
        checkJobStatus(jobId);
      }, 1000);
    }

    return clearStatusInterval;
  }, [loading, jobId, clearStatusInterval, checkJobStatus]);

  // Keep track of when the job started
  const startTimeRef = useRef(Date.now());

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!repoUrl) {
      setError("⚠️ Please enter a valid GitHub URL.");
      return;
    }

    // Validate URL format
    if (!repoUrl.match(/github\.com\/[^/]+\/[^/]+/)) {
      setError("⚠️ Invalid GitHub repository URL format. Use https://github.com/username/repo");
      return;
    }

    setLoading(true);
    setError("");
    setReadme("");
    setProgress(0);
    setJobId(null);
    startTimeRef.current = Date.now(); // Reset start time

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

      if (!startJobResponse.ok) throw new Error("❌ Failed to start README generation");

      const startJobData = await startJobResponse.json();

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

      if (!cancelResponse.ok) throw new Error("❌ Failed to cancel job");

      const cancelData = await cancelResponse.json();
      if (cancelData?.data?.cancelReadmeJob?.success) {
        setError("Job cancelled");
        setLoading(false);
        setJobId(null);
        clearStatusInterval();
      }
    } catch (err) {
      console.error("Error cancelling job:", err);
    }
  };

  const handleCopy = () => {
    navigator.clipboard
      .writeText(readme)
      .then(() => alert("✅ README content copied!"))
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