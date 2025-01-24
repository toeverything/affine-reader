"use client";

import { reader } from "@/reader";
import { useEffect, useMemo, useReducer, useState } from "react";
import { PageRenderer } from "../workspace-renderer";
import EditorContainer from "./components/EditorContainer";
import styles from "./doc-editor.module.css";
import { EditorContext } from "./editor/context";
import { initEditor } from "./editor/editor";

import { AffineEditorContainer } from "@blocksuite/presets";
import { DocCollection } from "@blocksuite/store";
import { WorkspacePageContent } from "affine-reader";
import * as Y from "yjs";

export const useWatchChange = (
  editor: AffineEditorContainer,
  collection: DocCollection
) => {
  const [counter, forceUpdate] = useReducer((x) => x + 1, 0);

  useEffect(() => {
    const unsubs: (() => void)[] = [];

    const cleanupUnsubs = () => {
      for (const listener of unsubs) {
        listener();
      }
    };

    const onDocsUpdate = () => {
      cleanupUnsubs();
      for (const [id, doc] of collection.doc.spaces.entries()) {
        doc.on("update", forceUpdate);
        unsubs.push(() => doc.off("update", forceUpdate));
      }
    };

    collection.doc.on("update", forceUpdate);
    collection.doc.spaces.observe(onDocsUpdate);
    onDocsUpdate();
    return () => {
      collection.doc.off("update", forceUpdate);
      collection.doc.spaces.unobserve(onDocsUpdate);
      for (const listener of unsubs) {
        listener();
      }
    };
  }, []);

  useEffect(() => {
    const { dispose } = editor.slots.docUpdated.on(forceUpdate);
    return dispose;
  }, []);

  return counter;
};

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
  const { editor, collection, doc } = useMemo(
    () => initEditor(rootDocBin, docId, docBin),
    [rootDocBin, docId, docBin]
  );
  const counter = useWatchChange(editor, collection);
  const [page, setPage] = useState<WorkspacePageContent | null>(null);

  useEffect(() => {
    let canceled = false;

    parseCollectionData(collection.doc, doc.spaceDoc, docId, template).then(
      ({ page }) => {
        if (canceled) return;
        setPage(page);
      }
    );
    return () => {
      canceled = true;
    };
  }, [doc, counter]);

  return (
    <div className={styles.app}>
      <EditorContext.Provider value={{ editor, collection }}>
        <EditorContainer style={{ width: "50%" }} />
        {page ? (
          <PageRenderer page={page} style={{ width: "50%" }} />
        ) : (
          <div>Loading...</div>
        )}
      </EditorContext.Provider>
    </div>
  );
}

export function DocPreviewEditor({
  docId,
  template = false,
}: {
  docId: string;
  template?: boolean;
}) {
  const [rootDocBin, setRootDocBin] = useState<ArrayBuffer | null>(null);
  const [docBin, setDocBin] = useState<ArrayBuffer | null>(null);

  const docLink = `https://app.affine.pro/workspace/${process.env.NEXT_PUBLIC_BLOG_WORKSPACE_ID}/${docId}`;

  useEffect(() => {
    reader.getDocBinary().then((rootDoc) => {
      if (!rootDoc) {
        return;
      }
      setRootDocBin(rootDoc);
      const ydoc = new Y.Doc();
      Y.applyUpdate(ydoc, new Uint8Array(rootDoc));
      const subdoc = ydoc.getMap("spaces").get(docId) as Y.Doc;
      if (!subdoc) {
        return;
      }
      reader.getDocBinary(subdoc.guid).then((doc) => setDocBin(doc));
    });
  }, [docId]);

  return (
    <>
      <h3>Note: changes in the editor do not persist</h3>
      <h3>
        Edit this page at{" "}
        <a target="_blank" href={docLink}>
          {docId}
        </a>
      </h3>
      {rootDocBin && docBin && (
        <DocPreviewEditorImpl
          rootDocBin={rootDocBin}
          docBin={docBin}
          docId={docId}
          template={template}
        />
      )}
    </>
  );
}
