import {
  Doc,
  DocCollection,
  DocSnapshot,
  getAssetName,
  Job,
} from "@blocksuite/store";

import * as fflate from "fflate";

import { AffineSchemas } from "@blocksuite/affine/blocks/schemas";
import { Schema } from "@blocksuite/store";
import { applyUpdate } from "yjs";

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

async function exportDocs(collection: DocCollection, docs: Doc[]) {
  const zip = new Zip();
  const job = new Job({ collection });
  const snapshots = await Promise.all(
    docs.map((doc) => job.docToSnapshot(doc))
  );

  const collectionInfo = job.collectionInfoToSnapshot();
  await zip.file("info.json", JSON.stringify(collectionInfo, null, 2));

  await Promise.all(
    snapshots
      .filter((snapshot): snapshot is DocSnapshot => !!snapshot)
      .map(async (snapshot) => {
        const snapshotName = `${snapshot.meta.id}.snapshot.json`;
        await zip.file(snapshotName, JSON.stringify(snapshot, null, 2));
      })
  );

  const assets = zip.folder("assets");
  const assetsMap = job.assets;

  for (const [id, blob] of assetsMap) {
    const ext = getAssetName(assetsMap, id).split(".").at(-1);
    const name = `${id}.${ext}`;
    await assets.file(name, blob);
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
  doc.awarenessStore.setReadonly(doc.blockCollection, true);

  const spaceDoc = doc.spaceDoc;
  doc.load(() => {
    applyUpdate(spaceDoc, new Uint8Array(docBin));
    docCollection.schema.upgradeDoc(0, {}, spaceDoc);
  });

  return await exportDocs(docCollection, [doc]);
};
