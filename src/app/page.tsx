"use client";
import { useState, useEffect } from "react";
import Markdown from "react-markdown";

export default function Home() {
  const [repoUrl, setRepoUrl] = useState("");
  const [readme, setReadme] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [progress, setProgress] = useState(0);
  const [jobId, setJobId] = useState<string | null>(null);

  // Use debounce for smoother UI updates
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    
    if (loading && jobId) {
      interval = setInterval(async () => {
        await checkJobStatus(jobId);
      }, 1500); // Check less frequently (1.5 seconds)
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [loading, jobId]);

  const checkJobStatus = async (currentJobId: string) => {
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

      if (!statusResponse.ok) throw new Error("❌ Failed to check job status");

      const statusData = await statusResponse.json();
      const job = statusData.data.readmeJob;

      setProgress(job.progress);

      if (job.status === "FAILED") {
        setError(job.error || "⚠️ Job failed.");
        setLoading(false);
        setJobId(null);
        return;
      }
      
      if (job.status === "COMPLETED" && job.content) {
        const cleanedReply = job.content
          .replace(/```markdown/g, "")
          .replace(/```/g, "");
        setReadme(cleanedReply);
        setLoading(false);
        setJobId(null);
        return;
      }
    } catch (err) {
      console.error("Error checking job status:", err);
    }
  };

  const handleGenerate = async (e: { preventDefault: () => void; }) => {
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
      
      // Initial job status check
      await checkJobStatus(newJobId);
    } catch (err) {
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

  const getProgressMessage = () => {
    if (progress < 10) return "Starting job...";
    if (progress < 30) return "Fetching repository information...";
    if (progress < 50) return "Reading important files...";
    if (progress < 70) return "Analyzing code...";
    if (progress < 90) return "Generating README content...";
    return "Finalizing content...";
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-black via-purple-900 to-gray-900 p-4 sm:p-6">
      <div className="w-full max-w-3xl bg-white/10 backdrop-blur-md shadow-2xl rounded-2xl p-6 sm:p-8 border border-purple-400/50">
        {/* Header */}
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white text-center animate-fade-in">
          🚀 GitHub <span className="text-purple-400">README Generator</span>
        </h1>
        <p className="text-gray-300 text-center mt-2 text-sm sm:text-base">
          Create professional README files instantly.
        </p>

        {/* Form Section */}
        <form onSubmit={handleGenerate} className="mt-6 space-y-4">
          <div className="relative">
            <input
              type="url"
              value={repoUrl}
              onChange={(e) => setRepoUrl(e.target.value)}
              placeholder="🔗 Enter GitHub repository URL"
              className="w-full p-3 sm:p-4 text-white bg-black/30 border border-purple-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 placeholder-gray-400 shadow-lg"
              required
            />
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 text-base font-semibold bg-gradient-to-r from-purple-600 to-purple-800 text-white rounded-lg shadow-[0_4px_0px_#5a1ea1,0_6px_10px_rgba(0,0,0,0.5)] transition-all transform hover:translate-y-1 hover:shadow-[0_2px_0px_#5a1ea1,0_3px_8px_rgba(0,0,0,0.5)] active:shadow-[0_0px_0px_#5a1ea1,0_0px_5px_rgba(0,0,0,0.4)] active:translate-y-2 sm:px-6 sm:py-3 sm:text-lg disabled:opacity-70"
            >
              {loading ? "⚡ Processing..." : "✨ Generate README"}
            </button>
            
            {loading && (
              <button
                type="button"
                onClick={handleCancel}
                className="px-4 py-2 text-base font-semibold bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-all shadow-lg sm:px-6 sm:py-3 sm:text-lg"
              >
                Cancel
              </button>
            )}
          </div>
        </form>

        {/* Error Message */}
        {error && (
          <div className="mt-4 p-3 bg-red-600 text-white border border-red-400 rounded-md text-center animate-pulse text-sm sm:text-base">
            {error}
          </div>
        )}

        {/* Loading Indicator with Progress */}
        {loading && (
          <div className="text-center p-8">
            <div className="relative h-4 bg-gray-700 rounded-full w-full max-w-md mx-auto overflow-hidden">
              <div 
                className="absolute left-0 top-0 h-full bg-purple-500 transition-all duration-300"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            <p className="mt-4 text-gray-300 text-sm sm:text-base">
              {getProgressMessage()} ({Math.round(progress)}%)
            </p>
          </div>
        )}

        {/* README Output */}
        {readme && (
          <div className="mt-6 p-4 sm:p-6 bg-black/30 border border-purple-500 rounded-lg shadow-md">
            <div className="flex flex-col sm:flex-row justify-between items-center mb-4 space-y-2 sm:space-y-0">
              <h2 className="text-base sm:text-lg font-semibold text-white">
                📄 Generated README
              </h2>
              <button
                onClick={handleCopy}
                className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-all shadow-lg hover:scale-105 active:scale-95 text-sm sm:text-base"
              >
                📋 Copy README
              </button>
            </div>
            <div className="prose prose-invert max-w-none text-white w-full min-w-0 overflow-x-auto bg-black/50 p-4 rounded-md border border-gray-600 shadow-lg text-sm sm:text-base">
              <Markdown>{readme}</Markdown>
            </div>
          </div>
        )}
      </div>
    </div>)}