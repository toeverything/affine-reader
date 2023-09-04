import { readFile } from 'fs/promises';
import { Doc, applyUpdate } from 'yjs';

export function loadDocFromJSON(yDocBinaryByJSON: string): Doc {
    const doc = new Doc();
    const docMapBase64 = JSON.parse(yDocBinaryByJSON) as Record<string, string>;
    const docMapBinary: Record<string, Uint8Array> = {};
    for (const key in docMapBase64) {
        docMapBinary[key] = Buffer.from(docMapBase64[key], 'base64');
    }

    // guid of rootDoc is manually set corresponding to saved_doc.base64
    applyUpdate(doc, docMapBinary['rootDoc']);

    const docs: Doc[] = [...doc.subdocs];
    while (docs.length > 0) {
        const doc = docs.shift();
        if (!doc) break;
        for (const subdoc of doc.subdocs) {
            docs.push(subdoc);
        }
        if (!docMapBinary[doc.guid]) {
            console.warn(`docMapBinary[${doc.guid}] not found`);
            continue;
        }
        applyUpdate(doc, docMapBinary[doc.guid]);
    }

    return doc;
}

export async function loadDocFromPath(filepath: string) {
    const json = await readFile(filepath, { encoding: 'utf8' });
    return loadDocFromJSON(json);
}