import * as Y from "yjs";
import { ParsedBlock } from "./parser";

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
  | "table"
  | "attachment"
  | "bookmark"
  | "embed-youtube"
  | "embed-linked-doc"
  | "embed-synced-doc"
>;

export interface WorkspacePage {
  id: string;
  guid: string;
  title: string;
  createDate: number;
  trash?: boolean;
  favorite?: boolean;
  properties?: Record<string, any>;
}

export interface WorkspacePageContent {
  title?: string;
  authors?: string[];
  tags?: string[];
  id: string;
  slug?: string;
  ["slug-alt"]?: string;
  cover?: string;
  coverAlt?: string;
  thumbnail?: string;
  thumbnailAlt?: string;
  description?: string;
  created?: number;
  updated?: number;
  md?: string;
  publish?: boolean;
  parsedBlocks?: ParsedBlock[];
  linkedPages?: WorkspacePageContent[];
  relatedBlogs?: string[];
  valid?: boolean;
}
