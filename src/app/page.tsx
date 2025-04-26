"use client";
import { useState } from "react";
import { AppHeader } from "@/components/AppHeader";
import { ReadmeForm } from "@/components/ReadmeForm";
import { ReadmeOutput } from "@/components/ReadmeOutput";
import { ProgressDisplay } from "@/components/ProgressDisplay";
import { ErrorAlert } from "@/components/ErrorAlert";
import { useReadmeGeneration } from "@/hooks/useReadmeGeneration";

export default function Home() {
  const [repoUrl, setRepoUrl] = useState("");
  const { 
    readme, 
    loading, 
    error, 
    progress, 
    handleGenerate, 
    handleCancel, 
    handleCopy 
  } = useReadmeGeneration(repoUrl);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-black via-purple-900 to-gray-900 p-4 sm:p-6">
      <div className="w-full max-w-3xl bg-white/10 backdrop-blur-md shadow-2xl rounded-2xl p-6 sm:p-8 border border-purple-400/50">
        <AppHeader />
        
        <ReadmeForm
          repoUrl={repoUrl}
          setRepoUrl={setRepoUrl}
          onSubmit={handleGenerate}
          loading={loading}
          onCancel={handleCancel}
        />

        {error && <ErrorAlert message={error} />}

        {loading && <ProgressDisplay progress={progress} />}

        {readme && (
          <ReadmeOutput 
            readme={readme}
            onCopy={handleCopy}
          />
        )}
      </div>
    </div>
  );
}
