import * as templateReader from "affine-reader/template-v2";

import assert from "assert";

assert(process.env.NEXT_PUBLIC_BLOG_WORKSPACE_ID, "WORKSPACE_ID is required");

export const reader = templateReader.instantiateReader({
  workspaceId: process.env.NEXT_PUBLIC_BLOG_WORKSPACE_ID,
  target:
    process.env.NODE_ENV === "development"
      ? "http://localhost:3000"
      : "https://affine-reader.vercel.app",
});
