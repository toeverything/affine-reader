import grayMatter from "gray-matter";

import * as Reader from "./index";
import { WorkspacePageContent } from "./index";

export function findNextBlock<T extends Reader.ParsedBlock>(
  blocks: Reader.ParsedBlock[],
  index: number,
  predicate: (block: Reader.ParsedBlock) => block is T
): [T | null, number];

export function findNextBlock(
  blocks: Reader.ParsedBlock[],
  index: number,
  predicate: (block: Reader.ParsedBlock) => boolean
): [Reader.ParsedBlock | null, number];

export function findNextBlock(
  blocks: Reader.ParsedBlock[],
  index: number,
  predicate: (block: Reader.ParsedBlock) => boolean
): [Reader.ParsedBlock | null, number] {
  for (let i = index; i < blocks.length; i++) {
    if (predicate(blocks[i])) {
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

export function isDivider(block: Reader.ParsedBlock): boolean {
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
  if (!isDivider(blocks[index])) {
    return [null, index];
  }

  const [_, nextDividerIndex] = findNextDivider(blocks, index + 1);

  if (nextDividerIndex === blocks.length) {
    return [null, index];
  }

  try {
    const gmContent = blocks
      .slice(index + 1, nextDividerIndex)
      .map((block) => block.content)
      .join("\n");

    const { data } = grayMatter(`---\n${gmContent}\n---`) as any;

    return [
      {
        ...data,
        tags: data.tags?.split(",").map((tag: string) => tag.trim()),
        authors: data.authors
          ?.split(",")
          .map((author: string) => author.trim()),
      },
      nextDividerIndex + 1,
    ];
  } catch (e) {
    return [null, index];
  }
}
