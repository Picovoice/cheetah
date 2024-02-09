//
// Copyright 2022-2024 Picovoice Inc.
//
// You may not use this file except in compliance with the license. A copy of the license is located in the "LICENSE"
// file accompanying this source.
//
// Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on
// an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the
// specific language governing permissions and limitations under the License.
//

import 'dart:async';
import 'dart:io';

import 'package:flutter/services.dart';
import 'package:path_provider/path_provider.dart';
import 'package:cheetah_flutter/cheetah_error.dart';

enum _NativeFunctions {
  // ignore:constant_identifier_names
  CREATE,
  // ignore:constant_identifier_names
  PROCESS,
  // ignore:constant_identifier_names
  FLUSH,
  // ignore:constant_identifier_names
  DELETE
}

class CheetahTranscript {
  final String? _transcript;
  final bool? _isEndpoint;

  CheetahTranscript(this._transcript, this._isEndpoint);

  String get transcript => _transcript ?? "";

  bool get isEndpoint => _isEndpoint ?? false;
}

class Cheetah {
  static final MethodChannel _channel = MethodChannel("cheetah");

  String? _handle;
  final int _frameLength;
  final int _sampleRate;
  final String _version;

  /// Cheetah version string
  String get version => _version;

  /// The number of audio samples per frame required by Cheetah
  int get frameLength => _frameLength;

  /// The audio sample rate required by Cheetah
  int get sampleRate => _sampleRate;

  /// Static creator for initializing Cheetah
  ///
  /// [accessKey] AccessKey obtained from Picovoice Console (https://console.picovoice.ai/).
  ///
  /// [modelPath] Path to the file containing model parameters.
  ///
  /// [endpointDuration] (Optional) Duration of endpoint in seconds. A speech endpoint is detected when there is a
  ///                               chunk of audio (with a duration specified herein) after an utterance without
  ///                               any speech in it. Set duration to 0 to disable this. Default is 1 second.
  /// [enableAutomaticPunctuation] (Optional) Set to `true` to enable automatic punctuation insertion.
  ///
  /// Throws a `CheetahException` if not initialized correctly
  ///
  /// returns an instance of the Cheetah Speech-to-Text engine
  static Future<Cheetah> create(String accessKey, String modelPath,
      {double endpointDuration = 1, enableAutomaticPunctuation = false}) async {
    modelPath = await _tryExtractFlutterAsset(modelPath);

    try {
      Map<String, dynamic> result = Map<String, dynamic>.from(
          await _channel.invokeMethod(_NativeFunctions.CREATE.name, {
        'accessKey': accessKey,
        'modelPath': modelPath,
        'endpointDuration': endpointDuration,
        'enableAutomaticPunctuation': enableAutomaticPunctuation
      }));

      return Cheetah._(result['handle'], result['frameLength'],
          result['sampleRate'], result['version']);
    } on PlatformException catch (error) {
      throw cheetahStatusToException(error.code, error.message);
    } on Exception catch (error) {
      throw CheetahException(error.toString());
    }
  }

  // private constructor
  Cheetah._(this._handle, this._frameLength, this._sampleRate, this._version);

  /// Process a frame of pcm audio with the speech-to-text engine.
  ///
  /// [frame] frame of 16-bit integers of 16kHz linear PCM mono audio.
  /// The specific array length is obtained from Cheetah via the frameLength field.
  ///
  /// returns CheetahTranscript object.
  Future<CheetahTranscript> process(List<int>? frame) async {
    try {
      Map<String, dynamic> transcript = Map<String, dynamic>.from(await _channel
          .invokeMethod(_NativeFunctions.PROCESS.name,
              {'handle': _handle, 'frame': frame}));

      if (transcript['transcript'] == null) {
        throw CheetahInvalidStateException(
            "field 'transcript' must be always present");
      }

      return CheetahTranscript(
          transcript['transcript'], transcript['isEndpoint']);
    } on PlatformException catch (error) {
      throw cheetahStatusToException(error.code, error.message);
    } on Exception catch (error) {
      throw CheetahException(error.toString());
    }
  }

  /// Processes any remaining audio data and returns its transcription.
  ///
  /// returns CheetahTranscript object.
  Future<CheetahTranscript> flush() async {
    try {
      Map<String, dynamic> transcript = Map<String, dynamic>.from(await _channel
          .invokeMethod(_NativeFunctions.FLUSH.name, {'handle': _handle}));

      if (transcript['transcript'] == null) {
        throw CheetahInvalidStateException(
            "field 'transcript' must be always present");
      }

      return CheetahTranscript(transcript['transcript'], null);
    } on PlatformException catch (error) {
      throw cheetahStatusToException(error.code, error.message);
    } on Exception catch (error) {
      throw CheetahException(error.toString());
    }
  }

  /// Frees memory that was allocated for Cheetah
  Future<void> delete() async {
    if (_handle != null) {
      await _channel
          .invokeMethod(_NativeFunctions.DELETE.name, {'handle': _handle});
      _handle = null;
    }
  }

  static Future<String> _tryExtractFlutterAsset(String filePath) async {
    ByteData data;
    try {
      data = await rootBundle.load(filePath);
    } catch (_) {
      // In flutter, a resource can be added through flutter's assets directory
      // or natively (res for android; bundle for iOS). We try to extract
      // a resource in flutter's assets directory and if it fails, try to load
      // the resource using native modules.
      return filePath;
    }

    try {
      String resourceDirectory =
          (await getApplicationDocumentsDirectory()).path;
      String outputPath = '$resourceDirectory/$filePath';
      File outputFile = File(outputPath);
      final buffer = data.buffer;

      await outputFile.create(recursive: true);
      await outputFile.writeAsBytes(
          buffer.asUint8List(data.offsetInBytes, data.lengthInBytes));
      return outputPath;
    } catch (_) {
      throw CheetahIOException("failed to extract '$filePath'");
    }
  }
}
