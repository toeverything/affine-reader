import { DocCollection } from "@blocksuite/store";

import { ZipTransformer } from "@blocksuite/blocks";
import { AffineSchemas } from "@blocksuite/blocks/schemas";
import { AIChatBlockSchema } from "@blocksuite/presets";
import { Schema } from "@blocksuite/store";
import { applyUpdate } from "yjs";

/**
 * Return the snapshot of the doc bin (zip)
 * @param rootDocBin
 * @param docBin
 */
export const getDocSnapshotFromBin = async (
  docId: string,
  docBin: ArrayBuffer,
  getBlob: (id: string) => Promise<Blob | null>
) => {
  const globalBlockSuiteSchema = new Schema();

  const schemas = [...AffineSchemas, AIChatBlockSchema];
  globalBlockSuiteSchema.register(schemas);

  const docCollection = new DocCollection({
    id: "test",
    schema: globalBlockSuiteSchema,
    blobSources: {
      main: {
        name: "main",
        readonly: true,
        get: getBlob,
        set: async () => {
          return "";
        },
        delete: async () => { },
        list: async () => {
          return [];
        },
      },
    },
  });
  docCollection.meta.initialize();

  const doc = docCollection.createDoc({
    id: docId,
  });
  doc.awarenessStore.setReadonly(doc.blockCollection, true);

  const spaceDoc = doc.spaceDoc;
  doc.load(() => {
    applyUpdate(spaceDoc, new Uint8Array(docBin));
    docCollection.schema.upgradeDoc(0, {}, spaceDoc);
  });

  return ZipTransformer.exportDocs(docCollection, [doc]);
};
