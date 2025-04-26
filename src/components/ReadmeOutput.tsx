"use client";
import { useState } from "react";
import Markdown from "react-markdown";

interface ReadmeOutputProps {
  readme: string;
  onCopy: () => void;
}

export function ReadmeOutput({ readme, onCopy }: ReadmeOutputProps) {
  const [copied, setCopied] = useState(false);
  
  const handleCopy = () => {
    onCopy();
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="mt-8 p-4 sm:p-6 bg-black/30 border border-purple-500/50 rounded-lg shadow-md">
      <div className="flex flex-col sm:flex-row justify-between items-center mb-4 space-y-2 sm:space-y-0">
        <h2 className="text-base sm:text-lg font-semibold text-white flex items-center">
          <span className="mr-2">📄</span> Generated README
        </h2>
        <button
          onClick={handleCopy}
          className={`px-4 py-2 ${copied ? 'bg-green-600' : 'bg-purple-600 hover:bg-purple-700'} text-white rounded-lg transition-all shadow-lg transform hover:scale-105 active:scale-95 text-sm sm:text-base flex items-center`}
        >
          {copied ? (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Copied!
            </>
          ) : (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
              </svg>
              Copy README
            </>
          )}
        </button>
      </div>
      <div className="prose prose-invert max-w-none text-white w-full min-w-0 overflow-x-auto bg-black/50 p-4 rounded-md border border-gray-600/50 shadow-lg text-sm sm:text-base">
        <Markdown>{readme}</Markdown>
      </div>
    </div>
  );
}