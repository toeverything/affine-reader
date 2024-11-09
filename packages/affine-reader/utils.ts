import fm from "front-matter";

import * as Reader from "./index";
import { WorkspacePageContent } from "./index";

export function findNextBlock<T extends Reader.ParsedBlock>(
  blocks: Reader.ParsedBlock[],
  index: number,
  predicate: (block: Reader.ParsedBlock, index: number) => block is T
): [T | null, number];

export function findNextBlock(
  blocks: Reader.ParsedBlock[],
  index: number,
  predicate: (block: Reader.ParsedBlock, index: number) => boolean
): [Reader.ParsedBlock | null, number];

export function findNextBlock(
  blocks: Reader.ParsedBlock[],
  index: number,
  predicate: (block: Reader.ParsedBlock, index: number) => boolean
): [Reader.ParsedBlock | null, number] {
  for (let i = index; i < blocks.length; i++) {
    if (predicate(blocks[i], i)) {
      return [blocks[i], i];
    }
  }
  return [null, blocks.length];
}

export function skipEmptyBlocks(
  blocks: Reader.ParsedBlock[],
  index: number
): [Reader.ParsedBlock | null, number] {
  return findNextBlock(blocks, index, (block) => block.content.trim() !== "");
}

export function isDivider(block?: Reader.ParsedBlock): boolean {
  if (!block) {
    return false;
  }
  return (
    block.flavour === "affine:divider" ||
    (block.flavour === "affine:paragraph" &&
      block.content.trim().includes("---"))
  );
}

export function findNextDivider(
  blocks: Reader.ParsedBlock[],
  index: number
): [Reader.ParsedBlock | null, number] {
  return findNextBlock(blocks, index, isDivider);
}

export function parseGrayMatter(
  blocks: Reader.ParsedBlock[],
  index: number
): [
  null | Pick<
    WorkspacePageContent,
    | "title"
    | "authors"
    | "tags"
    | "description"
    | "created"
    | "updated"
    | "publish"
    | "slug"
  >,
  number
] {
  if (!isDivider(blocks.at(index))) {
    return [null, index];
  }

  const [_, nextDividerIndex] = findNextDivider(blocks, index + 1);

  if (nextDividerIndex === blocks.length) {
    return [null, index];
  }

  try {
    let gmContent = blocks
      .slice(index, nextDividerIndex + 1)
      .map((b) => Reader.parseBlockToMd(b, ""))
      .join("\n");

    // special case for linked pages
    // replace [](LinkedPage:xxx) to LinkedPage:xxx
    gmContent = gmContent.replaceAll(
      /\[\]\(LinkedPage:(.*?)\)/g,
      "LinkedPage:$1"
    );

    gmContent = gmContent.trim().replaceAll(/---\s*\n/gm, "---\n\n");

    const { attributes } = fm(gmContent) as any;

    return [
      {
        ...attributes,
        created: attributes.created
          ? new Date(attributes.created).getTime()
          : undefined,
        updated: attributes.updated
          ? new Date(attributes.updated).getTime()
          : undefined,
        tags: attributes.tags?.split(",").map((tag: string) => tag.trim()),
        authors: (attributes.authors || attributes.author)
          ?.split(",")
          .map((author: string) => author.trim()),
        // sanitize slug so that it only contains alphanumeric characters and -
        slug: attributes.slug?.replaceAll(/[^a-zA-Z0-9-]/g, ""),
      },
      nextDividerIndex + 1,
    ];
  } catch (e) {
    return [null, index];
  }
}

export function getDatabaseBlock(blocks: Reader.ParsedBlock[], title: string) {
  const normalizedTitle = (v: string) => v.replaceAll(" ", "").toLowerCase();

  return findNextBlock(
    blocks,
    0,
    (block): block is Reader.DatabaseBlock =>
      block.flavour === "affine:database" &&
      normalizedTitle((block as Reader.DatabaseBlock).title) ===
        normalizedTitle(title)
  )?.[0];
}
