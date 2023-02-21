import fsp from 'fs/promises';
import { describe, expect, test } from 'vitest';
import { readFile } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import * as Y from 'yjs';

import { getBlocksuiteReader } from '../blocksuite-reader';
import { YBlocks } from '../types';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

async function loadBinary(filepath: string) {
  const buffer = await readFile(filepath);
  const update = new Uint8Array(buffer);
  const doc = new Y.Doc();
  Y.applyUpdate(doc, update);
  return doc;
}

describe('blocksuite-reader', async () => {
  const reader = getBlocksuiteReader({ workspaceId: 'test'});
  const yDoc = await loadBinary(path.resolve(__dirname, './test-workspace-doc.ydoc'));
  test('docToPages', () => {
    const pages = reader.docToPages(yDoc);
    expect(pages).toEqual([
      {
        id: '6b8dee73a9b8465aa988d12c835ff06d',
        title: 'Blogging on AFFiNE',
        createDate: 1676743457610
      },
      {
        id: '9485986e4c4749a4b4c5be8c0d79e188',
        title: 'The Tailwind Hype',
        createDate: 1676743064009
      },
      {
        id: 'de3e7b7910b146de95cc91aeec1a1216',
        title: 'Hello World!',
        createDate: 1676734861208,
        favorite: false
      },
      {
        id: 'e2f42ee01952489c9de3d8aa9b4dc9cf',
        title: '换汤不换药',
        createDate: 1676624821189,
        trash: true,
        trashDate: 1676742259589
      }
    ]);
  });

  describe('docToPages (with MD)', () => {
    const pages = reader.docToPages(yDoc, true);
    test('long', async () => {
      const page = pages.find((p) => p.id === '6b8dee73a9b8465aa988d12c835ff06d');
      expect(page!.md).toEqual(await fsp.readFile(path.resolve(__dirname, 'test-markdown.md'), 'utf-8'));
    });
  });
});
