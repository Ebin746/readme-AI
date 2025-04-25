"use client";
import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";

export function ApiUsageDisplay() {
  const { isLoaded, isSignedIn } = useUser();
  const [usage, setUsage] = useState<{
    remaining: number;
    limit: number;
    reset: string;
    isAuthenticated: boolean;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    async function fetchUsage() {
      try {
        // Add a timeout to prevent hanging requests
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        
        const response = await fetch("/api/graphql", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            query: `
              query GetApiUsage {
                userApiUsage {
                  remaining
                  limit
                  reset
                  isAuthenticated
                }
              }
            `,
          }),
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);

        if (!response.ok) throw new Error("Failed to fetch API usage");

        const data = await response.json();
        
        // Check if the response contains errors
        if (data.errors) {
          throw new Error(data.errors[0]?.message || "GraphQL error");
        }
        
        setUsage(data.data.userApiUsage);
        setError(false);
      } catch (err) {
        console.error("Error fetching API usage:", err);
        setError(true);
        
        // Set default usage information as fallback
        setUsage({
          remaining: isSignedIn ? 5 : 2,
          limit: isSignedIn ? 5 : 2,
          reset: new Date(Date.now() + 86400000).toISOString(),
          isAuthenticated: isSignedIn ?? false
        });
      } finally {
        setLoading(false);
      }
    }

    if (isLoaded) {
      fetchUsage();
    }
  }, [isLoaded, isSignedIn]);

  if (loading) {
    return (
      <div className="text-center text-gray-300 text-sm py-2">
        Loading API usage...
      </div>
    );
  }

  if (!usage) {
    return null;
  }

  const { remaining, limit, isAuthenticated } = usage;

  return (
    <div className="mt-3 text-center">
      <div className={`rounded-md p-2 ${error ? 'bg-orange-900/50' : remaining > 0 ? 'bg-purple-900/50' : 'bg-red-900/50'} text-white text-sm inline-flex items-center gap-2`}>
        {isAuthenticated ? (
          <span className="text-green-400">●</span>
        ) : (
          <span className="text-yellow-400">●</span>
        )}
        
        {error ? (
          <span>
            API usage information unavailable. {isAuthenticated ? "" : "Sign in for more generations."}
          </span>
        ) : isAuthenticated ? (
          <span>
            <strong>{remaining}</strong> of <strong>{limit}</strong> daily README generations remaining
          </span>
        ) : (
          <span>
            <strong>{remaining}</strong> of <strong>{limit}</strong> daily README generations remaining
            Sign In for More
          </span>
        )}
      </div>
    </div>
  );
}