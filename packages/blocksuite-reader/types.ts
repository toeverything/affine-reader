import * as Y from "yjs";

export type YBlock = Y.Map<unknown>;
export type YBlocks = Y.Map<YBlock>;
export type BaseFlavour<T extends string> = `affine:${T}`;
export type Flavour = BaseFlavour<
  | "page"
  | "frame"
  | "paragraph"
  | "code"
  | "list"
  | "divider"
  | "embed"
  | "surface"
  | "database"
>;

export interface WorkspacePage {
  id: string;
  title: string;
  createDate: number;
  trash?: boolean;
  favorite?: boolean;
  md?: string;
}
