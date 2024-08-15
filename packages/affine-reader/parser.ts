import * as Y from "yjs";
import { deltaToMd } from "delta-to-md";
import type { Column, Cell } from "@blocksuite/blocks";

import { html } from "common-tags";

import type { YBlock, YBlocks, Flavour, WorkspacePage } from "./types";

interface BlockToMdContext {
  target: string;
  workspaceId: string;
  docId: string;
  blobUrlHandler: (blobId: string) => string;
}

interface ParsedBlock {
  id: string;
  flavour: Flavour;
  content: string;
  children: ParsedBlock[];
}

interface ParagraphBlock extends ParsedBlock {
  flavour: "affine:paragraph";
  type: "h1" | "h2" | "h3" | "h4" | "h5" | "h6" | "quote";
}

interface DividerBlock extends ParsedBlock {
  flavour: "affine:divider";
}

interface ListBlock extends ParsedBlock {
  flavour: "affine:list";
  type: "bulleted" | "numbered";
}

interface CodeBlock extends ParsedBlock {
  flavour: "affine:code";
  language: string;
}

interface ImageBlock extends ParsedBlock {
  flavour: "affine:image";
  sourceId: string;
  width?: number;
  height?: number;
  caption?: string;
}

interface AttachmentBlock extends ParsedBlock {
  flavour: "affine:attachment";
  type: string;
  sourceId: string;
}

interface EmbedYoutubeBlock extends ParsedBlock {
  flavour: "affine:embed-youtube";
  videoId: string;
}

interface BookmarkBlock extends ParsedBlock {
  flavour: "affine:bookmark";
  url: string;
}

interface DatabaseBlock extends ParsedBlock {
  title: string;
  flavour: "affine:database";
  columns: Column[];
  cells: SerializedCells;
}

export type SerializedCells = {
  // row
  [key: string]: {
    // column
    [key: string]: Cell;
  };
};

export function blockToMd(
  context: BlockToMdContext,
  yBlock: YBlock,
  yBlocks: YBlocks,
  padLeft = ""
): string {
  try {
    const flavour = yBlock.get("sys:flavour") as Flavour;
    const type = yBlock.get("prop:type") as string;
    const toMd = () => deltaToMd((yBlock.get("prop:text") as Y.Text).toDelta());
    let content = "";
    let resetPadding = false;

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
        content = initial + toMd() + "\n";
        break;
      }
      case "affine:divider": {
        content = "\n---\n\n";
        break;
      }
      case "affine:list": {
        content = (type === "bulleted" ? "* " : "1. ") + toMd() + "\n";
        break;
      }
      case "affine:code": {
        const lang = (yBlock.get("prop:language") as string).toLowerCase();
        // do not transform to delta for code block
        content =
          "```" +
          lang +
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
        const blobUrl = context.blobUrlHandler(sourceId) + ".webp";
        const caption = yBlock.get("prop:caption") as string;
        if (width || height || caption) {
          content = html`
            <img
              src="${blobUrl}"
              alt="${caption}"
              width="${width || "auto"}"
              height="${height || "auto"}"
            />
          `;
        } else {
          content = `\n![${sourceId}](${blobUrl})\n\n`;
        }
        break;
      }
      case "affine:attachment": {
        const type = yBlock.get("prop:type") as string;
        const sourceId = yBlock.get("prop:sourceId") as string;
        // fixme: this may not work if workspace is not public
        const blobUrl = context.blobUrlHandler(sourceId);
        if (type.startsWith("video")) {
          content =
            html`
              <video muted autoplay loop preload="auto" playsinline>
                <source src="${blobUrl}" type="${type}" />
              </video>
            ` + "\n\n";
        } else {
          // assume it is an image
          content = `\n![${sourceId}](${blobUrl})\n\n`;
        }
        break;
      }
      case "affine:embed-youtube": {
        const videoId = yBlock.get("prop:videoId") as string;
        // prettier-ignore
        content = html`
        <iframe
          type="text/html"
          width="100%"
          height="410px"
          src="https://www.youtube.com/embed/${videoId}"
          frameborder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowfullscreen>
        </iframe>` + '\n\n';
        break;
      }
      case "affine:bookmark": {
        const url = yBlock.get("prop:url") as string;
        content = `\n[](Bookmark,${url})\n\n`;
        break;
      }
      case "affine:surface": {
        return ""; // do nothing for surface
      }
      case "affine:page":
      case "affine:note":
      case "affine:frame": {
        content = "";
        resetPadding = true;
        break;
      }
      case "affine:database": {
        const titleById = Object.fromEntries(
          (yBlock.get("sys:children") as Y.Array<string>).map((cid) => {
            return [
              cid,
              blockToMd(
                context,
                yBlocks.get(cid) as YBlock,
                yBlocks,
                ""
              ).trim(),
            ] as const;
          })
        );
        const cols = (
          yBlock.get("prop:columns") as Y.Array<Column>
        ).toJSON() as Column[];

        const cells = (
          yBlock.get("prop:cells") as Y.Map<SerializedCells>
        ).toJSON() as SerializedCells;

        function optionToTagHtml(option: any) {
          return `<span data-affine-option data-value="${option.id}" data-option-color="${option.color}">${option.value}</span>`;
        }

        const rows = Object.entries(cells)
          .filter(([cid]) => titleById[cid])
          .map(([cid, row]) => {
            return cols
              .map((col) => {
                const value = row[col.id]?.value;

                if (col.type !== "title" && !value) {
                  return "";
                }

                switch (col.type) {
                  case "title":
                    return titleById[cid];
                  case "select":
                    return optionToTagHtml(
                      (col.data["options"] as any).find(
                        (opt: any) => opt.id === value
                      )
                    );
                  case "multi-select":
                    return (col.data["options"] as any)
                      .filter((opt: any) =>
                        (value as string[]).includes(opt.id)
                      )
                      .map(optionToTagHtml)
                      .join("");
                  default:
                    return value ?? "";
                }
              })
              .map((v) => (v ? v.replace(/\n/g, "<br />") : v));
          })
          .filter((row) => !row.every((v) => !v));

        const header = cols.map((col) => {
          return col.name;
        });

        const divider = cols.map((col) => {
          return "---";
        });

        // convert to markdown table
        return (
          [header, divider, ...rows]
            .map((row) => {
              return "|" + row.join("|") + "|";
            })
            .join("\n") + "\n\n"
        );
      }
      default: {
        console.warn("Unknown or unsupported flavour", flavour);
      }
    }

    const childrenIds = yBlock.get("sys:children");
    if (childrenIds instanceof Y.Array) {
      content += childrenIds
        .map((cid: string) => {
          return blockToMd(
            context,
            yBlocks.get(cid) as YBlock,
            yBlocks,
            resetPadding ? "" : padLeft + "  "
          );
        })
        .join("");
    }
    return padLeft + content;
  } catch (e) {
    console.warn("Error converting block to md", e);
    return "";
  }
}

