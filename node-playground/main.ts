import { getBlocksuiteReader } from 'affine-reader';

const reader = getBlocksuiteReader({
  workspaceId: 'H6vffRmJbCfA-r3kq_36_'
});

async function main() {
  const page = await reader.getDocMarkdown('H6vffRmJbCfA-r3kq_36_:space:nJpuJDMx4a')
  console.log(page?.md);
}

main();
