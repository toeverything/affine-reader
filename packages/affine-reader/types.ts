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
  | "attachment"
  | "bookmark"
  | "embed-youtube"
  | "embed-linked-doc"
>;

export interface WorkspacePage {
  id: string;
  guid: string;
  title: string;
  createDate: number;
  trash?: boolean;
  favorite?: boolean;
  properties?: {
    custom: {
      id: string;
      name: string;
      type: "text" | "checkbox" | "date";
      required: boolean;
      icon: string;
      value: any;
    }[];
    system: {
      journal?: string;
    };
  };
}

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
  parsedBlocks: ParsedBlock[];
  linkedPages?: WorkspacePageContent[];
}
