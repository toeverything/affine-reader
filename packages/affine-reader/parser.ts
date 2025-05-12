import * as Y from "yjs";
import { deltaToMd, getConverters } from "delta-to-md";

import { html } from "common-tags";

import type { YBlock, YBlocks, Flavour, WorkspacePage } from "./types";
import { CellDataType, ColumnDataType } from "@blocksuite/affine/model";

export interface ParserContext {
  workspaceId: string
  doc: Y.Doc;
  buildBlobUrl: (blobId: string) => string;
  buildDocUrl: (docId: string) => string;
}

export interface BlockToMdContext {
  target: string;
  workspaceId: string;
  docId: string;
  blobUrlHandler: (blobId: string) => string;
}

export interface BaseParsedBlock {
  id: string;
  flavour: Flavour;
  content: string;
  children: BaseParsedBlock[];
  type?: string;
}

export interface ParsedDoc {
  title: string;
  md: string;
  parsedBlock?: ParsedBlock;
}

export interface ParagraphBlock extends BaseParsedBlock {
  flavour: "affine:paragraph";
  type: "h1" | "h2" | "h3" | "h4" | "h5" | "h6" | "quote";
}

export interface DividerBlock extends BaseParsedBlock {
  flavour: "affine:divider";
}

export interface ListBlock extends BaseParsedBlock {
  flavour: "affine:list";
  type: "bulleted" | "numbered";
}

export interface CodeBlock extends BaseParsedBlock {
  flavour: "affine:code";
  language: string;
}

export interface ImageBlock extends BaseParsedBlock {
  flavour: "affine:image";
  sourceId: string;
  blobUrl: string;
  width?: number;
  height?: number;
  caption?: string;
}

export interface AttachmentBlock extends BaseParsedBlock {
  flavour: "affine:attachment";
  type: string;
  sourceId: string;
}

export interface EmbedYoutubeBlock extends BaseParsedBlock {
  flavour: "affine:embed-youtube";
  videoId: string;
}

export interface BookmarkBlock extends BaseParsedBlock {
  flavour: "affine:bookmark";
  url: string;
}

export interface EmbedLinkedDocBlock extends BaseParsedBlock {
  flavour: "affine:embed-linked-doc";
  pageId: string;
}

export interface EmbedSyncedDocBlock extends BaseParsedBlock {
  flavour: "affine:embed-synced-doc";
  pageId: string;
}

export interface DatabaseBlock extends BaseParsedBlock {
  title: string;
  flavour: "affine:database";
  rows: Record<string, string>[];
}

export interface TableBlock extends BaseParsedBlock {
  flavour: "affine:table";
  rows: string[][];
  columns: string[];
}

export type ParsedBlock =
  | ParagraphBlock
  | DividerBlock
  | ListBlock
  | CodeBlock
  | ImageBlock
  | AttachmentBlock
  | EmbedYoutubeBlock
  | BookmarkBlock
  | DatabaseBlock
  | TableBlock
  | BaseParsedBlock;

export type SerializedCells = {
  // row
  [key: string]: {
    // column
    [key: string]: CellDataType;
  };
};

export const parseBlockToMd = (
  block: BaseParsedBlock,
  padding = ""
): string => {
  if (block.content) {
    return (
      block.content
        .split("\n")
        .map((line) => padding + line)
        .join("\n") +
      "\n" +
      block.children.map((b) => parseBlockToMd(b, padding + "  ")).join("")
    );
  } else {
    return block.children.map((b) => parseBlockToMd(b, padding)).join("");
  }
};

