import "package:path/path.dart";

import "dart:convert";
import "dart:io";

final String resourcePath =
    join(dirname(Platform.script.path), "..", "..", "..", "resources");
final String libPath =
    join(dirname(Platform.script.path), "..", "..", "..", "lib");
final String testDataPath = join(resourcePath, ".test", "test_data.json");

final String assetsPath = join(dirname(Platform.script.path), "..", "assets");
final String modelsPath = join(assetsPath, "models");

Future<Map> readJsonFile(String filePath) async {
  var input = await File(filePath).readAsString();
  var map = jsonDecode(input);
  return map;
}

void main(List<String> arguments) async {
  var testData = await readJsonFile(testDataPath);
  List<String> availableLanguages = List<String>.from(
      testData["tests"]["language_tests"].map((x) => x["language"]).toList());

  if (arguments.isEmpty) {
    print(
        "Choose the language you would like to run the demo in with 'dart scripts/prepare_demo.dart [language]'.\n"
        "Available languages are ${availableLanguages.join(", ")}.");
    exit(1);
  }

  String language = arguments[0];
  String suffix = (language == "en") ? "" : "_$language";
  if (!availableLanguages.contains(language)) {
    print("'$language' is not an available demo language.\n"
        "Available languages are ${availableLanguages.join(", ")}.");
    exit(1);
  }

  var modelDir = Directory(modelsPath);
  if (modelDir.existsSync()) {
    modelDir.deleteSync(recursive: true);
  }
  modelDir.createSync(recursive: true);

  var params = <String, String>{};
  params["language"] = language;

  File model = File(join(libPath, "common", "cheetah_params$suffix.pv"));
  model.copySync(join(modelDir.path, basename(model.path)));

  var encoded = json.encode(params);
  File f = File(join(assetsPath, "params.json"));
  f.writeAsStringSync(encoded);

  print("Demo is ready to run!");
}
