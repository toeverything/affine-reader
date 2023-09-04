import { readFile } from "node:fs/promises";
import { Doc, applyUpdate } from "yjs";

export function loadDocsFromJSON(yDocBinaryByJSON: string) {
  const docMapBase64 = JSON.parse(yDocBinaryByJSON) as Record<string | 'rootDoc', string>;
  const docMapBinary: Record<string, Doc> = {};
  for (const key in docMapBase64) {
    const doc = new Doc();
    const bin = Buffer.from(docMapBase64[key], "base64");
    applyUpdate(doc, bin);
    docMapBinary[key] = doc;
  }
  return docMapBinary;
}

export async function loadDocFromPath(filepath: string) {
  const json = await readFile(filepath, { encoding: "utf8" });
  return loadDocsFromJSON(json);
}
