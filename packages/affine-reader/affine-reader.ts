import * as Y from "yjs";
import { deltaToMd } from "delta-to-md";
import { YBlock, YBlocks, Flavour, WorkspacePage } from "./types";

interface ReaderConfig {
  workspaceId: string;
  refreshToken?: string;
  target?: string;
  Y?: typeof Y;
}

export const getBlocksuiteReader = (config: ReaderConfig) => {
  const target = config?.target || "https://app.affine.pro";
  const workspaceId = config.workspaceId;

  const YY = config.Y || Y;

  if (!workspaceId || !target) {
    throw new Error("Workspace ID and target are required");
  }

  function blockToMd(yBlock: YBlock, yBlocks: YBlocks, padLeft = ""): string {
    try {
      const flavour = yBlock.get("sys:flavour") as Flavour;
      const type = yBlock.get("prop:type") as string;
      const toMd = () =>
        deltaToMd((yBlock.get("prop:text") as Y.Text).toDelta());
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
        case "affine:embed": {
          if (type === "image") {
            // https://app.affine.pro/api/workspace/mWn__KSlOgS1tdDEjdX6P/blob/hG9UPLuPwAO_Ahot5ztXkr53NVIRKaMb_7NcPaiK5MQ=
            const sourceId = yBlock.get("prop:sourceId");
            const width = yBlock.get("prop:width");
            const height = yBlock.get("prop:height");
            if (width || height) {
              content = `\n<img src="${target}/api/workspace/${workspaceId}/blob/${sourceId}" width="${
                width ?? "auto"
              }" height="${height ?? "auto"}" />\n\n`;
            } else {
              content = `\n![${sourceId}](${target}/api/workspace/${workspaceId}/blob/${sourceId})\n\n`;
            }
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
          console.warn("Unknown flavour", flavour);
      }

      const childrenIds = yBlock.get("sys:children");
      if (childrenIds instanceof YY.Array) {
        content += childrenIds
          .map((cid: string) => {
            return blockToMd(
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
        // console.warn("no yPage found for ", page.id);
        page.md = yPage ? blockToMd(yPage, yBlocks) : "";
      });
    }

    return pages;
  };

  const getAccessToken = async () => {
    if (config.refreshToken) {
      // we will try to get the access token if refresh token is provided
      const response = await fetch(`${target}/api/user/token`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          token: config.refreshToken,
          type: "Refresh",
        }),
      });

      if (response.status === 200) {
        console.log("Got access token");
        const data = await response.json();
        return data.token as string;
      }
    }
  };

  const getWorkspaceDocRaw = async () => {
    try {
      if (config.refreshToken) {
        console.log("refresh token provided, will use private api");
        const accessToken = await getAccessToken();
        if (!accessToken) {
          throw new Error("Failed to get access token");
        }
        // will get the workspace doc via private api
        const response = await fetch(
          `${target}/api/workspace/${workspaceId}/doc`,
          {
            cache: "no-cache",
            headers: {
              authorization: accessToken,
            },
          }
        );
        return await response.arrayBuffer();
      } else {
        const response = await fetch(
          `${target}/api/public/workspace/${workspaceId}`,
          {
            cache: "no-cache",
          }
        );
        
        return await response.arrayBuffer();
      }
    } catch (err) {
      console.error("Error getting workspace doc: ", err);
      return null;
    }
  };

  const getWorkspaceDoc = async (buffer?: ArrayBuffer) => {
    const updates = buffer ?? (await getWorkspaceDocRaw());
    const doc = new YY.Doc();
    if (!updates) {
      return doc;
    }
    try {
      YY.applyUpdate(doc, new Uint8Array(updates));
    } catch (err) {
      console.error("Error applying update: ", err);
      return null;
    }
    return doc;
  };

  const getWorkspacePages = async (convertMd?: boolean) => {
    const yDoc = await getWorkspaceDoc();
    if (yDoc) {
      return docToPages(yDoc, convertMd);
    }
  };

  const getWorkspacePage = async (
    pageId: string
  ): Promise<WorkspacePage | null> => {
    const yDoc = await getWorkspaceDoc();
    if (!yDoc) {
      return null;
    }
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
    getWorkspaceDocRaw,
    getWorkspaceDoc,
    getWorkspacePages,
    getWorkspacePage,
  };
};
