const fs = require("fs");
const { join } = require("path");

const wasmFile = "pv_cheetah.wasm"

console.log("Copying the WASM model...");

const sourceDirectory = join(
  __dirname,
  "..",
  "..",
  "..",
  "lib",
  "wasm"
);

const outputDirectory = join(__dirname, "..", "lib");

try {
  fs.mkdirSync(outputDirectory, { recursive: true });
  fs.copyFileSync(join(sourceDirectory, wasmFile), join(outputDirectory, wasmFile))
} catch (error) {
  console.error(error);
}

console.log("... Done!");
