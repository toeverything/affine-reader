import fsp from "node:fs/promises";
import path from "node:path";
import * as Y from "yjs";
import { describe, expect, test } from "vitest";
import { loadDocFromPath } from "./util";
import { pageDocToMD, workspaceDocToPagesMeta } from "../parser";

const getTestJSON = async () => {
  return await loadDocFromPath(path.resolve(__dirname, "./saved_doc.json"));
};

async function loadBinary(filepath: string) {
  const buffer = await fsp.readFile(filepath);
  const update = new Uint8Array(buffer);
  const doc = new Y.Doc();
  Y.applyUpdate(doc, update);
  return doc;
}

describe("affine-reader", async () => {
  test("should get page meta", async () => {
    const docMap = await getTestJSON();
    const pageMetas = workspaceDocToPagesMeta(docMap["rootDoc"]);
    expect(pageMetas).toEqual([
      {
        id: "IEZqYvhesI",
        title: "only connector",
        createDate: 1692599552958,
        guid: "35815f8e-9fba-473a-9c7d-96d0faef8452",
      },
      {
        id: "7R-WHACBvc",
        title: "only brush",
        createDate: 1692599542032,
        guid: "e37e9c88-7236-47eb-94d2-70b7b02ee00a",
      },
      {
        id: "KnEQRZEM-f",
        title: "only shape",
        createDate: 1692599528579,
        guid: "5a62273c-ce70-4b1a-ac75-22c6986bb499",
      },
      {
        id: "V6UKOEiFPp",
        title: "Demo Workspace's Pinboard",
        createDate: 1692599488766,
        isRootPinboard: true,
        guid: "3dbb624e-9dea-4f69-a11d-ea46a40e80a2",
      },
      {
        id: "hello-world",
        title: "Welcome to AFFiNE",
        createDate: 1692599488750,
        init: false,
        demoTitle: "Welcome to AFFiNE",
        jumpOnce: false,
        favorite: false,
        guid: "7ffe1736-5196-4c91-a058-4567c0c8df02",
      },
    ]);
  });

  test("transform test binary to markdown", async () => {
    const page = await loadBinary(
      path.resolve(__dirname, "./test-workspace-doc.ydoc")
    );
    const result = pageDocToMD("test", "https://example.com", page, () => "");
    const expected = await fsp.readFile(
      path.resolve(__dirname, "test-markdown.md"),
      "utf-8"
    );

    expect(result.md.trim()).toEqual(expected);
  });
});
