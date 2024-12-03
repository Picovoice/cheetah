const child_process = require("child_process");
const fs = require("fs");
const path = require("path");
const testData = require("../../../resources/.test/test_data.json");

availableLanguages = testData["tests"]["language_tests"].map((x) => x["language"]);

const language = process.argv.slice(2)[0];
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

const suffix = language === "en" ? "" : `_${language}`;
const rootDir = path.join(__dirname, "..", "..", "..");

let outputDirectory = path.join(__dirname, "..", "models");
if (fs.existsSync(outputDirectory)) {
  fs.readdirSync(outputDirectory).forEach((f) => {
    fs.unlinkSync(path.join(outputDirectory, f));
  });
} else {
  fs.mkdirSync(outputDirectory, { recursive: true });
}

const modelDir = path.join(rootDir, "lib", "common");
const modelName = `cheetah_params${suffix}.pv`;
fs.copyFileSync(
  path.join(modelDir, modelName),
  path.join(outputDirectory, modelName)
);

fs.writeFileSync(
  path.join(outputDirectory, "cheetahModel.js"),
  `const cheetahModel = {
  publicPath: "models/${modelName}",
  forceWrite: true,
};

(function () {
  if (typeof module !== "undefined" && typeof module.exports !== "undefined")
    module.exports = cheetahModel;
})();`
);

const command = (process.platform === "win32") ? "npx.cmd" : "npx";

child_process.execSync(`${command} http-server -a localhost -p 5000`, {
  shell: true,
  stdio: 'inherit'
});