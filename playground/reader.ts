import * as BlogReader from "affine-reader/blog";
import assert from "assert";

assert(process.env.NEXT_PUBLIC_BLOG_WORKSPACE_ID, "WORKSPACE_ID is required");

export const blogReader = BlogReader.instantiateReader({
  workspaceId: process.env.NEXT_PUBLIC_BLOG_WORKSPACE_ID,
  target:
    process.env.NODE_ENV === "development"
      ? "http://localhost:3000"
      : "https://affine-reader-playground.vercel.app",
});
