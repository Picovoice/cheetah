const fs = require("fs");
const { join, extname } = require("path");

const wasmFiles = [
  "pv_cheetah.wasm",
  "pv_cheetah.js",
  "pv_cheetah_simd.wasm",
  "pv_cheetah_simd.js"
];

console.log("Copying the WASM model...");

const sourceDirectory = join(
  __dirname,
  "..",
  "..",
  "..",
  "lib",
  "wasm"
);

const outputDirectory = join(__dirname, "..", "src", "lib");

try {
  fs.mkdirSync(outputDirectory, { recursive: true });
  wasmFiles.forEach(file => {
    fs.copyFileSync(join(sourceDirectory, file), join(outputDirectory, file))
    const ext = extname(file);
    if (ext === ".js") {
      fs.copyFileSync(join(sourceDirectory, file), join(outputDirectory, file.replace(ext, ".txt")));
    }
  })
} catch (error) {
  console.error(error);
}

console.log("... Done!");
