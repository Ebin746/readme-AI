"use client";
import { UserAuthDisplay } from "./UserAuthDisplay";
import { ApiUsageDisplay } from "./ApiUsageDisplay";

export function AppHeader() {
  return (
    <div className="space-y-4 mb-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white">
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-400">
            README Generator
          </span>
          <span className="ml-2 animate-bounce inline-block">🚀</span>
        </h1>
        
        <UserAuthDisplay />
      </div>
      
      <p className="text-gray-300 text-center text-sm sm:text-base">
        Create professional README files instantly with AI assistance
      </p>
      
      <ApiUsageDisplay />
    </div>
  );
}
