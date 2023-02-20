import * as Y from "yjs";
import { deltaToMd } from "delta-to-md";
import { YBlock, YBlocks, Flavour, WorkspacePage } from "./types";

interface ReaderConfig {
  workspaceId: string;
  target?: string;
}

export const getBlocksuiteReader = (config: ReaderConfig) => {
  const target = config?.target || "https://app.affine.pro";
  const workspaceId = config.workspaceId;

  if (!workspaceId || !target) {
    throw new Error("Workspace ID and target are required");
  }

  function blockToMd(yBlock: YBlock, yBlocks: YBlocks, padLeft = ""): string {
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
        content = "* " + toMd();
        break;
      }
      case "affine:code": {
        const lang = (yBlock.get("prop:language") as string).toLowerCase();
        content = "```" + lang + "\n" + toMd() + "```\n\n";
        break;
      }
      case "affine:embed": {
        if (type === "image") {
          // https://app.affine.pro/api/workspace/mWn__KSlOgS1tdDEjdX6P/blob/hG9UPLuPwAO_Ahot5ztXkr53NVIRKaMb_7NcPaiK5MQ=
          const sourceId = yBlock.get("prop:sourceId") as string;
          content = `![${sourceId}](${target}/api/workspace/${workspaceId}/blob/${sourceId})\n\n`;
          break;
        }
      }
      case "affine:page":
      case "affine:frame": {
        content = "";
        resetPadding = true;
        break;
      }
      default:
        throw new Error(flavour + " rendering not implemented");
    }

    const childrenIds = yBlock.get("sys:children");
    if (childrenIds instanceof Y.Array) {
      content += childrenIds
        .map((cid) => {
          return blockToMd(
            yBlocks.get(cid) as YBlock,
            yBlocks,
            resetPadding ? "" : padLeft + "  "
          );
        })
        .join("");
    }
    return padLeft + content;
  }

  const docToPages = (yDoc: Y.Doc, convertMd?: boolean) => {
    const meta = yDoc.getMap("space:meta").toJSON();
    const pages = meta.pages as WorkspacePage[];

    pages.sort((a, b) => {
      return b.createDate - a.createDate;
    });

    if (convertMd) {
      pages.forEach((page) => {
        const yBlocks: YBlocks = yDoc.getMap(`space:${page.id}`);
        const yPage = Array.from(yBlocks.values())[0];
        page.md = blockToMd(yPage, yBlocks);
      });
    }

    return pages;
  };

  const getWorkspaceDoc = async () => {
    const response = await fetch(`${target}/api/public/doc/${workspaceId}`);
    const updates = await response.arrayBuffer();
    const doc = new Y.Doc();
    Y.applyUpdate(doc, new Uint8Array(updates));
    return doc;
  };

  const getWorkspacePages = async (convertMd?: boolean) => {
    const yDoc = await getWorkspaceDoc();
    return docToPages(yDoc, convertMd);
  };

  const getWorkspacePage = async (pageId: string) => {
    const yDoc = await getWorkspaceDoc();
    const meta = yDoc.getMap("space:meta").toJSON();
    const page = meta.pages.find((p: any) => p.id === pageId);
    if (!page) {
      return null;
    }
    const yBlocks: YBlocks = yDoc.getMap(`space:${page.id}`);
    const yPage = Array.from(yBlocks.values())[0];
    page.md = blockToMd(yPage, yBlocks);
    return page;
  };

  return {
    blockToMd,
    docToPages,
    getWorkspaceDoc,
    getWorkspacePages,
    getWorkspacePage,
  };
};
