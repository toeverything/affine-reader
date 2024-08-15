import * as Y from "yjs";
import { pageDocToMD, workspaceDocToPagesMeta } from "./parser";

interface ReaderConfig {
  workspaceId: string; // root workspace id
  jwtToken?: string; // for auth, without "Bearer "
  sessionToken?: string; // for auth, will be used in cookie
  target?: string; // e.g. https://app.affine.pro
  Y?: typeof Y;
  retry?: number; // retry times. if 429, retry after the given seconds in the header
  // given a blob id, return a url to the blob
  blobUrlHandler?: (blobId: string) => string;
}

const defaultResourcesUrls = {
  doc: (target: string, workspaceId: string, docId: string) => {
    return `${target}/api/workspaces/${workspaceId}/docs/${docId}`;
  },
  blob: (target: string, workspaceId: string, blobId: string) => {
    return `${target}/api/workspaces/${workspaceId}/blobs/${blobId}`;
  },
};

export const getBlocksuiteReader = (config: ReaderConfig) => {
  const target = config.target || "https://app.affine.pro";
  const workspaceId = config.workspaceId;

  const YY = config.Y || Y;

  if (!workspaceId) {
    throw new Error("Workspace ID and target are required");
  }

  const getFetchHeaders = () => {
    const headers: HeadersInit = {};
    if (config.jwtToken) {
      headers["Authorization"] = `Bearer ${config.jwtToken}`;
    }
    if (config.sessionToken) {
      const cookie = `affine_session=${config.sessionToken}`;
      headers["Cookie"] = cookie;
    }
    return headers;
  };

  /**
   * Get doc binary by id
   *
   * @param docId
   * @returns
   */
  const getDocBinary = async (
    docId = workspaceId,
    retryCD = config.retry
  ): Promise<ArrayBuffer | null> => {
    try {
      const url = defaultResourcesUrls.doc(target, workspaceId, docId);
      const response = await fetch(url, {
        cache: "no-cache",
        headers: getFetchHeaders(),
      });

      if (!response.ok) {
        if (response.status === 429 && retryCD) {
          const retryAfter = response.headers.get("Retry-After");
          await new Promise((resolve) =>
            setTimeout(resolve, parseInt(retryAfter ?? "60") * 1000)
          );
          return getDocBinary(docId, retryCD - 1);
        }

        throw new Error(
          `Error getting workspace doc: ${response.status} ${response.statusText}`
        );
      }

      return await response.arrayBuffer();
    } catch (err) {
      console.error("Error getting workspace doc: ", err);
      return null;
    }
  };

  /**
   * Get blob by id
   *
   * @param blobId
   * @returns
   */
  const getBlob = async (blobId: string) => {
    const url = defaultResourcesUrls.blob(target, workspaceId, blobId);
    try {
      const res = await fetch(url, {
        cache: "no-cache",
        headers: getFetchHeaders(),
      });

      if (!res.ok) {
        throw new Error(`Error getting blob: ${res.status} ${res.statusText}`);
      }

      return res.blob();
    } catch (err) {
      console.error("Error getting blob: ", err);
      return null;
    }
  };

  /**
   * Get doc by id
   *
   * @param docId
   * @param buffer
   * @returns
   */
  const getDoc = async (docId = workspaceId) => {
    const updates = await getDocBinary(docId);
    if (!updates) {
      return null;
    }
    try {
      const doc = new YY.Doc();
      YY.applyUpdate(doc, new Uint8Array(updates));
      return doc;
    } catch (err) {
      console.error(`Error applying update, ${docId}: `, err);
      return null;
    }
  };

  const getDocPageMetas = async (docId = workspaceId) => {
    const doc = await getDoc(docId);
    if (!doc) {
      return null;
    }
    const pageMetas = workspaceDocToPagesMeta(doc);
    return pageMetas;
  };

  const defaultBlobUrlHandler = (id: string) =>
    defaultResourcesUrls.blob(target, workspaceId, id);

  const getDocMarkdown = async (docId = workspaceId) => {
    const doc = await getDoc(docId);
    if (!doc) {
      return null;
    }
    const result = pageDocToMD(
      workspaceId,
      target,
      doc,
      config.blobUrlHandler ?? defaultBlobUrlHandler
    );
    return result;
  };

  return {
    getBlob,
    getDoc,
    getDocBinary,
    getDocPageMetas,
    getDocMarkdown,
    pageDocToMD: (doc: Y.Doc) => {
      return pageDocToMD(
        workspaceId,
        target,
        doc,
        config.blobUrlHandler ?? defaultBlobUrlHandler
      );
    },
    workspaceDocToPagesMeta,
  };
};
