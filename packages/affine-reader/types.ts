import * as Y from "yjs";

export type YBlock = Y.Map<unknown>;
export type YBlocks = Y.Map<YBlock>;
export type BaseFlavour<T extends string> = `affine:${T}`;
export type Flavour = BaseFlavour<
  | "page"
  | "frame"
  | "paragraph"
  | "code"
  | "note"
  | "list"
  | "divider"
  | "embed"
  | "image"
  | "surface"
  | "database"
  | "attachment"
  | "bookmark"
>;

export interface WorkspacePage {
  id: string;
  guid: string;
  title: string;
  createDate: number;
  trash?: boolean;
  favorite?: boolean;
}
