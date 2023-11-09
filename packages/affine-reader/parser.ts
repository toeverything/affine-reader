import * as Y from "yjs";
import { deltaToMd } from "delta-to-md";
import { YBlock, YBlocks, Flavour, WorkspacePage } from "./types";

export function blockToMd(
  target: string,
  workspaceId: string,
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
        content = "```" + lang + "\n" + toMd() + "```\n\n";
        break;
      }
      case "affine:image": {
        // https://app.affine.pro/api/workspaces/mWn__KSlOgS1tdDEjdX6P/blobs/hG9UPLuPwAO_Ahot5ztXkr53NVIRKaMb_7NcPaiK5MQ=
        const sourceId = yBlock.get("prop:sourceId");
        const width = yBlock.get("prop:width");
        const height = yBlock.get("prop:height");
        content = `\n<img src="${target}/api/workspaces/${workspaceId}/blobs/${sourceId}" width="${
          width ?? "auto"
        }" height="${height ?? "auto"}" crossorigin="anonymous" />\n\n`;
        break;
      }
      case "affine:attachment": {
        const type = yBlock.get("prop:type") as string;
        if (type.startsWith("video")) {
          // https://app.affine.pro/api/workspaces/mWn__KSlOgS1tdDEjdX6P/blobs/hG9UPLuPwAO_Ahot5ztXkr53NVIRKaMb_7NcPaiK5MQ=
          const sourceId = yBlock.get("prop:sourceId");
          content = `\n<video muted autoplay loop preload="auto" crossorigin="anonymous">
            <source src="${target}/api/workspaces/${workspaceId}/blobs/${sourceId}" type="${type}" />
          </video>\n\n`;
          break;
        }
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
            target,
            workspaceId,
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

  pages.forEach((page) => {
    const space = spaces[page.id] || spaces["space:" + page.id];
    page.guid = space.guid;
  });

  return pages;
};

export const pageDocToMD = (
  workspaceId: string,
  target: string,
  pageDoc: Y.Doc
) => {
  // we assume that the first block is the page block
  const yBlocks: YBlocks = pageDoc.getMap("blocks");

  // there are cases that the page is empty due to some weird issues
  if (yBlocks.size === 0) {
    return {
      title: "",
      md: "",
    };
  } else {
    const yPage = Array.from(yBlocks.values())[0];
    const title = yPage.get("prop:title") as string;
    return {
      title,
      md: blockToMd(target, workspaceId, yPage, yBlocks),
    };
  }
};
