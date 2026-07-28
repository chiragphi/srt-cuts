import { NextResponse, type NextRequest } from "next/server";

/**
 * Coming-soon gate.
 *
 * While COMING_SOON is true, every public URL renders the /soon holding page.
 * The admin cockpit and the API stay reachable so the chair can still be run —
 * bookings already in the system can be accepted, denied, and messaged about.
 *
 * To bring the storefront back: set this to false and deploy.
 */
const COMING_SOON = true;

/** Paths that keep working while the storefront is dark. */
const OPEN_PREFIXES = ["/admin", "/api", "/soon"];

export function proxy(request: NextRequest) {
  if (!COMING_SOON) return NextResponse.next();

  const { pathname } = request.nextUrl;
  const open = OPEN_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  if (open) return NextResponse.next();

  const url = request.nextUrl.clone();
  url.pathname = "/soon";
  url.search = "";
  return NextResponse.rewrite(url);
}

export const config = {
  // Everything except Next internals and files with an extension
  // (favicon.ico, manifest.json, the domain-verification html, images).
  matcher: ["/((?!_next/static|_next/image|.*\\.[\\w]+$).*)"],
};
