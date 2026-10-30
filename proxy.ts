// Only the dashboard itself may call the API: a website open in another tab can't make Jarvis talk,
// spend Drama 3 credits or reset the data behind your back.
import { NextResponse, type NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  if (request.method === "GET" || request.method === "HEAD") return NextResponse.next();
  // Browsers always send Origin on a cross-site POST; tools like curl on your own machine send none.
  const origin = request.headers.get("origin");
  if (!origin) return NextResponse.next();
  let sameOrigin = false;
  try {
    sameOrigin = new URL(origin).host === request.headers.get("host");
  } catch {}
  if (!sameOrigin) return NextResponse.json({ error: "Requests must come from the Jarvis dashboard." }, { status: 403 });
  return NextResponse.next();
}

export const config = { matcher: "/api/:path*" };
