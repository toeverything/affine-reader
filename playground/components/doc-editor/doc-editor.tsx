"use client";

import { reader } from "@/reader";
import { Suspense, use, useEffect, useMemo, useReducer, useState } from "react";
import { PageRenderer } from "../workspace-renderer";
import EditorContainer from "./components/EditorContainer";
import styles from "./doc-editor.module.css";
import { EditorContext } from "./editor/context";
import { initEditor } from "./editor/editor";

import * as Y from "yjs";
import { AffineEditorContainer } from "@blocksuite/presets";
import { DocCollection } from "@blocksuite/store";

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

const parseCollectionData = (rootDoc: Y.Doc, doc: Y.Doc) => {
  const pages = reader.workspaceDocToPagesMeta(rootDoc);
  const page = reader.pageDocToMD(doc);
  return { pages, page };
};

function DocPreviewEditorImpl({
  rootDocBin,
  docBin,
  docId,
}: {
  rootDocBin: ArrayBuffer;
  docBin: ArrayBuffer;
  docId: string;
}) {
  const { editor, collection, doc } = useMemo(
    () => initEditor(rootDocBin, docId, docBin),
    [rootDocBin, docId, docBin]
  );
  const counter = useWatchChange(editor, collection);
  const { pages, page } = useMemo(
    () => parseCollectionData(collection.doc, doc.spaceDoc),
    [doc, counter]
  );

  return (
    <div className={styles.app}>
      <EditorContext.Provider value={{ editor, collection }}>
        <EditorContainer />
        {page && <PageRenderer page={page} pages={pages} />}
      </EditorContext.Provider>
    </div>
  );
}

function _DocPreviewEditor({ docId }: { docId: string }) {
  const [rootDoc, setRootDoc] = useState<ArrayBuffer | null>(null);
  const [doc, setDoc] = useState<ArrayBuffer | null>(null);

  useEffect(() => {
    reader.getDocBinary().then(setRootDoc);
    reader.getDocBinary(docId).then(setDoc);
  }, [docId]);

  return (
    rootDoc &&
    doc && (
      <DocPreviewEditorImpl rootDocBin={rootDoc} docBin={doc} docId={docId} />
    )
  );
}

export const DocPreviewEditor = ({ docId }: { docId: string }) => {
  return (
    <Suspense>
      <_DocPreviewEditor docId={docId} />
    </Suspense>
  );
};
