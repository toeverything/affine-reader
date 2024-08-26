import * as Y from "yjs";

import * as Reader from "./index";
import { findNextBlock, parseGrayMatter, skipEmptyBlocks } from "./utils";

let reader: ReturnType<typeof Reader.getBlocksuiteReader> | null = null;

export type { WorkspacePage, WorkspacePageContent } from "./index";

abstract class TTLCache<T> {
  lastReadTime: number | null = null;
  private _value: Promise<T> | null = null;
  abstract cacheTTL: number;

  get value() {
    if (
      !this._value ||
      this.lastReadTime === null ||
      this.lastReadTime < Date.now() - this.cacheTTL
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
  cacheTTL = 1000 * 30; // 30s
  protected fetch() {
    if (!reader) {
      throw new Error("Reader not instantiated");
    }
    return reader.getDocPageMetas();
  }
})();

const pageContentCache = new (class {
  private caches = new Map<
    string,
    TTLCache<Reader.WorkspacePageContent | null>
  >();

  get(id: string) {
    if (!this.caches.has(id)) {
      this.caches.set(
        id,
        new (class extends TTLCache<Reader.WorkspacePageContent | null> {
          cacheTTL = 1000 * 30;
          protected fetch() {
            return getWorkspacePageContent(id);
          }
        })()
      );
    }
    return this.caches.get(id)!;
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
    // todo: there is no way to know which page is the blog page by reading workspace page metas yet
    getDocPageMetas: () => rootDocCache.value,
    getWorkspacePageContent: async (
      id: string,
      withLinkedPages: boolean = true
    ) => {
      const page = await pageContentCache.get(id).value;
      if (withLinkedPages && page) {
        return postprocessPageContent(page);
      }
      return page;
    },
    parsePageDoc: parsePageDoc,
    postprocessPageContent,
    getLinkedPageIdsFromMarkdown,
    getRichLinkedPages,
  };
}

function isValidPage(page: Reader.WorkspacePageContent) {
  return Boolean(
    page.title && page.md && page.id && page.slug && page.cover && page.created
  );
}

function parsePageDoc(
  docMeta: Reader.WorkspacePage,
  pageId: string,
  doc: Y.Doc
): Reader.WorkspacePageContent | null {
  if (!reader) {
    throw new Error("Reader not instantiated");
  }

  const rootBlock = reader?.parsePageDoc(doc);

  if (!rootBlock || !rootBlock.parsedBlock) {
    return null;
  }

  // first level is the page
  if (rootBlock.parsedBlock.flavour !== "affine:page") {
    return null;
  }

  const blocks = rootBlock.parsedBlock.children.find(
    (block) => block.flavour === "affine:note"
  )?.children;

  if (!blocks) {
    return null;
  }

  const result: Reader.WorkspacePageContent = {
    id: pageId,
    parsedBlocks: blocks,
  };

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
    result.coverAlt = coverResult[0].caption?.trim();
  }

  const validChildren = blocks.slice(currentIndex).filter((b) => {
    // also filter out the cover
    return b !== coverResult[0];
  });

  // return the markdown (without gray matter)
  result.md = Reader.parseBlockToMd({
    id: "fake-id",
    content: "",
    flavour: "affine:page",
    children: validChildren,
  });

  // @ts-ignore
  delete docMeta["tags"];

  const parsedDoc = { ...docMeta, ...result, parsedBlocks: validChildren };

  return {
    ...parsedDoc,
    valid: isValidPage(parsedDoc),
  };
}

function getLinkedPageIdsFromMarkdown(md: string): string[] {
  const linkedPageIds = md.matchAll(/\[\]\(LinkedPage:([\w-_]*)\)/g);
  return Array.from(linkedPageIds).map(([_, id]) => id);
}

async function getRichLinkedPages(pageIds: string[]) {
  const pageMetas = await rootDocCache.value;

  const linkedPages = await Promise.all(
    [...new Set(pageIds)].map(async (id) => {
      const page = pageMetas?.find((p) => p.id === id);
      if (!page) {
        return null;
      }
      return pageContentCache.get(page.guid).value;
    })
  );

  return linkedPages.filter(Boolean) as Reader.WorkspacePageContent[];
}

async function postprocessPageContent(
  content: Reader.WorkspacePageContent
): Promise<Reader.WorkspacePageContent> {
  if (!content.md) {
    return content;
  }

  const linkedPageIds = getLinkedPageIdsFromMarkdown(content.md);

  return {
    ...content,
    linkedPages: await getRichLinkedPages(linkedPageIds),
  };
}

async function getWorkspacePageContent(
  guid: string
): Promise<Reader.WorkspacePageContent | null> {
  if (!reader) {
    throw new Error("Reader not instantiated");
  }
  const rootDoc = await rootDocCache.value;
  const rootBlock = await reader.getDoc(guid);
  const docMeta = rootDoc?.find((p) => p.guid === guid);
  const docId = docMeta?.id;

  if (!rootBlock || !docId || !docMeta) {
    return null;
  }

  return parsePageDoc(docMeta, docId, rootBlock);
}
