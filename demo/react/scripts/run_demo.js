const child_process = require("child_process");
const fs = require("fs");
const path = require("path");
const testData = require("../../../resources/.test/test_data.json");

const availableLanguages = testData["tests"]["language_tests"].map(
  (x) => x["language"]
);

const args = process.argv.slice(2);
const language = args[1];
if (!language) {
  console.error(
    `Choose the language you would like to run the demo in with "yarn start [language]".\nAvailable languages are ${availableLanguages.join(
      ", "
    )}`
  );
  process.exit(1);
}

if (!availableLanguages.includes(language)) {
  console.error(
    `'${language}' is not an available demo language.\nAvailable languages are ${availableLanguages.join(
      ", "
    )}`
  );
  process.exit(1);
}

let suffix = language === "en" ? "" : `_${language}`;
if (args.length > 2 && args[2] === "fast") {
  suffix += "_fast";
}

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
const modelName = `cheetah_params${suffix}.pv`;
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

child_process.execSync(`${command} react-scripts ${args.join(" ")}`, {
  shell: true,
  stdio: 'inherit'
});
