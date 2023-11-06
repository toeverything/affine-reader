import { getBlocksuiteReader } from 'affine-reader';

const reader = getBlocksuiteReader({
  workspaceId: 'H6vffRmJbCfA-r3kq_36_'
});

async function main() {
  const pages = await reader.getDocPageMetas('H6vffRmJbCfA-r3kq_36_');
  console.log(pages);

  // get a single page
  const page = await reader.getDocMarkdown('H6vffRmJbCfA-r3kq_36_:space:nJpuJDMx4a')
  console.log(page?.md);
}

main();
