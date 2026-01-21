import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Mobile user agent detection patterns
const MOBILE_UA_PATTERNS = [
  /Android/i,
  /webOS/i,
  /iPhone/i,
  /iPad/i,
  /iPod/i,
  /BlackBerry/i,
  /Windows Phone/i,
  /Opera Mini/i,
  /IEMobile/i,
  /Mobile/i,
];

function isMobileDevice(userAgent: string): boolean {
  return MOBILE_UA_PATTERNS.some((pattern) => pattern.test(userAgent));
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const userAgent = request.headers.get("user-agent") || "";

  // Check if user prefers desktop view (via cookie)
  const prefersDesktop = request.cookies.get("prefer-desktop")?.value === "true";

  // Only redirect for dashboard routes, not for /staff, /login, /register, /api, etc.
  const isDashboardRoute = pathname.startsWith("/dashboard");

  // If on mobile, accessing dashboard, and hasn't opted for desktop view
  if (isMobileDevice(userAgent) && isDashboardRoute && !prefersDesktop) {
    const url = request.nextUrl.clone();
    url.pathname = "/staff";
    return NextResponse.redirect(url);
  }

  // If on desktop accessing /staff, redirect to dashboard
  // (but allow if they specifically want mobile view)
  const prefersMobile = request.cookies.get("prefer-mobile")?.value === "true";
  if (!isMobileDevice(userAgent) && pathname === "/staff" && !prefersMobile) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/staff"],
};
