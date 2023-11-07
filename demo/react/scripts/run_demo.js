const child_process = require("child_process");
const fs = require("fs");
const path = require("path");

const commands = process.argv.slice(2, 3);
const rootDir = path.join(__dirname, "..", "..", "..");

const libDirectory = path.join(__dirname, "..", "src", "lib");
const publicDirectory = path.join(__dirname, "..", "public", "models");
if (fs.existsSync(publicDirectory)) {
  fs.readdirSync(publicDirectory).forEach((f) => {
    fs.unlinkSync(path.join(publicDirectory, f));
  });
} else {
  fs.mkdirSync(publicDirectory, { recursive: true });
}

const modelDir = path.join(rootDir, "lib", "common");
const modelName = "cheetah_params.pv";
fs.copyFileSync(
  path.join(modelDir, modelName),
  path.join(publicDirectory, modelName)
);

fs.writeFileSync(
  path.join(libDirectory, "cheetahModel.js"),
  `const cheetahModel = {
  publicPath: "models/${modelName}",
  forceWrite: true,
};

(function () {
  if (typeof module !== "undefined" && typeof module.exports !== "undefined")
    module.exports = cheetahModel;
})();`
);

const command = process.platform === "win32" ? "npx.cmd" : "npx";

child_process.fork("react-scripts", commands, {
  execPath: command,
});