export const workspaceDocToPagesMeta = (yDoc: Y.Doc) => {
  const meta = yDoc.getMap("meta").toJSON();
  const spaces = yDoc.getMap("spaces").toJSON();
  const properties = yDoc.getMap("affine:workspace-properties").toJSON();
  const pages = meta.pages as WorkspacePage[];

  pages.sort((a, b) => {
    return b.createDate - a.createDate;
  });

  // guid is not the same as id in page
  // we need to get the guid from spaces
  pages.forEach((page) => {
    const space = spaces["space:" + page.id] || spaces[page.id];
    page.guid = space.guid;

    // parse properties
    const prop = properties?.pageProperties?.[page.id];
    if (prop) {
      const customProperties = Object.entries<any>(prop.custom)
        .map(([key, value]) => {
          const schema = properties?.schema?.pageProperties?.custom?.[key];
          if (!schema) {
            return null;
          }
          return {
            ...schema,
            ...value,
          };
        })
        .filter((v) => v);

      customProperties.sort((a, b) => {
        return a.order > b.order ? 1 : a.order < b.order ? -1 : 0;
      });

      page.properties = {
        system: {
          journal: prop.custom?.system?.journal?.value,
        },
        custom: customProperties,
      };
    }
  });
  return pages;
};

export const pageDocToMD = (
  workspaceId: string,
  target: string,
  pageDoc: Y.Doc,
  blobUrlHandler: (blobId: string) => string
) => {
  // we assume that the first block is the page block
  const yBlocks: YBlocks = pageDoc.getMap("blocks");
  const maybePageBlock = Object.entries(yBlocks.toJSON()).find(
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
    const title = yPage.get("prop:title") as string;
    const context = {
      target,
      workspaceId,
      docId: pageDoc.guid,
      blobUrlHandler,
    };
    return {
      title,
      md: blockToMd(context, yPage, yBlocks),
    };
  }
};
