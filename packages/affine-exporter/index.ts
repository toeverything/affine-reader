#!/usr/bin/env node
import fsp from "node:fs/promises";
import assert from "assert";
import { getBlocksuiteReader } from "blocksuite-reader";

import yargs from "yargs";
import { hideBin } from "yargs/helpers";

async function main() {
  const argv = yargs(hideBin(process.argv))
    .scriptName("affine-exporter")
    .usage("Usage: $0 [workspace_id]")
    .parseSync();

  assert(
    argv._.length === 1,
    'Please provide a workspace_id (e.g., "H6vffRmJbCfA-r3kq_36_")'
  );

  const workspace_id = String(argv._[0]);

  const reader = getBlocksuiteReader({
    workspaceId: workspace_id,
  });

  const date = new Date();
  const dir =
    process.cwd() + `/affine-export/${workspace_id}/${date.toISOString()}`;

  await fsp.mkdir(dir, { recursive: true });

  const buffer = await reader.getWorkspaceDocRaw();
  await fsp.writeFile(`${dir}/yDoc.bin`, Buffer.from(buffer));

  const yDoc = await reader.getWorkspaceDoc(buffer);
  assert(yDoc, "Could not get yDoc");
  const pages = reader.docToPages(yDoc, true);

  // save each page as a markdown file in each of its own directory and save blobs
  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];
    console.log(
      `(${i + 1}/${pages.length}) Exporting title = ${
        page.title || "untitled"
      }, id = ${page.id} ...`
    );
    await fsp.mkdir(`${dir}/${page.id}`, { recursive: true });
    const md = page.md!;
    await fsp.writeFile(
      `${dir}/${page.id}/${page.title || "untitled"}.md`,
      md.replaceAll("(https://app.affine.pro/api/workspace/", "./"),
      {
        encoding: "utf8",
      }
    );

    // find all string that match url like https://app.affine.pro/api/workspace/${workspace_id}/blob/
    const blobs = Array.from(
      md.matchAll(
        new RegExp(
          "(https://app.affine.pro/api/workspace/[a-zA-Z0-9_-]+/blob/[a-zA-Z0-9_-]+=)",
          "g"
        )
      )
    );
    // save blobs
    for (let blob of blobs) {
      const url = blob[0];
      const blobId = url.split("/").pop();
      const buffer = await fetch(url).then((res) => res.arrayBuffer());
      await fsp.writeFile(
        `${dir}/${page.id}/${blobId}.png`,
        Buffer.from(buffer)
      );
    }
  }
  console.log(`🔔 Exported ${pages.length} pages to ${dir}`);
}

main();
