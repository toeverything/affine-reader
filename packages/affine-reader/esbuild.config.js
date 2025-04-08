import { build } from "esbuild";
import { vanillaExtractPlugin } from "@vanilla-extract/esbuild-plugin";

build({
  entryPoints: ["./index.ts", "./blog.ts", "./template.ts", "./template-v2.ts"],
  bundle: true,
  platform: "node",
  outdir: "dist",
  target: "es2015",
  sourcemap: true,
  format: "esm",
  external: ["yjs"],
  plugins: [vanillaExtractPlugin()],
});
