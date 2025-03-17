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
      setError("Please enter a GitHub URL");
      return;
    }

    setLoading(true);
    setError("");
    setReadme("");

    try {
      // First clone the repository
      const cloneResponse = await fetch("/api/fetch-repo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repoUrl }),
      });

      if (!cloneResponse.ok) throw new Error("Failed to clone repository");

      // Then generate the README
      const readmeResponse = await fetch("/api/generate-readme", {
        method: "POST",
      });

      if (!readmeResponse.ok) throw new Error("Failed to generate README");

      const data = await readmeResponse.json();
      const cleanedReply = data.reply.replace(/```markdown/g, "").replace(/```/g, "");
      setReadme(cleanedReply);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard
      .writeText(readme)
      .then(() => alert("README content copied to clipboard!"))
      .catch((err) => alert("Failed to copy content: " + err));
  };

  return (
    <div className="min-h-screen bg-gray-100 py-12 px-6 flex items-center justify-center">
      <div className="max-w-3xl w-full bg-white shadow-xl rounded-lg p-8">
        {/* Title Section */}
        <h1 className="text-3xl font-bold text-gray-900 text-center">
          🚀 GitHub README Generator
        </h1>
        <p className="text-gray-600 text-center mt-2">
          Generate a professional README for your GitHub repository instantly.
        </p>

        {/* Form Section */}
        <form onSubmit={handleGenerate} className="mt-6 space-y-4">
          <div className="relative">
            <input
              type="url"
              value={repoUrl}
              onChange={(e) => setRepoUrl(e.target.value)}
              placeholder="Enter GitHub repository URL"
              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-all disabled:bg-gray-400"
          >
            {loading ? "Processing..." : "Generate README"}
          </button>
        </form>

        {/* Error Message */}
        {error && (
          <div className="mt-4 p-3 bg-red-100 text-red-700 border border-red-400 rounded-md text-center">
            {error}
          </div>
        )}

        {/* README Output */}
        {readme && (
          <div className="mt-6 p-6 bg-gray-50 border border-gray-200 rounded-lg shadow-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-800">📄 Generated README</h2>
              <button
                onClick={handleCopy}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                Copy README
              </button>
            </div>
            <div className="prose max-w-none text-black w-full min-w-0 overflow-x-auto bg-white p-4 rounded-md border border-gray-300">
              <Markdown>{readme}</Markdown>
            </div>
          </div>
        )}

        {/* Loading Indicator */}
        {loading && !readme && (
          <div className="text-center p-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Generating README...</p>
          </div>
        )}
      </div>
    </div>
  );
}
