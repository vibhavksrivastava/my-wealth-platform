import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Multi-Tenant Subdomain Middleware for Next.js (App Router)
 * 
 * Intercepts incoming requests, extracts the tenant subdomain from either:
 *  1. Host header (e.g., `zenith9186.localhost:3000` or `zenith9186.yourdomain.com`)
 *  2. Query parameter fallback (e.g., `?tenant=zenith9186` or `?subdomain=zenith9186`)
 * 
 * Injects `x-tenant-subdomain` and `x-tenant-host` into the request headers for Server Components.
 */

// Subdomains reserved for root platform infrastructure
const RESERVED_SUBDOMAINS = new Set([
  "www",
  "app",
  "api",
  "admin",
  "assets",
  "static",
  "mail",
  "dashboard",
  "portal",
  "staging",
  "dev",
]);

export function middleware(req: NextRequest) {
  const url = req.nextUrl;
  const host = req.headers.get("host") || "";
  
  // Strip port from hostname (e.g. 'zenith9186.localhost:3000' -> 'zenith9186.localhost')
  const hostname = host.split(":")[0].toLowerCase();

  let subdomain: string | null = null;

  // 1. Check for query parameter override (ideal for local testing: ?tenant=zenith9186)
  const queryTenant = url.searchParams.get("tenant") || url.searchParams.get("subdomain");
  if (queryTenant && queryTenant.trim()) {
    subdomain = queryTenant.toLowerCase().trim();
  } else if (hostname.endsWith(".localhost")) {
    // 2. Local development testing (e.g. 'zenith9186.localhost')
    const candidate = hostname.replace(/\.localhost$/, "").trim();
    if (candidate && candidate !== "localhost" && !RESERVED_SUBDOMAINS.has(candidate)) {
      subdomain = candidate;
    }
  } else if (hostname === "localhost" || hostname === "127.0.0.1") {
    // Root local environment
    subdomain = null;
  } else {
    // 3. Production / Staging domain parsing (e.g. 'zenith9186.unifiedwealth.com' or custom domains)
    const parts = hostname.split(".");
    if (parts.length >= 3) {
      const candidate = parts[0];
      if (!RESERVED_SUBDOMAINS.has(candidate)) {
        subdomain = candidate;
      }
    }
  }

  // Clone request headers and inject resolved tenant information
  const requestHeaders = new Headers(req.headers);
  if (subdomain) {
    requestHeaders.set("x-tenant-subdomain", subdomain);
  } else {
    requestHeaders.delete("x-tenant-subdomain");
  }
  requestHeaders.set("x-tenant-host", host);

  // Forward the enriched request headers
  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  // Also expose tenant information in response header and cookie for client hydration
  if (subdomain) {
    response.headers.set("x-tenant-subdomain", subdomain);
    response.cookies.set("tenant_subdomain", subdomain, { path: "/", httpOnly: false });
  } else {
    response.cookies.delete("tenant_subdomain");
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - images, fonts, and static media files
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff|woff2)$).*)",
  ],
};

