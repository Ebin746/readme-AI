"use client";
import { useState } from "react";
import Markdown from "react-markdown";

export default function Home() {
  const [repoUrl, setRepoUrl] = useState("");
  const [readme, setReadme] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!repoUrl) {
      setError("⚠️ Please enter a valid GitHub URL.");
      return;
    }

    setLoading(true);
    setError("");
    setReadme("");

    try {
      const cloneResponse = await fetch("/api/fetch-repo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repoUrl }),
      });

      if (!cloneResponse.ok) throw new Error("❌ Failed to clone repository");

      const readmeResponse = await fetch("/api/generate-readme", {
        method: "POST",
      });

      if (!readmeResponse.ok) throw new Error("❌ Failed to generate README");

      const data = await readmeResponse.json();
      const cleanedReply = data.reply.replace(/```markdown/g, "").replace(/```/g, "");
      setReadme(cleanedReply);
    } catch (err) {
      setError(err instanceof Error ? err.message : "⚠️ An error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard
      .writeText(readme)
      .then(() => alert("✅ README content copied!"))
      .catch((err) => alert("❌ Failed to copy: " + err));
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-black via-purple-900 to-gray-900 p-4 sm:p-6">
      <div className="w-full max-w-3xl bg-white/10 backdrop-blur-md shadow-2xl rounded-2xl p-6 sm:p-8 border border-purple-400/50">
        {/* Header */}
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white text-center animate-fade-in">
          🚀 GitHub <span className="text-purple-400">README Generator</span>
        </h1>
        <p className="text-gray-300 text-center mt-2 text-sm sm:text-base">Create professional README files instantly.</p>

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
          <button
            type="submit"
            disabled={loading}
            className="w-full px-5 sm:px-6 py-3 text-lg font-semibold bg-gradient-to-r from-purple-600 to-purple-800 text-white rounded-lg shadow-[0_4px_0px_#5a1ea1,0_6px_10px_rgba(0,0,0,0.5)] transition-all transform hover:translate-y-1 hover:shadow-[0_2px_0px_#5a1ea1,0_3px_8px_rgba(0,0,0,0.5)] active:shadow-[0_0px_0px_#5a1ea1,0_0px_5px_rgba(0,0,0,0.4)] active:translate-y-2 text-sm sm:text-base"
          >
            {loading ? "⚡ Processing..." : "✨ Generate README"}
          </button>
        </form>

        {/* Error Message */}
        {error && (
          <div className="mt-4 p-3 bg-red-600 text-white border border-red-400 rounded-md text-center animate-pulse text-sm sm:text-base">
            {error}
          </div>
        )}

        {/* README Output */}
        {readme && (
          <div className="mt-6 p-4 sm:p-6 bg-black/30 border border-purple-500 rounded-lg shadow-md">
            <div className="flex flex-col sm:flex-row justify-between items-center mb-4 space-y-2 sm:space-y-0">
              <h2 className="text-base sm:text-lg font-semibold text-white">📄 Generated README</h2>
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

        {/* Loading Indicator */}
        {loading && !readme && (
          <div className="text-center p-8">
            <div className="animate-spin rounded-full h-10 sm:h-12 w-10 sm:w-12 border-b-4 border-purple-400 mx-auto"></div>
            <p className="mt-4 text-gray-300 text-sm sm:text-base">Generating README...</p>
          </div>
        )}
      </div>
    </div>
  );
}
