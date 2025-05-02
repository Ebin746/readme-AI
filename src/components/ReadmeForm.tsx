import { Dispatch, SetStateAction } from "react";

interface ReadmeFormProps {
  repoUrl: string;
  setRepoUrl: Dispatch<SetStateAction<string>>;
  onSubmit: (e: React.FormEvent) => Promise<void>;
  loading: boolean;
  onCancel: () => Promise<void>;
}

export function ReadmeForm({ repoUrl, setRepoUrl, onSubmit, loading, onCancel }: ReadmeFormProps) {
  return (
    <form onSubmit={onSubmit} className="mb-6">
      <div className="flex flex-col md:flex-row gap-3">
        <input
          type="text"
          value={repoUrl}
          onChange={(e) => setRepoUrl(e.target.value)}
          placeholder="https://github.com/username/repository"
          className="flex-grow bg-white/10 border border-purple-400/30 rounded-lg px-4 py-3 
                     text-white placeholder-purple-200/50 focus:outline-none focus:ring-2 
                     focus:ring-purple-400 focus:border-transparent"
          disabled={loading}
        />
        {loading ? (
          <button
            type="button"
            onClick={onCancel}
            className="bg-red-500 hover:bg-red-600 text-white font-medium py-3 px-6 rounded-lg 
                       transition-colors duration-200 flex-shrink-0"
          >
            Cancel
          </button>
        ) : (
          <button
            type="submit"
            className="bg-purple-600 hover:bg-purple-700 text-white font-medium py-3 px-6 rounded-lg 
                       transition-colors duration-200 flex-shrink-0"
          >
            Generate README
          </button>
        )}
      </div>
    </form>
  );
}