import * as Reader from "./index";

const cacheTTL = 1000 * 15;

let reader: ReturnType<typeof Reader.getBlocksuiteReader> | null = null;

const rootDocCache = new (class {
  lastReadTime: number | null = null;
  private _value: Promise<Reader.WorkspacePage[] | null> | null = null;
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

  fetch() {
    if (!reader) {
      throw new Error("Reader not instantiated");
    }
    return reader.getDocPageMetas();
  }
})();

export function instantiateReader(workspaceId: string, sessionToken?: string) {
  reader = Reader.getBlocksuiteReader({
    workspaceId,
    sessionToken,
    retry: 3,
  });

  return reader;
}

export interface WorkspacePageContent {
  title: string | null;
  authors: string[] | null;
  tags: string[] | null;
  id: string;
  slug: string | null;
  cover?: string | null;
  description: string | null;
  created: number | null;
  updated: number | null;
  md: string;
  layout: string | null;
  publish?: boolean;
}

export function getWorkspacePageMetas() {
  return rootDocCache.value;
}

export function getWorkspacePageContent(id: string) {
  if (!reader) {
    throw new Error("Reader not instantiated");
  }
  // todo: should be WorkspacePageContent
  return reader.getDocPageContent(id);
}
