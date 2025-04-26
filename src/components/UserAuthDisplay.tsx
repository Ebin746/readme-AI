"use client";
import { UserButton, SignInButton, useUser } from "@clerk/nextjs";

export function UserAuthDisplay() {
  const { isLoaded, isSignedIn } = useUser();

  if (!isLoaded) {
    return (
      <div className="h-8 w-8 rounded-full bg-gray-700 animate-pulse"></div>
    );
  }

  return (
    <div className="flex items-center">
      {isSignedIn ? (
        <div className="flex items-center gap-2">
          <span className="text-purple-300 text-sm hidden sm:inline">My Account</span>
          <UserButton 
            afterSignOutUrl="/"
            appearance={{
              elements: {
                userButtonAvatarBox: "w-8 h-8"
              }
            }}
          />
        </div>
      ) : (
        <SignInButton mode="modal">
          <button className="px-3 py-1.5 bg-gradient-to-r from-purple-600 to-pink-600 text-white text-sm rounded-lg hover:bg-purple-700 transition-colors shadow-md">
            Sign In
          </button>
        </SignInButton>
      )}
    </div>
  );
}