export function parseBlock(
  context: ParserContext,
  yBlock: YBlock | undefined,
  yBlocks: YBlocks // all blocks
): ParsedBlock | null {
  if (!yBlock) {
    return null;
  }

  const deltaConverters = getConverters({
    convertInlineReferenceLink: (ref) => {
      return context.buildDocUrl(ref.pageId)
    }
  });

  const id = yBlock.get("sys:id") as string;
  const flavour = yBlock.get("sys:flavour") as Flavour;
  const type = yBlock.get("prop:type") as string;
  const toMd = () => deltaToMd((yBlock.get("prop:text") as Y.Text).toDelta(), deltaConverters);
  const hidden = yBlock.get("prop:hidden") as boolean;
  const displayMode = yBlock.get("prop:displayMode") as string;
  const childrenIds =
    yBlock.get("sys:children") instanceof Y.Array
      ? (yBlock.get("sys:children") as Y.Array<string>).toJSON()
      : [];

  let result: ParsedBlock = {
    id,
    flavour,
    content: "",
    children: [],
    type,
  };

  if (hidden || displayMode === "edgeless") {
    return result;
  }

  try {
    switch (flavour) {
      case "affine:paragraph": {
        let initial = "";
        if (type === "h1") {
          initial = "# ";
        } else if (type === "h2") {
          initial = "## ";
        } else if (type === "h3") {
          initial = "### ";
        } else if (type === "h4") {
          initial = "#### ";
        } else if (type === "h5") {
          initial = "##### ";
        } else if (type === "h6") {
          initial = "###### ";
        } else if (type === "quote") {
          initial = "> ";
        }
        result.content = initial + toMd() + "\n";
        break;
      }
      case "affine:divider": {
        result.content = "\n---\n\n";
        break;
      }
      case "affine:list": {
        result.content = (type === "bulleted" ? "* " : "1. ") + toMd() + "\n";
        break;
      }
      case "affine:code": {
        const lang =
          (yBlock.get("prop:language") as string)?.toLowerCase() || "";
        // do not transform to delta for code block
        const caption = yBlock.get("prop:caption") as string;
        result.content =
          "```" +
          lang +
          (caption ? ` ${caption}` : "") +
          "\n" +
          (yBlock.get("prop:text") as Y.Text).toJSON() +
          "\n```\n\n";
        break;
      }
      case "affine:image": {
        const sourceId = yBlock.get("prop:sourceId") as string;
        const width = yBlock.get("prop:width");
        const height = yBlock.get("prop:height");
        // fixme: this may not work if workspace is not public
        const blobUrl = context.buildBlobUrl(sourceId);
        const caption = yBlock.get("prop:caption") as string;
        if (width || height || caption) {
          result.content =
            html`
              <img
                src="${blobUrl}"
                alt="${caption}"
                width="${width || "auto"}"
                height="${height || "auto"}"
              />
            ` + "\n\n";
        } else {
          result.content = `\n![${caption || sourceId}](${blobUrl})\n\n`;
        }
        Object.assign(result, {
          sourceId,
          width,
          height,
          caption,
          blobUrl,
        });

        break;
      }
      case "affine:attachment": {
        const sourceId = yBlock.get("prop:sourceId") as string;
        const blobUrl = context.buildBlobUrl(sourceId);
        const caption = yBlock.get("prop:caption") as string;
        if (type.startsWith("video")) {
          result.content =
            html`
              <video muted autoplay loop preload="auto" playsinline>
                <source src="${blobUrl}" type="${type}" />
              </video>
            ` + "\n\n";
        } else {
          // assume it is an image
          result.content = `\n![${caption || sourceId}](${blobUrl})\n\n`;
        }
        Object.assign(result, {
          sourceId,
          blobUrl,
          caption,
        });
        break;
      }
      case "affine:embed-youtube": {
        const videoId = yBlock.get("prop:videoId") as string;
        // prettier-ignore
        result.content = html`
        <iframe
          type="text/html"
          width="100%"
          height="410px"
          src="https://www.youtube.com/embed/${videoId}"
          frameborder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowfullscreen
          credentialless>
        </iframe>` + '\n\n';
        break;
      }
      case "affine:bookmark": {
        const url = yBlock.get("prop:url") as string;
        const caption = yBlock.get("prop:caption") as string;
        result.content = `\n[](Bookmark,${url})\n\n`;
        Object.assign(result, {
          url,
          caption,
        });
        break;
      }
      case "affine:embed-linked-doc":
      case "affine:embed-synced-doc": {
        const pageId = yBlock.get("prop:pageId") as string;
        const caption = yBlock.get("prop:caption") as string;
        result.content = `\n[${caption}](${context.buildDocUrl(pageId)})\n\n`;
        Object.assign(result, {
          pageId,
          caption,
        });
        break;
      }
      case "affine:surface":
      case "affine:page":
      case "affine:note":
      case "affine:frame": {
        result.content = "";
        break;
      }
      case "affine:database": {
        const title = (yBlock.get("prop:title") as Y.Text).toJSON();
        const childrenTitleById = Object.fromEntries(
          childrenIds.map((cid) => {
            const child = parseBlock(
              context,
              yBlocks.get(cid) as YBlock | undefined,
              yBlocks
            );
            if (!child) {
              return [cid, ""];
            }
            return [cid, parseBlockToMd(child)] as const;
          })
        );
        const cols = (
          yBlock.get("prop:columns") as Y.Array<ColumnDataType>
        ).toJSON() as ColumnDataType[];

        const cells = (
          yBlock.get("prop:cells") as Y.Map<SerializedCells>
        ).toJSON() as SerializedCells;

        function optionToTagHtml(option: any) {
          return `<span data-affine-option data-value="${option.id}" data-option-color="${option.color}">${option.value}</span>`;
        }

        const dbRows: string[][] = childrenIds
          .map((cid, index) => {
            const row = cells[cid];
            return cols.map((col) => {
              const value = row?.[col.id]?.value;

              if (col.type !== "title" && !value) {
                return "";
              }

              switch (col.type) {
                case "title":
                  return childrenTitleById[cid];
                case "select":
                  return optionToTagHtml(
                    (col.data["options"] as any).find(
                      (opt: any) => opt.id === value
                    )
                  );
                case "multi-select":
                  return (col.data["options"] as any)
                    .filter((opt: any) => (value as string[]).includes(opt.id))
                    .map(optionToTagHtml)
                    .join("");
                default:
                  return value ?? "";
              }
            });
          })
          .filter((row) => !row.every((v) => !v));
        const header = cols.map((col) => {
          return col.name;
        });

        const divider = cols.map((col) => {
          return "---";
        });

        // convert to markdown table
        result.content =
          [header, divider, ...dbRows]
            .map((row) => {
              return (
                "|" +
                row
                  .map((cell) => String(cell || "")?.trim())
                  .join("|")
                  .replace(/\n+/g, "<br />") +
                "|"
              );
            })
            .join("\n") + "\n\n";

        Object.assign(result, {
          title,
          rows: dbRows.map((row) => {
            return Object.fromEntries(row.map((v, i) => [cols[i].name, v]));
          }),
        });
        break;
      }
      case "affine:table": {
        // Extract row IDs and their order
        const rowEntries = Object.entries(yBlock.toJSON())
          .filter(
            ([key]) => key.startsWith("prop:rows.") && key.endsWith(".rowId")
          )
          .map(([key, value]) => {
            const rowId = value as string;
            const orderKey = key.replace(".rowId", ".order");
            const order = yBlock.get(orderKey) as string;
            const backgroundColor = yBlock.get(
              key.replace(".rowId", ".backgroundColor")
            ) as string | undefined;
            return { rowId, order, backgroundColor };
          })
          .sort((a, b) => a.order.localeCompare(b.order));

        // Extract column IDs and their order
        const columnEntries = Object.entries(yBlock.toJSON())
          .filter(
            ([key]) =>
              key.startsWith("prop:columns.") && key.endsWith(".columnId")
          )
          .map(([key, value]) => {
            const columnId = value as string;
            const orderKey = key.replace(".columnId", ".order");
            const order = yBlock.get(orderKey) as string;
            return { columnId, order };
          })
          .sort((a, b) => a.order.localeCompare(b.order));

        // Build the table rows with cell data
        const tableRows = rowEntries.map(({ rowId }) => {
          return columnEntries.map(({ columnId }) => {
            const cellKey = `prop:cells.${rowId}:${columnId}.text`;
            const cellText = yBlock.get(cellKey) as string | undefined;
            return cellText || "";
          });
        });

        // Store column IDs for reference
        const columnIds = columnEntries.map(({ columnId }) => columnId);

        // Use the first row as header and the rest as data rows
        if (tableRows.length > 0) {
          const headerRow = tableRows[0];
          const dataRows = tableRows.slice(1);
          const separators = headerRow.map(() => "---");

          // Convert to markdown table with first row as header
          result.content =
            [headerRow, separators, ...dataRows]
              .map((row) => {
                return (
                  "|" +
                  row
                    .map((cell) => String(cell || "")?.trim())
                    .join("|")
                    .replace(/\n+/g, "<br />") +
                  "|"
                );
              })
              .join("\n") + "\n\n";
        } else {
          // Handle empty table case
          result.content = "";
        }

        Object.assign(result, {
          columns: columnIds,
          rows: tableRows,
        });
        break;
      }
      default: {
        // console.warn("Unknown or unsupported flavour", flavour);
      }
    }

    result.children =
      flavour !== "affine:database"
        ? childrenIds
          .map((cid) =>
            parseBlock(
              context,
              yBlocks.get(cid) as YBlock | undefined,
              yBlocks
            )
          )
          .filter(
            (block): block is ParsedBlock =>
              !!block &&
              !(block.content === "" && block.children.length === 0)
          )
        : [];
  } catch (e) {
    console.warn("Error converting block to md", e);
  }
  return result;
}

