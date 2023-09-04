import * as Y from "yjs";
import { pageDocToMD, workspaceDocToPagesMeta } from "./parser";

interface ReaderConfig {
  workspaceId: string; // root workspace id
  authorization?: string; // e.g. Bearer xxx (jwt token)
  target?: string; // e.g. https://insider.affine.pro
  Y?: typeof Y;
}

export const getBlocksuiteReader = (config: ReaderConfig) => {
  const target = config?.target || "https://insider.affine.pro";
  const workspaceId = config.workspaceId;

  const YY = config.Y || Y;

  if (!workspaceId || !target) {
    throw new Error("Workspace ID and target are required");
  }

  const getDocRaw = async (docId = workspaceId) => {
    try {
      const response = await fetch(
        `${target}/api/workspaces/${workspaceId}/docs/${docId}`,
        {
          cache: "no-cache",
        }
      );

      return await response.arrayBuffer();
    } catch (err) {
      console.error("Error getting workspace doc: ", err);
      return null;
    }
  };

  const getDoc = async (docId = workspaceId, buffer?: ArrayBuffer) => {
    const updates = buffer ?? (await getDocRaw(docId));
    const doc = new YY.Doc();
    if (!updates) {
      return doc;
    }
    try {
      YY.applyUpdate(doc, new Uint8Array(updates));
    } catch (err) {
      console.error(`Error applying update, ${docId}: `, err);
      return null;
    }
    return doc;
  };

  const getDocPageMetas = async (docId = workspaceId) => {
    const doc = await getDoc(docId);
    if (!doc) {
      return null;
    }
    const pageMetas = workspaceDocToPagesMeta(doc);
    return pageMetas;
  };

  const getDocMarkdown = async (docId = workspaceId) => {
    const doc = await getDoc(docId);
    if (!doc) {
      return null;
    }
    const result = pageDocToMD(workspaceId, target, doc);
    return result;
  };

  return {
    getDocRaw,
    getDoc,
    getDocPageMetas,
    getDocMarkdown,
  };
};
