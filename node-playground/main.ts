import { getBlocksuiteReader } from 'blocksuite-reader';

const reader = getBlocksuiteReader({
  workspaceId: 'mWn__KSlOgS1tdDEjdX6P'
});

async function main() {
  const page = await reader.getWorkspacePage("de3e7b7910b146de95cc91aeec1a1216");
  console.log(page?.md);
}

main();
