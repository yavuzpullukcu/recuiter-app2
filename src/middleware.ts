import { NextRequest, NextResponse } from "next/server";

const PUBLIC_ROUTES = ["/login", "/register", "/api/auth/login", "/api/auth/register"];

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-key-change-in-production";

// Edge-compatible JWT verification using Web Crypto API
async function verifyJWT(token: string): Promise<{ userId: number; email: string } | null> {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    const [header, payload, signature] = parts;
    const data = `${header}.${payload}`;

    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(JWT_SECRET),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"]
    );

    // Decode base64url signature
    const sigBase64 = signature.replace(/-/g, "+").replace(/_/g, "/");
    const sigPadded = sigBase64 + "==".slice(0, (4 - (sigBase64.length % 4)) % 4);
    const sigBytes = Uint8Array.from(atob(sigPadded), (c) => c.charCodeAt(0));

    const valid = await crypto.subtle.verify("HMAC", key, sigBytes, encoder.encode(data));
    if (!valid) return null;

    // Decode payload
    const payloadBase64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const payloadPadded = payloadBase64 + "==".slice(0, (4 - (payloadBase64.length % 4)) % 4);
    const decoded = JSON.parse(atob(payloadPadded));

    // Check expiry
    if (decoded.exp && decoded.exp < Math.floor(Date.now() / 1000)) return null;

    return { userId: decoded.userId, email: decoded.email };
  } catch {
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public routes
  if (PUBLIC_ROUTES.some((route) => pathname === route || pathname.startsWith(route + "/"))) {
    return NextResponse.next();
  }

  // Allow static assets
  if (
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/favicon") ||
    pathname.endsWith(".svg") ||
    pathname.endsWith(".png") ||
    pathname.endsWith(".jpg") ||
    pathname.endsWith(".ico")
  ) {
    return NextResponse.next();
  }

  // Check for auth token
  const token = request.cookies.get("auth-token")?.value;

  if (!token) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Verify token using Edge-compatible Web Crypto
  const payload = await verifyJWT(token);
  if (!payload) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const response = NextResponse.redirect(new URL("/login", request.url));
    response.cookies.delete("auth-token");
    return response;
  }

  // Add userId to request headers for API routes
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-user-id", String(payload.userId));
  requestHeaders.set("x-user-email", payload.email);

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
