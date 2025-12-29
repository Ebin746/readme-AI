"use client";

import { useState, useEffect } from "react";
import { AppHeader } from "@/components/AppHeader";
import { ReadmeForm } from "@/components/ReadmeForm";
import { ReadmeOutput } from "@/components/ReadmeOutput";
import { ProgressDisplay } from "@/components/ProgressDisplay";
import { ErrorAlert } from "@/components/ErrorAlert";
import { useReadmeGeneration } from "@/hooks/useReadmeGeneration";
import { ApiUsageDisplay } from "@/components/ApiUsageDisplay";

export default function Home() {
  const [repoUrl, setRepoUrl] = useState("");
  const {
    readme,
    loading,
    error,
    progress,
    handleGenerate,
    handleCancel,
    handleCopy,
  } = useReadmeGeneration(repoUrl);

  const [localError, setLocalError] = useState("");
  
  useEffect(() => {
    let timeout: string | number | NodeJS.Timeout | undefined;
    if (loading) {
      timeout = setTimeout(() => {
        if (progress === 0) {
          handleCancel();
          setLocalError("⚠️ Job failed to start. Please check your GitHub token or network connection.");
        }
      }, 60000); // 60 seconds
    }
    return () => clearTimeout(timeout);
  }, [loading, progress, handleCancel]);

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-black via-purple-900 to-gray-900 p-4 sm:p-6">
      {/* Top bar with usage info */}
      <div className="w-full max-w-5xl mx-auto mb-6 flex justify-center items-center">
        <ApiUsageDisplay />
      </div>
      
      {/* Main content container */}
      <div className="flex-1 flex items-center justify-center">
        <div className="w-full max-w-3xl bg-white/10 backdrop-blur-md shadow-2xl rounded-2xl p-6 sm:p-8 border border-purple-400/50">
          <div className="flex justify-between items-center mb-6">
            <AppHeader />
          </div>
          
          <ReadmeForm
            repoUrl={repoUrl}
            setRepoUrl={setRepoUrl}
            onSubmit={handleGenerate}
            loading={loading}
            onCancel={handleCancel}
          />
          
          {(error || localError) && <ErrorAlert message={error || localError} />}
          
          {loading && <ProgressDisplay progress={progress} />}
          
          {readme && (
            <ReadmeOutput
              readme={readme}
              onCopy={handleCopy}
            />
          )}
        </div>
      </div>
    </div>
  );
}