import { AffineSchemas } from "@blocksuite/blocks";
import { AffineEditorContainer } from "@blocksuite/presets";
import "@blocksuite/presets/themes/affine.css";
import { DocCollection, Schema } from "@blocksuite/store";

import * as Y from "yjs";
export interface EditorContextType {
  editor: AffineEditorContainer | null;
  collection: DocCollection | null;
  updateCollection: (newCollection: DocCollection) => void;
}

export function initEditor(
  rootDocBin: ArrayBuffer,
  docId: string,
  docBin: ArrayBuffer
) {
  const schema = new Schema().register(AffineSchemas);
  const collection = new DocCollection({ schema });
  collection.meta.initialize();
  Y.applyUpdate(collection.doc, new Uint8Array(rootDocBin));

  const doc = collection.getDoc(docId);

  if (!doc) {
    throw new Error("Doc not found");
  }

  doc.load(() => {
    Y.applyUpdate(doc.spaceDoc, new Uint8Array(docBin));
  });

  const editor = new AffineEditorContainer();
  editor.doc = doc;

  return { editor, collection, doc };
}
