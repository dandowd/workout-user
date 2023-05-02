import { build } from "esbuild";
import { glob } from "glob";
import fs from "fs";

const entryPoints = await glob("src/**/*-handler.ts");

const result = await build({
  entryPoints: entryPoints,
  bundle: true,
  outdir: "dist",
  platform: "node",
  external: ["aws-sdk", "@aws-sdk"],
  metafile: true,
});

fs.writeFileSync("dist/meta.json", JSON.stringify(result.metafile, null, 2));
