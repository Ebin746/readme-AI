// src/middleware.ts
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Define which routes are public:
const isPublicRoute = createRouteMatcher(["/", "/api/graphql"]);

export default clerkMiddleware(async (auth, req) => {
  const { userId, redirectToSignIn } = await auth();

  // if the route is NOT public and the user is not signed in, redirect
  if (!isPublicRoute(req) && !userId) {
    return redirectToSignIn();
  }

  // otherwise, do nothing (next())
});

export const config = {
  matcher: [
    // skip static files and _next internals:
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip)).*)",
    // always run for API/trpc:
    "/(api|trpc)(.*)",
  ],
};
