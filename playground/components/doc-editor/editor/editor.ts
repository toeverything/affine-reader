import { blogReader } from "@/reader";
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

const baseUrl = location.origin;

export function initEditor(
  rootDocBin: ArrayBuffer,
  docId: string,
  docBin: ArrayBuffer
) {
  const schema = new Schema().register(AffineSchemas);
  const workspaceId = blogReader.workspaceId;
  const collection = new DocCollection({
    schema,
    blobSources: {
      main: {
        get: async (key) => {
          const suffix: string = key.startsWith("/")
            ? key
            : `/api/workspaces/${workspaceId}/blobs/${key}`;
          return fetch(baseUrl + suffix, { cache: "default" }).then(
            async (res) => {
              if (!res.ok) {
                // status not in the range 200-299
                return null;
              }
              return res.blob();
            }
          );
        },
        set: async () => {
          // no op
          return "";
        },
        delete: async () => {
          // no op
        },
        list: async () => {
          // no op
          return [];
        },
        name: "",
        readonly: true,
      },
    },
  });
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
