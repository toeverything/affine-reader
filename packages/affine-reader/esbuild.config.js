import { build } from "esbuild";

build({
  entryPoints: ["./index.ts", "./blog.ts", "./template.ts", "./template-v2.ts"],
  bundle: true,
  platform: "node",
  outdir: "dist",
  sourcemap: true,
  format: "esm",
  external: ["yjs", "@blocksuite/*"],
});
