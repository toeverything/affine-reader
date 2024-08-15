import { getBlocksuiteReader } from "affine-reader";
import assert from "assert";

assert(process.env.NEXT_PUBLIC_WORKSPACE_ID, "WORKSPACE_ID is required");

export const reader = getBlocksuiteReader({
  workspaceId: process.env.NEXT_PUBLIC_WORKSPACE_ID,
  jwtToken: process.env.NEXT_PUBLIC_JWT_TOKEN,
  sessionToken: process.env.NEXT_PUBLIC_SESSION_TOKEN,
  target: process.env.NEXT_PUBLIC_TARGET_SERVER_URL,
});
