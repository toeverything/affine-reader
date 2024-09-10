import { getBlocksuiteReader } from "affine-reader";

const reader = getBlocksuiteReader({
  workspaceId: "qf73AF6vzWphbTJdN7KiX",
  target: "https://app.affine.pro",
  retry: 3,
});

async function main() {
  const pages = await reader.getDocPageMetas();

  if (!pages) {
    return;
  }

  await reader.getDocSnapshot("s_9N3Eoq9_NWmjCS875by");

  // pages.forEach((page) => {
  //   console.log(page.title, page.id);
  //   reader.getDocMarkdown(page.id);
  // });

  // // get a single page
  // for (let i = 0; i < 100; i++) {
  //   const page = await reader.getDocMarkdown("nJpuJDMx4a");
  //   console.log(page);
  // }
}

main();
