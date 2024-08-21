import { build } from "esbuild";

build({
  entryPoints: ["./index.ts", "./affine-blog.ts"],
  bundle: true,
  platform: "node",
  outdir: "dist",
  sourcemap: true,
  format: "esm",
  external: ["yjs"],
});
