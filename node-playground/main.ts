import { getBlocksuiteReader } from "affine-reader";

const reader = getBlocksuiteReader({
  workspaceId: "H6vffRmJbCfA-r3kq_36_",
});

async function main() {
  const pages = await reader.getDocPageMetas("H6vffRmJbCfA-r3kq_36_");
  console.log(pages);

  if (!pages) {
    return;
  }

  // get a single page
  const page = await reader.getDocMarkdown("xgfpVKe1rr");

  const failedList = [];

  for (const page of pages) {
    try {
      const pageContent = await reader.getDocMarkdown(page.id);
    } catch (err) {
      console.log(page.id, err);
      failedList.push(page.id);
    }
  }

}

main();
