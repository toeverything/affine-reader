"use server";

import { reader } from "@/reader";
import { use } from "react";
import { PageRenderer } from "../workspace-renderer";
import styles from "./doc-editor.module.css";

import * as Y from "yjs";

const parseCollectionData = async (
  rootDoc: Y.Doc,
  doc: Y.Doc,
  docId: string,
  template?: boolean
) => {
  const propertiesDoc = await reader.getDocProperties();
  const pages = reader.workspaceDocToPagesMeta(rootDoc, propertiesDoc);
  const pageMeta = pages.find((p) => p.id === docId);
  if (!pageMeta) {
    throw new Error("Page not found");
  }
  const page = reader.preprocessBlogContent(pageMeta, docId, doc);
  if (!page) {
    throw new Error("Page not found");
  }

  return template
    ? { pages, page: await reader.postprocessTemplate(page) }
    : { pages, page: await reader.postprocessBlogContent(page) };
};

function DocPreviewEditorImpl({
  rootDocBin,
  docBin,
  docId,
  template = false,
}: {
  rootDocBin: ArrayBuffer;
  docBin: ArrayBuffer;
  docId: string;
  template?: boolean;
}) {
  const rootDoc = new Y.Doc();
  Y.applyUpdate(rootDoc, new Uint8Array(rootDocBin));
  const doc = new Y.Doc();
  Y.applyUpdate(doc, new Uint8Array(docBin));
  const { page } = use(parseCollectionData(rootDoc, doc, docId, template));

  return (
    <div className={styles.app}>
      {page ? <PageRenderer page={page} /> : <div>Loading...</div>}
    </div>
  );
}

export async function DocPreviewEditor({
  docId,
  template = false,
}: {
  docId: string;
  template?: boolean;
}) {
  const rootDocBin = await reader.getDocBinary();
  if (!rootDocBin) {
    throw new Error("Root doc bin not found");
  }
  const docLink = `https://app.affine.pro/workspace/${process.env.NEXT_PUBLIC_BLOG_WORKSPACE_ID}/${docId}`;
  const ydoc = new Y.Doc();
  Y.applyUpdate(ydoc, new Uint8Array(rootDocBin));
  const subdoc = ydoc.getMap("spaces").get(docId) as Y.Doc;
  const docBin = await reader.getDocBinary(subdoc.guid);
  if (!docBin) {
    throw new Error("Doc bin not found");
  }
  return (
    <>
      <h3>Note: changes in the editor do not persist</h3>
      <h3>
        Edit this page at{" "}
        <a target="_blank" href={docLink}>
          {docId}
        </a>
      </h3>
      <DocPreviewEditorImpl
        rootDocBin={rootDocBin}
        docBin={docBin}
        docId={docId}
        template={template}
      />
    </>
  );
}
