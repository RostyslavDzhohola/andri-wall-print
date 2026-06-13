import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isAdminRoute = createRouteMatcher(["/admin(.*)"]);
const isAccountRoute = createRouteMatcher(["/account(.*)"]);
const isDashboardRoute = createRouteMatcher(["/dashboard(.*)"]);
const hasClerkKeys = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && process.env.CLERK_SECRET_KEY);

const clerkProxy = clerkMiddleware(async (auth, request) => {
  if (isAdminRoute(request) || isAccountRoute(request) || isDashboardRoute(request)) {
    await auth.protect();
  }
}, {
  signInUrl: "/sign-in",
  signUpUrl: "/sign-up"
});

export default hasClerkKeys ? clerkProxy : function proxy() {
  return NextResponse.next();
};

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ico|ttf|woff2?|glb|usdz)).*)",
    "/(api|trpc)(.*)",
    "/__clerk/:path*"
  ]
};
