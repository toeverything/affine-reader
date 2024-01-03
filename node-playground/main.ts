import { getBlocksuiteReader } from "affine-reader";

const reader = getBlocksuiteReader({
  workspaceId: "055f9c4b-497a-43ec-a1c9-29d5baf184b9",
  sessionToken: "6637c7a0-e222-4b58-805e-375b2129d20a",
});

async function main() {
  const pages = await reader.getDocPageMetas("055f9c4b-497a-43ec-a1c9-29d5baf184b9");

  if (!pages) {
    return;
  }

  // get a single page
  const page = await reader.getDocMarkdown("Mbrqm3CwMwcdqKwb-6L0H");
}

main();
