import grayMatter from "gray-matter";

import * as Y from "yjs";

import * as Reader from "./index";

const cacheTTL = 1000 * 15;

let reader: ReturnType<typeof Reader.getBlocksuiteReader> | null = null;

export type { WorkspacePage } from "./index";

export interface WorkspacePageContent {
  title?: string;
  authors?: string[];
  tags?: string[];
  id: string;
  slug?: string;
  ["slug-alt"]?: string;
  cover?: string;
  description?: string;
  created?: number;
  updated?: number;
  md?: string;
  publish?: boolean;
}
abstract class TTLCache<T> {
  lastReadTime: number | null = null;
  private _value: Promise<T> | null = null;

  get value() {
    if (
      !this._value ||
      this.lastReadTime === null ||
      this.lastReadTime < Date.now() - cacheTTL
    ) {
      this._value = this.fetch();
    }
    this.lastReadTime = Date.now();
    return this._value;
  }

  protected abstract fetch(): Promise<T>;
}

const rootDocCache = new (class extends TTLCache<
  Reader.WorkspacePage[] | null
> {
  protected fetch() {
    if (!reader) {
      throw new Error("Reader not instantiated");
    }
    return reader.getDocPageMetas();
  }
})();

export function instantiateReader({
  workspaceId,
  sessionToken,
  jwtToken,
  target,
}: {
  workspaceId: string;
  sessionToken?: string;
  jwtToken?: string;
  target?: string;
}) {
  reader = Reader.getBlocksuiteReader({
    workspaceId,
    sessionToken,
    retry: 3,
    jwtToken,
    target,
  });

  return {
    ...reader,
    workspaceId,
    getDocPageMetas: getDocPageMetas,
    getWorkspacePageContent: getWorkspacePageContent,
    parsePageDoc: parsePageDoc,
  };
}

export function getDocPageMetas() {
  return rootDocCache.value;
}

function findNextBlock<T extends Reader.ParsedBlock>(
  blocks: Reader.ParsedBlock[],
  index: number,
  predicate: (block: Reader.ParsedBlock) => block is T
): [T | null, number];

function findNextBlock(
  blocks: Reader.ParsedBlock[],
  index: number,
  predicate: (block: Reader.ParsedBlock) => boolean
): [Reader.ParsedBlock | null, number];

function findNextBlock(
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

function skipEmptyBlocks(
  blocks: Reader.ParsedBlock[],
  index: number
): [Reader.ParsedBlock | null, number] {
  return findNextBlock(blocks, index, (block) => block.content.trim() !== "");
}

function isDivider(block: Reader.ParsedBlock): boolean {
  return (
    block.flavour === "affine:divider" ||
    (block.flavour === "affine:paragraph" &&
      block.content.trim().includes("---"))
  );
}

function findNextDivider(
  blocks: Reader.ParsedBlock[],
  index: number
): [Reader.ParsedBlock | null, number] {
  return findNextBlock(blocks, index, isDivider);
}

function parseGrayMatter(
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

export function parsePageDoc(
  docId: string,
  doc: Y.Doc
): WorkspacePageContent | null {
  if (!reader) {
    throw new Error("Reader not instantiated");
  }

  const result: WorkspacePageContent = { id: docId };

  const rootBlock = reader?.parsePageDoc(doc);

  if (!rootBlock || !rootBlock.parsedBlock) {
    return null;
  }

  // first level is the page
  if (rootBlock.parsedBlock.flavour !== "affine:page") {
    return result;
  }

  const blocks = rootBlock.parsedBlock.children.find(
    (block) => block.flavour === "affine:note"
  )?.children;

  if (!blocks) {
    return result;
  }

  // gray matter is the part
  // - flavour is affine:paragraph
  // - start/end with ---
  // or paragraph wrapped with affine:divider

  // skip empty blocks
  let [, currentIndex] = skipEmptyBlocks(blocks, 0);

  const gmResult = parseGrayMatter(blocks, currentIndex);

  if (gmResult[0]) {
    Object.assign(result, gmResult[0]);
  }

  currentIndex = gmResult[1];

  // first image block is the cover
  const coverResult = findNextBlock(
    blocks,
    currentIndex,
    (block): block is Reader.ImageBlock => block.flavour === "affine:image"
  );

  if (coverResult[0]) {
    result.cover = reader.blobUrlHandler(coverResult[0].sourceId) + ".webp";
  }

  // return the markdown (without gray matter)
  result.md = Reader.parsedBlockToMd({
    id: "fake-id",
    content: "",
    flavour: "affine:page",
    children: blocks.slice(currentIndex),
  });

  // todo: there is no proper way for now to know the slug of the linked page
  // we have to parse ALL pages and let the client to handle it.
  return result;
}

export async function getWorkspacePageContent(
  id: string
): Promise<WorkspacePageContent | null> {
  if (!reader) {
    throw new Error("Reader not instantiated");
  }

  const rootBlock = await reader.getDoc(id);

  if (!rootBlock) {
    return null;
  }

  return parsePageDoc(id, rootBlock);
}
