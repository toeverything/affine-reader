import React, { useEffect, useState } from "react";
import { initEditor } from "../editor/editor";
import { EditorContext } from "../editor/context";
import * as Y from "yjs";

const { editor, collection } = initEditor();

export interface CollectionData {
  activeDoc: Y.Doc | null;
  rootDoc: Y.Doc;
  docs: Record<string, Y.Doc>;
}

export const useCollectionData = () => {
  const [data, setData] = useState<CollectionData>({
    activeDoc: null,
    rootDoc: collection?.doc,
    docs: {},
  });

  useEffect(() => {
    const unsubs: (() => void)[] = [];
    const onRootUpdate = () => {
      setData((prev) => ({
        ...prev,
        rootDoc: collection.doc,
      }));
    };

    const onDocUpdate = (id: string, doc: Y.Doc) => {
      setData((prev) => ({
        ...prev,
        docs: {
          ...prev.docs,
          [id]: doc,
        },
      }));
    };

    const cleanupUnsubs = () => {
      for (const listener of unsubs) {
        listener();
      }
    };

    const onDocsUpdate = () => {
      cleanupUnsubs();
      for (const [id, doc] of collection.doc.spaces.entries()) {
        const onUpdate = () => onDocUpdate(id, doc);
        doc.on("update", onUpdate);
        unsubs.push(() => doc.off("update", onUpdate));
      }
    };

    collection.doc.on("update", onRootUpdate);
    collection.doc.spaces.observe(onDocsUpdate);
    onDocsUpdate();
    return () => {
      collection.doc.off("update", onRootUpdate);
      collection.doc.spaces.unobserve(onDocsUpdate);
      for (const listener of unsubs) {
        listener();
      }
    };
  }, []);

  useEffect(() => {
    const onDocChanged = () => {
      setData((prev) => ({
        ...prev,
        activeDoc: editor.doc.spaceDoc,
      }));
    };
    const { dispose } = editor.slots.docUpdated.on(onDocChanged);
    return dispose;
  }, []);

  return data;
};

export const EditorProvider = ({ children }: { children: React.ReactNode }) => {
  return (
    <EditorContext.Provider value={{ editor, collection }}>
      {children}
    </EditorContext.Provider>
  );
};
