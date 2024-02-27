import * as Y from "yjs";
import { deltaToMd } from "delta-to-md";
import { YBlock, YBlocks, Flavour, WorkspacePage } from "./types";

interface BlockToMdContext {
  target: string;
  workspaceId: string;
  docId: string;
  blobUrlHandler: (blobId: string) => string;
}

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
        content = (type === "bulleted" ? "* " : "1. ") + toMd();
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
          "```\n\n";
        break;
      }
      case "affine:image": {
        const sourceId = yBlock.get("prop:sourceId") as string;
        const width = yBlock.get("prop:width");
        const height = yBlock.get("prop:height");
        // fixme: this may not work if workspace is not public
        const blobUrl = context.blobUrlHandler(sourceId);
        if (width || height) {
          content = `\n<img src="${blobUrl}" width="${
            width || "auto"
          }" height="${height || "auto"}" crossorigin="anonymous" />\n\n`;
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
          content = `\n<video muted autoplay loop preload="auto" crossorigin="anonymous" playsinline>
            <source src="${blobUrl}" type="${type}" />
          </video>\n\n`;
        } else {
          // assume it is an image
          content = `\n![${sourceId}](${blobUrl})\n\n`;
        }
        break;
      }
      case "affine:page":
      case "affine:surface":
      case "affine:note":
      case "affine:frame": {
        content = "";
        resetPadding = true;
        break;
      }
      default:
        console.warn("Unknown or unsupported flavour", flavour);
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
  const pages = meta.pages as WorkspacePage[];

  pages.sort((a, b) => {
    return b.createDate - a.createDate;
  });

  // guid is not the same as id in page
  // we need to get the guid from spaces
  pages.forEach((page) => {
    const space = spaces["space:" + page.id] || spaces[page.id];
    page.guid = space.guid;
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
