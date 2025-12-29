// File: components/ApiUsageDisplay.tsx
"use client";
import { useState, useEffect } from "react";

export function ApiUsageDisplay() {
  const [usage, setUsage] = useState<{
    remaining: number;
    limit: number;
    reset: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // Helper to calculate next reset time (24 hours from now)
  const getNextResetTime = () => {
    const resetDate = new Date();
    resetDate.setHours(resetDate.getHours() + 24);
    return resetDate.toISOString();
  };

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
        
        // Check if reset date is valid (not more than 48 hours in the future)
        const usageData = data.data.userApiUsage;
        const resetDate = new Date(usageData.reset);
        const now = new Date();
        const diffHours = (resetDate.getTime() - now.getTime()) / (1000 * 60 * 60);
        
        // If reset time is more than 48 hours away, fix it
        if (diffHours > 48) {
          console.warn("Invalid reset time detected:", usageData.reset);
          usageData.reset = getNextResetTime();
        }
        
        setUsage(usageData);
        setError(false);
      } catch (err) {
        console.error("Error fetching API usage:", err);
        setError(true);
        
        // Set default usage information as fallback
        setUsage({
          remaining: 5,
          limit: 5,
          reset: getNextResetTime(),
        });
      } finally {
        setLoading(false);
      }
    }
    
    fetchUsage();
  }, []);

  // Format the reset time for display
  const formatResetTime = (resetTimeString: string) => {
    try {
      const resetDate = new Date(resetTimeString);
      const now = new Date();
      
      // If reset date is very far in the future, use 24 hours from now instead
      if (resetDate.getFullYear() > now.getFullYear() + 1) {
        const correctedDate = new Date(now);
        correctedDate.setHours(correctedDate.getHours() + 24);
        return `in ${Math.round(24)} hours`;
      }
      
      // Calculate hours difference
      const diffMs = resetDate.getTime() - now.getTime();
      const diffHours = diffMs / (1000 * 60 * 60);
      
      if (diffHours < 1) {
        return `in ${Math.round(diffHours * 60)} minutes`;
      } else {
        return `in ${Math.round(diffHours)} hours`;
      }
    } catch {
      return "in 24 hours";
    }
  };

  if (loading) {
    return (
      <div className="text-center text-gray-300 text-sm py-2">
        <div className="inline-block h-4 w-24 bg-gray-700 rounded animate-pulse"></div>
      </div>
    );
  }

  if (!usage) {
    return null;
  }

  const { remaining, limit, reset } = usage;

  return (
    <div className="mt-3 text-center">
      <div className={`rounded-md p-2 ${error ? 'bg-orange-900/50' : remaining > 0 ? 'bg-purple-900/50' : 'bg-red-900/50'} text-white text-sm inline-flex items-center gap-2`}>
        <span className="flex h-2.5 w-2.5 relative">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-500"></span>
        </span>
        
        {error ? (
          <span>
            API usage information unavailable.
          </span>
        ) : (
          <span>
            <strong>{remaining}</strong> of <strong>{limit}</strong> daily README generations remaining
            <span className="text-gray-300 text-xs ml-1">(resets {formatResetTime(reset)})</span>
          </span>
        )}
      </div>
    </div>
  );
}