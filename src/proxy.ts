import { NextResponse, type NextRequest } from "next/server";

/** The site is just the coming-soon page: every URL renders it. */
export function proxy(request: NextRequest) {
  if (request.nextUrl.pathname === "/") return NextResponse.next();
  const url = request.nextUrl.clone();
  url.pathname = "/";
  url.search = "";
  return NextResponse.rewrite(url);
}

export const config = {
  // Everything except Next internals and files with an extension
  // (favicon.ico, manifest.json, the domain-verification html, images).
  matcher: ["/((?!_next/static|_next/image|.*\.[\w]+$).*)"],
};