export const workspaceDocToPagesMeta = (
  yDoc: Y.Doc,
  propertiesDoc?: Y.Doc | null
) => {
  const meta = yDoc.getMap("meta").toJSON();
  const spaces = yDoc.getMap("spaces").toJSON();
  const pages = meta.pages as WorkspacePage[];

  pages.sort((a, b) => {
    return b.createDate - a.createDate;
  });

  // guid is not the same as id in page
  // we need to get the guid from spaces
  pages.forEach((page) => {
    const space = spaces["space:" + page.id] || spaces[page.id];
    page.guid = space.guid;
    page.properties = propertiesDoc?.getMap(page.id).toJSON();
    page.properties = Object.assign({}, page.properties, {
      // @ts-ignore
      tags: page.tags
        ?.map(
          (t: string) =>
            meta.properties?.tags?.options.find((tag: any) => tag.id === t)
              ?.value
        )
        .filter((t: string | undefined) => !!t),
    });
  });
  return pages;
};

export const parsePageDoc = (
  ctx: ParserContext,
): ParsedDoc => {
  // we assume that the first block is the page block
  const yBlocks: YBlocks = ctx.doc.getMap("blocks");
  const maybePageBlock = Object.entries(yBlocks.toJSON()).findLast(
    ([_, b]) => b["sys:flavour"] === "affine:page"
  );

  // there are cases that the page is empty due to some weird issues
  if (!maybePageBlock) {
    return {
      title: "",
      md: "",
    };
  } else {
    const yPage = yBlocks.get(maybePageBlock[0]) as YBlock;
    const title = yPage.get("prop:title") as Y.Text;
    const rootBlock = parseBlock(ctx, yPage, yBlocks);
    if (!rootBlock) {
      return {
        title: "",
        md: "",
      };
    }
    rootBlock.children = rootBlock.children.filter(
      (block): block is BaseParsedBlock => block.flavour === "affine:note"
    );
    const md = parseBlockToMd(rootBlock);

    return {
      title: title.toJSON(),
      parsedBlock: rootBlock,
      md,
    };
  }
};
