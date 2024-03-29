#!/usr/bin/env node
import fsp from "node:fs/promises";
import path from "node:path";
import assert from "assert";
import { getBlocksuiteReader } from "affine-reader";
import cliProgress from "cli-progress";

import yargs from "yargs";
import { hideBin } from "yargs/helpers";

const argv = yargs(hideBin(process.argv))
  .scriptName("affine-exporter")
  .usage("Usage: $0 -w <workspace_id> [-t <token>]")
  .demandOption(["workspace_id"])
  .option("token", {
    string: true,
    alias: "t",
    description: "refresh token",
  })
  .option("workspace_id", {
    description: "workspace id",
    alias: "w",
    string: true,
  })
  .option("output_dir", {
    description: "output directory",
    alias: "o",
    string: true,
  })
  .parseSync();

async function main() {
  const workspace_id = argv.workspace_id!;

  const reader = getBlocksuiteReader({
    workspaceId: workspace_id,
    refreshToken: argv.token,
  });

  const date = new Date();

  let dir: string = path.join(process.cwd(), "affine-export");

  if (argv.output_dir) {
    dir = argv.output_dir.startsWith("/")
      ? argv.output_dir
      : path.join(process.cwd(), argv.output_dir);
  }

  dir = path.join(dir, `${workspace_id}/${date.toISOString()}`);

  await fsp.mkdir(dir, { recursive: true });

  const buffer = await reader.getWorkspaceDocRaw();

  assert(buffer, "Could not get workspace doc raw");
  await fsp.writeFile(`${dir}/yDoc.bin`, Buffer.from(buffer));

  const yDoc = await reader.getWorkspaceDoc(buffer);
  assert(yDoc, "Could not get yDoc");
  const pages = reader.docToPages(yDoc, true);

  const bar = new cliProgress.SingleBar(
    {
      format:
        "{bar} exporting {id}:{title} ... | {percentage}% | ETA: {eta}s | {value}/{total}",
    },
    cliProgress.Presets.shades_classic
  );

  console.log("exporting pages as markdown and their blobs ...");
  bar.start(pages.length, 0);
  // save each page as a markdown file in each of its own directory and save blobs
  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];
    bar.update({
      id: page.id.substring(0, 8),
      title: page.title || "untitled",
    });
    // using page.id since page.title is not unique
    await fsp.mkdir(`${dir}/${page.id}`, { recursive: true });
    const md = page.md!;

    const blobPattern = new RegExp(
      `(https://app.affine.pro/api/workspace/[a-zA-Z0-9_-]+/blob/[a-zA-Z0-9_-]+=)`,
      "g"
    );

    await fsp.writeFile(
      `${dir}/${page.id}/${page.title || "no-title"}.md`,
      md.replaceAll(blobPattern, (match) => {
        const blobId = match.split("/").pop();
        return `./${blobId}.png`;
      }),
      {
        encoding: "utf8",
      }
    );

    // find all string that match url like https://app.affine.pro/api/workspace/${workspace_id}/blob/
    const blobs = Array.from(md.matchAll(blobPattern));
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
    bar.update(i + 1);
  }
  bar.stop();
  console.log(`🔔 Exported ${pages.length} pages to ${dir}`);
}

main();
