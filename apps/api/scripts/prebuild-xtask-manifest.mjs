import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { relative, resolve } from "node:path";
import { prebuildManifest } from "@xtaskjs/core";

const projectRoot = process.cwd();
const sourceRoot = resolve(projectRoot, "src");
const compiledRoot = resolve(projectRoot, "dist");

await prebuildManifest({ projectRoot });

const manifestPath = resolve(projectRoot, ".xtask-manifest.prebuilt.json");
const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
manifest.scanRoots = [];
manifest.files = manifest.files
  .map((file) => relative(sourceRoot, file))
  .filter((file) => file && !file.startsWith("..") && !file.endsWith(".test.ts") && !file.endsWith(".spec.ts") && file !== "main.ts")
  .map((file) => resolve(compiledRoot, file.replace(/\.tsx?$/, ".js")))
  .filter((file) => existsSync(file));

writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);