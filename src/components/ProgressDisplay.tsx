"use client";

interface ProgressDisplayProps {
  progress: number;
}

export function ProgressDisplay({ progress }: ProgressDisplayProps) {
  const getProgressMessage = () => {
    if (progress < 10) return "Starting job...";
    if (progress < 30) return "Fetching repository information...";
    if (progress < 50) return "Reading important files...";
    if (progress < 70) return "Analyzing code...";
    if (progress < 90) return "Generating README content...";
    return "Finalizing content...";
  };

  return (
    <div className="text-center p-8 mt-6">
      <div className="relative h-4 bg-gray-800 rounded-full w-full max-w-md mx-auto overflow-hidden">
        <div 
          className="absolute left-0 top-0 h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-300"
          style={{ width: `${progress}%` }}
        ></div>
      </div>
      <p className="mt-4 text-gray-300 text-sm sm:text-base flex items-center justify-center">
        <span className="inline-block mr-2">
          <svg className="animate-spin h-4 w-4 text-purple-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </span>
        {getProgressMessage()} ({Math.round(progress)}%)
      </p>
    </div>
  );
}
