import { getBlocksuiteReader } from "affine-reader";

const reader = getBlocksuiteReader({
  workspaceId: "qf73AF6vzWphbTJdN7KiX",
  target: "https://app.affine.pro",
});

async function main() {
  const pages = await reader.getDocPageMetas();

  if (!pages) {
    return;
  }

  pages.forEach((page) => {
    console.log(page.title, page.id);
  });

  // get a single page
  const page = await reader.getDocMarkdown("nJpuJDMx4a");
  console.log(page);
}

main();
