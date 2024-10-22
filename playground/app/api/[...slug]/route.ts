import { NextRequest } from "next/server";

const target =
  process.env.NEXT_PUBLIC_TARGET_SERVER_URL || "https://app.affine.pro";

export async function GET(
  _request: NextRequest,
  { params }: { params: { slug: string[] } }
) {
  const slug = params.slug;
  // proxy the request to the target server
  return fetch(`${target}/api/${slug.join("/")}`, {
    cache: "no-cache",
    headers: {
      Cookie: `affine_session=${process.env.SESSION_TOKEN}`,
    },
  });
}
