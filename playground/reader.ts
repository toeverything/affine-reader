import { getBlocksuiteReader } from "affine-reader";
import assert from "assert";

assert(process.env.WORKSPACE_ID, "WORKSPACE_ID is required");

export const reader = getBlocksuiteReader({
  workspaceId: process.env.WORKSPACE_ID,
  sessionToken: process.env.SESSION_TOKEN,
  target: process.env.TARGET_SERVER_URL,
});
