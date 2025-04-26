"use client";
import { FormEvent } from "react";

interface ReadmeFormProps {
  repoUrl: string;
  setRepoUrl: (url: string) => void;
  onSubmit: (e: FormEvent) => Promise<void>;
  loading: boolean;
  onCancel: () => void;
}

export function ReadmeForm({ repoUrl, setRepoUrl, onSubmit, loading, onCancel }: ReadmeFormProps) {
  return (
    <form onSubmit={onSubmit} className="mt-6 space-y-4">
      <div className="relative group">
        <div className="absolute -inset-0.5 bg-gradient-to-r from-pink-500 to-purple-600 rounded-lg blur opacity-30 group-hover:opacity-80 transition duration-500"></div>
        <input
          type="url"
          value={repoUrl}
          onChange={(e) => setRepoUrl(e.target.value)}
          placeholder="🔗 Enter GitHub repository URL"
          className="relative w-full p-4 text-white bg-black/40 border border-purple-500/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 placeholder-gray-400 shadow-lg"
          required
        />
      </div>

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={loading}
          className="flex-1 px-4 py-3 text-base font-semibold bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg shadow-[0_4px_0px_rgba(90,30,161,0.8),0_6px_10px_rgba(0,0,0,0.5)] transition-all transform hover:translate-y-1 hover:shadow-[0_2px_0px_rgba(90,30,161,0.8),0_3px_8px_rgba(0,0,0,0.5)] active:shadow-[0_0px_0px_#5a1ea1,0_0px_5px_rgba(0,0,0,0.4)] active:translate-y-2 sm:text-lg disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {loading ? (
            <span className="flex items-center justify-center">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Processing...
            </span>
          ) : (
            <span className="flex items-center justify-center">
              <span className="mr-2">✨</span> Generate README
            </span>
          )}
        </button>
        
        {loading && (
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-3 text-base font-semibold bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-all shadow-lg sm:text-lg"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}