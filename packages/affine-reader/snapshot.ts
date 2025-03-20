import * as fflate from "fflate";
import {
  replaceIdMiddleware,
  titleMiddleware,
} from "@blocksuite/affine-shared/adapters";
import { AffineSchemas } from "@blocksuite/affine/schemas";
import { applyUpdate } from "yjs";
import {
  DocSnapshot,
  getAssetName,
  Schema,
  Store,
  Transformer,
  Workspace,
} from "@blocksuite/affine/store";

import { TestWorkspace } from "@blocksuite/store/test";

class Zip {
  private compressed = new Uint8Array();

  private finalize?: () => void;

  private finalized = false;

  private zip = new fflate.Zip((err, chunk, final) => {
    if (!err) {
      const temp = new Uint8Array(this.compressed.length + chunk.length);
      temp.set(this.compressed);
      temp.set(chunk, this.compressed.length);
      this.compressed = temp;
    }
    if (final) {
      this.finalized = true;
      this.finalize?.();
    }
  });

  async file(path: string, content: Blob | File | string) {
    const deflate = new fflate.ZipDeflate(path);
    this.zip.add(deflate);
    if (typeof content === "string") {
      deflate.push(fflate.strToU8(content), true);
    } else {
      deflate.push(new Uint8Array(await content.arrayBuffer()), true);
    }
  }

  folder(folderPath: string) {
    return {
      folder: (folderPath2: string) => {
        return this.folder(`${folderPath}/${folderPath2}`);
      },
      file: async (name: string, blob: Blob) => {
        await this.file(`${folderPath}/${name}`, blob);
      },
      generate: async () => {
        return this.generate();
      },
    };
  }

  async generate() {
    this.zip.end();
    return new Promise<Blob>((resolve) => {
      if (this.finalized) {
        resolve(new Blob([this.compressed], { type: "application/zip" }));
      } else {
        this.finalize = () =>
          resolve(new Blob([this.compressed], { type: "application/zip" }));
      }
    });
  }
}

async function exportDocs(
  collection: Workspace,
  schema: Schema,
  docs: Store[]
) {
  const zip = new Zip();
  const job = new Transformer({
    schema,
    blobCRUD: collection.blobSync,
    docCRUD: {
      create: (id: string) => collection.createDoc({ id }),
      get: (id: string) => collection.getDoc(id),
      delete: (id: string) => collection.removeDoc(id),
    },
    middlewares: [
      replaceIdMiddleware(collection.idGenerator),
      titleMiddleware(collection.meta.docMetas),
    ],
  });
  const snapshots = await Promise.all(docs.map(job.docToSnapshot));

  await Promise.all(
    snapshots
      .filter((snapshot): snapshot is DocSnapshot => !!snapshot)
      .map(async (snapshot) => {
        // Use the title and id as the snapshot file name
        const title = snapshot.meta.title || "untitled";
        const id = snapshot.meta.id;
        const snapshotName = `${title}-${id}.snapshot.json`;
        await zip.file(snapshotName, JSON.stringify(snapshot, null, 2));
      })
  );

  const assets = zip.folder("assets");
  const pathBlobIdMap = job.assetsManager.getPathBlobIdMap();
  const assetsMap = job.assets;

  // Add blobs to assets folder, if failed, log the error and continue
  const results = await Promise.all(
    Array.from(pathBlobIdMap.values()).map(async (blobId) => {
      try {
        await job.assetsManager.readFromBlob(blobId);
        const ext = getAssetName(assetsMap, blobId).split(".").at(-1);
        const blob = assetsMap.get(blobId);
        if (blob) {
          await assets.file(`${blobId}.${ext}`, blob);
          return { success: true, blobId };
        }
        return { success: false, blobId, error: "Blob not found" };
      } catch (error) {
        console.error(`Failed to process blob: ${blobId}`, error);
        return { success: false, blobId, error };
      }
    })
  );

  const failures = results.filter((r) => !r.success);
  if (failures.length > 0) {
    console.warn(`Failed to process ${failures.length} blobs:`, failures);
  }

  return await zip.generate();
}

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
  globalBlockSuiteSchema.register(AffineSchemas);
  const docCollection = new TestWorkspace({
    id: "test",
    blobSources: {
      main: {
        name: "main",
        readonly: true,
        get: getBlob,
        set: async () => {
          return "";
        },
        delete: async () => {},
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

  const spaceDoc = doc.spaceDoc;
  doc.load(() => {
    applyUpdate(spaceDoc, new Uint8Array(docBin));
  });

  return await exportDocs(docCollection, globalBlockSuiteSchema, [doc]);
};
