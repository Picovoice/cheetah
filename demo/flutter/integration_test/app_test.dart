import 'dart:convert';
import 'dart:math';
import 'dart:typed_data';

import 'package:flutter/services.dart' show rootBundle;
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';

import 'package:cheetah_flutter/cheetah.dart';
import 'package:cheetah_flutter/cheetah_error.dart';

void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();

  final String accessKey = "{TESTING_ACCESS_KEY_HERE}";

  String getModelPath(String language) {
    return "assets/test_resources/model_files/cheetah_params${language != "en" ? "_$language" : ""}.pv";
  }

  String getAudioPath(String audioFile) {
    return "assets/test_resources/audio_samples/$audioFile";
  }

  Future<List<int>> loadAudioFile(String audioFile) async {
    String audioPath = getAudioPath(audioFile);

    List<int> pcm = [];
    var audioFileData = await rootBundle.load(audioPath);
    for (int i = 44; i < audioFileData.lengthInBytes; i += 2) {
      pcm.add(audioFileData.getInt16(i, Endian.little));
    }
    return pcm;
  }

  int levenshteinDistance(String s1, String s2) {
    if (s1 == s2) {
      return 0;
    }

    if (s1.isEmpty) {
      return s2.length;
    }

    if (s2.isEmpty) {
      return s1.length;
    }

    List<int> v0 = List<int>.filled(s2.length + 1, 0);
    List<int> v1 = List<int>.filled(s2.length + 1, 0);
    List<int> vTemp;

    for (var i = 0; i < v0.length; i++) {
      v0[i] = i;
    }

    for (var i = 0; i < s1.length; i++) {
      v1[0] = i + 1;

      for (var j = 0; j < s2.length; j++) {
        int cost = 1;
        if (s1.codeUnitAt(i) == s2.codeUnitAt(j)) {
          cost = 0;
        }
        v1[j + 1] = min(v1[j] + 1, min(v0[j + 1] + 1, v0[j] + cost));
      }

      vTemp = v0;
      v0 = v1;
      v1 = vTemp;
    }

    return v0[s2.length];
  }

  double characterErrorRate(String transcript, String expectedTranscript) {
    return levenshteinDistance(transcript, expectedTranscript) /
        expectedTranscript.length;
  }

  group('Cheetah Process Tests', () {
    late dynamic testData;

    setUp(() async {
      String testDataJson =
          await rootBundle.loadString('assets/test_resources/test_data.json');
      testData = json.decode(testDataJson);
    });

    Future<void> runCheetahProcess(
        String language,
        String transcript,
        List<String> punctuations,
        bool testPunctuations,
        double errorRate,
        String audioFile) async {
      String modelPath = getModelPath(language);

      String normTranscript = transcript;
      if (!testPunctuations) {
        for (var p in punctuations) {
          normTranscript = normTranscript.replaceAll(p, "");
        }
      }

      Cheetah cheetah;
      try {
        cheetah = await Cheetah.create(accessKey, modelPath,
            enableAutomaticPunctuation: testPunctuations);
      } on CheetahException catch (ex) {
        expect(ex, equals(null),
            reason: "Failed to initialize Cheetah: $ex");
        return;
      }

      String partialTranscript = "";
      List<int> pcm = await loadAudioFile(audioFile);

      final int frameLength = cheetah.frameLength;
      for (var i = 0; i < (pcm.length - frameLength); i += frameLength) {
        CheetahTranscript res = await cheetah.process(pcm.sublist(i, i + frameLength));
        partialTranscript += res.transcript;
      }
      CheetahTranscript res = await cheetah.flush();
      partialTranscript += res.transcript;

      cheetah.delete();

      expect(characterErrorRate(partialTranscript, normTranscript),
          lessThanOrEqualTo(errorRate),
          reason: "Character error rate was incorrect");
    }

    testWidgets('Test Process all languages', (tester) async {
      for (int t = 0; t < testData['tests']['language_tests'].length; t++) {
        String language = testData['tests']['language_tests'][t]['language'];
        String transcript = testData['tests']['language_tests'][t]['transcript'];
        List<dynamic> punctuationsRaw = testData['tests']['language_tests'][t]['punctuations'];
        List<String> punctuations = punctuationsRaw.map((p) => p.toString()).toList();
        double errorRate = testData['tests']['language_tests'][t]['error_rate'];
        String audioFile = testData['tests']['language_tests'][t]['audio_file'];

        for (int p = 0; p < punctuations.length; p++) {
          transcript = transcript.replaceAll(punctuations[p], "");
        }

        await runCheetahProcess(
            language, transcript, punctuations, false, errorRate, audioFile);
      }
    });

    testWidgets('Test Process all languages with Punctuation', (tester) async {
      for (int t = 0; t < testData['tests']['language_tests'].length; t++) {
        String language = testData['tests']['language_tests'][t]['language'];
        String transcript = testData['tests']['language_tests'][t]['transcript'];
        List<dynamic> punctuationsRaw = testData['tests']['language_tests'][t]['punctuations'];
        List<String> punctuations = punctuationsRaw.map((p) => p.toString()).toList();
        double errorRate = testData['tests']['language_tests'][t]['error_rate'];
        String audioFile = testData['tests']['language_tests'][t]['audio_file'];

        await runCheetahProcess(
            language, transcript, punctuations, true, errorRate, audioFile);
      }
    });
  });
}
