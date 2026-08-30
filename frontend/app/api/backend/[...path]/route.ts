import { NextRequest } from "next/server";

const BACKEND_BASE = (process.env.BACKEND_BASE_URL ?? "http://localhost:8000").trim().replace(/\/+$/, "");
const ADMIN_TOKEN = process.env.ADMIN_TOKEN ?? "sih2026-demo-admin-token";

async function proxy(req: NextRequest, method: string): Promise<Response> {
  const path = req.nextUrl.pathname.replace(/^\/api\/backend\//, "");
  const query = req.nextUrl.search;
  const target = `${BACKEND_BASE}/api/v1/${path}${query}`;
  const headers: Record<string, string> = { "content-type": "application/json" };
  headers["x-admin-token"] = ADMIN_TOKEN;

  let body: string | undefined;
  if (req.method !== "GET" && req.body) {
    body = await req.text();
  }

  try {
    const res = await fetch(target, { method, headers, body });
    const text = await res.text();
    return new Response(text, {
      status: res.status,
      headers: { "content-type": res.headers.get("content-type") ?? "application/json" },
    });
  } catch (err) {
    return Response.json(
      { error: `backend unreachable: ${String(err)}` },
      { status: 502 },
    );
  }
}

export async function GET(req: NextRequest) {
  return proxy(req, "GET");
}

export async function POST(req: NextRequest) {
  return proxy(req, "POST");
}

export async function PATCH(req: NextRequest) {
  return proxy(req, "PATCH");
}

export async function DELETE(req: NextRequest) {
  return proxy(req, "DELETE");
}