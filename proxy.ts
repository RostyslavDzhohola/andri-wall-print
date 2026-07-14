import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import type { NextFetchEvent, NextRequest } from "next/server";
import { NextResponse } from "next/server";

const isAdminRoute = createRouteMatcher(["/admin(.*)"]);
const isAccountRoute = createRouteMatcher(["/account(.*)"]);
const isDashboardRoute = createRouteMatcher(["/dashboard(.*)"]);
const hasClerkKeys = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && process.env.CLERK_SECRET_KEY);

export function shouldUseClerkProxyForPath(pathname: string) {
  return pathname === "/admin" || pathname.startsWith("/admin/") || pathname === "/account" || pathname.startsWith("/account/") || pathname === "/dashboard" || pathname.startsWith("/dashboard/");
}

const clerkProxy = clerkMiddleware(async (auth, request) => {
  if (isAdminRoute(request) || isAccountRoute(request) || isDashboardRoute(request)) {
    await auth.protect();
  }
}, {
  signInUrl: "/sign-in",
  signUpUrl: "/sign-up"
});

export default function proxy(request: NextRequest, event: NextFetchEvent) {
  if (!hasClerkKeys || !shouldUseClerkProxyForPath(request.nextUrl.pathname)) {
    return NextResponse.next();
  }

  return clerkProxy(request, event);
}

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ico|ttf|woff2?|glb|usdz)).*)",
    "/(api|trpc)(.*)",
    "/__clerk/:path*"
  ]
};
