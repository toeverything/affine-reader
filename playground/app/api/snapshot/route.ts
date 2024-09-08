import { NextRequest } from "next/server";
import { reader } from "@/reader";

export async function GET(request: NextRequest) {
  const docId = request.nextUrl.searchParams.get("docId");
  if (!docId) {
    return new Response("docId is required", { status: 400 });
  }

  const snapshot = await reader.getDocSnapshot(docId);
  if (!snapshot) {
    return new Response("snapshot not found", { status: 404 });
  }
  // proxy the request to the target server
  return new Response(snapshot, {
    headers: {
      "Content-Type": "application/zip",
    },
  });
}
