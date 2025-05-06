import { build } from "esbuild";
import fs from "fs/promises";
import path from "path";

const result = await build({
  entryPoints: ["./index.ts", "./blog.ts", "./template.ts", "./template-v2.ts"],
  bundle: true,
  platform: "node",
  outdir: "dist",
  target: "es2015",
  sourcemap: true,
  format: "esm",
  external: ["yjs", "@shikijs/*"],
  metafile: true,
});

if (process.env.METAFILE) {
  await fs.writeFile(
    path.resolve(`metafile-${Date.now()}.json`),
    JSON.stringify(result.metafile, null, 2)
  );
}
