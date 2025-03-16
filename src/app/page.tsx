"use client";
import { useState } from 'react';
import Markdown from 'react-markdown';

export default function Home() {
  const [repoUrl, setRepoUrl] = useState('');
  const [readme, setReadme] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!repoUrl) {
      setError('Please enter a GitHub URL');
      return;
    }

    setLoading(true);
    setError('');
    setReadme('');

    try {
      // First clone the repository
      const cloneResponse = await fetch('/api/fetch-repo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repoUrl }),
      });

      if (!cloneResponse.ok) throw new Error('Failed to clone repository');

      // Then generate the README
      const readmeResponse = await fetch('/api/generate-readme', { 
        method: 'POST' 
      });

      if (!readmeResponse.ok) throw new Error('Failed to generate README');

      const data = await readmeResponse.json();
      setReadme(data.reply);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8 text-center">
          GitHub README Generator
        </h1>

        <form onSubmit={handleGenerate} className="mb-8">
          <div className="flex gap-4">
            <input
              type="url"
              value={repoUrl}
              onChange={(e) => setRepoUrl(e.target.value)}
              placeholder="Enter GitHub repository URL"
              className="flex-1 p-3 border text-black border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
            >
              {loading ? 'Processing...' : 'Generate README'}
            </button>
          </div>
        </form>

        {error && (
          <div className="p-4 mb-4 bg-red-50 text-red-700 rounded-lg">
            {error}
          </div>
        )}

        {readme && (
          <div className="bg-white rounded-lg shadow-md p-6 w-full">
            <div className="prose max-w-none text-black w-full min-w-0 overflow-x-auto">
              <Markdown>{readme}</Markdown>
            </div>
          </div>
        )}

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