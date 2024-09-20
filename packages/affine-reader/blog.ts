import * as Y from "yjs";

import * as Reader from "./index";
import {
  findNextBlock,
  getDatabaseBlock,
  parseGrayMatter,
  skipEmptyBlocks,
} from "./utils";

let reader: ReturnType<typeof Reader.getBlocksuiteReader> | null = null;

export type { WorkspacePage, WorkspacePageContent } from "./index";

export type PreprocessedPageContent = Omit<
  Reader.WorkspacePageContent,
  "linkedPages" | "relatedBlogs"
> & {
  relatedBlogIds?: string[];
  linkedPageIds?: string[];
  coverBlock?: Reader.ImageBlock | null;
  thumbnailBlock?: Reader.ImageBlock | null;
  relatedBlogsBlock?: Reader.DatabaseBlock | null;
};

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

// parsing layers
// 1. parsePageDoc -> parsedDoc, just parse the page doc, return the parsed blocks and the markdown
// 2. preprocessPageContent -> page content, metadata
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
              return getPreprocessedBlogContent(id);
            }
          })()
        );
      }
      return this.caches.get(id)!;
    }
  })();

  function isValidPage(page: Reader.WorkspacePageContent) {
    return Boolean(
      page.title &&
        page.md &&
        page.id &&
        page.slug &&
        page.cover &&
        page.created
    );
  }

  function getLinkedPageIdsFromMarkdown(
    md: string
  ): { id: string; mode: string }[] {
    const linkedPageIds = md.matchAll(/\[\]\(LinkedPage:([\w-_:]*)\)/g);
    return Array.from(linkedPageIds).map(([_, pageId]) => {
      const [id, mode] = pageId.split(":");
      return { id, mode: mode || "page" };
    });
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

  /**
   * preprocess the page content
   * this is not async so that we do not need to parse external links
   *
   * @param docMeta
   * @param pageId
   * @param parsedDoc
   * @returns
   */
  function preprocessBlogContent(
    docMeta: Reader.WorkspacePage,
    pageId: string,
    doc: Y.Doc
  ): PreprocessedPageContent | null {
    if (!reader) {
      throw new Error("Reader not instantiated");
    }

    const parsedDoc = reader.parsePageDoc(doc);
    if (!parsedDoc) {
      console.log("parsedDoc is null");
      return null;
    }

    if (!parsedDoc.parsedBlock) {
      console.log("parsedDoc.parsedBlock is null");
      return null;
    }

    // first level is the page
    if (parsedDoc.parsedBlock.flavour !== "affine:page") {
      console.log("parsedDoc.parsedBlock is not a page");
      return null;
    }

    let blocks = parsedDoc.parsedBlock.children.find(
      (block) => block.flavour === "affine:note"
    )?.children;

    if (!blocks) {
      console.log("page may be a canvas, skip");
      return null;
    }

    const result: PreprocessedPageContent = {
      id: pageId,
    };

    // gray matter is the part
    // - flavour is affine:paragraph
    // - start/end with ---
    // or paragraph wrapped with affine:divider

    // skip empty blocks
    let [, currentIndex] = skipEmptyBlocks(blocks, 0);

    const gmResult = parseGrayMatter(blocks, currentIndex);

    currentIndex = gmResult[1];

    // first image block is the cover
    const [coverBlock, coverBlockIndex] = findNextBlock(
      blocks,
      currentIndex,
      (block): block is Reader.ImageBlock => block.flavour === "affine:image"
    );

    if (coverBlock) {
      result.cover = reader.blobUrlHandler(coverBlock.sourceId);
      result.coverAlt = coverBlock.caption?.trim();
    }

    let thumbnailBlock: Reader.ImageBlock | null = null;

    if (coverBlock) {
      const [block] = skipEmptyBlocks(blocks, coverBlockIndex + 1);
      if (block && block.flavour === "affine:image") {
        thumbnailBlock = block as Reader.ImageBlock;
        result.thumbnail = reader.blobUrlHandler(thumbnailBlock.sourceId);
        result.thumbnailAlt = thumbnailBlock.caption?.trim();
      }
    }

    const linkedPageIds = getLinkedPageIdsFromMarkdown(parsedDoc.md);

    const relatedBlogsBlock = getDatabaseBlock(blocks, "Related Blogs");

    const relatedBlogIds = relatedBlogsBlock
      ? getLinkedPageIdsFromMarkdown(relatedBlogsBlock.content)
      : [];

    const validChildren = blocks.slice(currentIndex).filter((b) => {
      // also filter out the cover
      return (
        b !== coverBlock && b !== thumbnailBlock && b !== relatedBlogsBlock
      );
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

    Object.assign(result, docMeta);

    if (gmResult[0]) {
      Object.assign(result, gmResult[0]);
    }

    result.parsedBlocks = validChildren;
    result.valid = isValidPage(result);
    result.relatedBlogIds = relatedBlogIds.map((b) => b.id);
    result.linkedPageIds = linkedPageIds.map((b) => b.id);
    result.coverBlock = coverBlock;
    result.thumbnailBlock = thumbnailBlock;
    result.relatedBlogsBlock = relatedBlogsBlock;

    return result;
  }

  async function postprocessBlogContent(
    preprocessed: PreprocessedPageContent
  ): Promise<Reader.WorkspacePageContent> {
    if (!reader) {
      throw new Error("Reader not instantiated");
    }

    if (!preprocessed.parsedBlocks) {
      throw new Error("Parsed block is required");
    }

    preprocessed = { ...preprocessed };

    const linkedPages = preprocessed.linkedPageIds
      ? await getRichLinkedPages(preprocessed.linkedPageIds)
      : [];

    const relatedBlogs = preprocessed.relatedBlogIds
      ? await getRichLinkedPages(preprocessed.relatedBlogIds)
      : [];

    delete preprocessed.thumbnailBlock;
    delete preprocessed.coverBlock;
    delete preprocessed.relatedBlogsBlock;

    const res: Reader.WorkspacePageContent = {
      ...preprocessed,
      linkedPages,
      relatedBlogs: relatedBlogs.map((b) => b.slug).filter(Boolean) as string[],
    };

    return res;
  }

  async function getPreprocessedBlogContent(
    guid: string
  ): Promise<PreprocessedPageContent | null> {
    if (!reader) {
      throw new Error("Reader not instantiated");
    }
    const rootDoc = await rootDocCache.value;
    const doc = await reader.getDoc(guid);
    const docMeta = rootDoc?.find((p) => p.guid === guid);
    const docId = docMeta?.id;

    if (!doc || !docId || !docMeta) {
      return null;
    }
    return preprocessBlogContent(docMeta, docId, doc);
  }

  return {
    ...reader,
    // todo: there is no way to know which page is the blog page by reading workspace page metas yet
    getDocPageMetas: () => rootDocCache.value,
    getWorkspacePageContent: async (
      id: string,
      postprocess: boolean = true
    ) => {
      const page = await pageContentCache.get(id).value;
      if (postprocess && page) {
        return postprocessBlogContent(page);
      }
      return page;
    },
    preprocessBlogContent,
    postprocessBlogContent,
    getLinkedPageIdsFromMarkdown,
    getRichLinkedPages,
  };
}
