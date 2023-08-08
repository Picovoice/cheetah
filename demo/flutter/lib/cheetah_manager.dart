//
// Copyright 2022-2023 Picovoice Inc.
//
// You may not use this file except in compliance with the license. A copy of the license is located in the "LICENSE"
// file accompanying this source.
//
// Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on
// an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the
// specific language governing permissions and limitations under the License.
//

import 'dart:async';
import 'package:cheetah_flutter/cheetah.dart';
import 'package:cheetah_flutter/cheetah_error.dart';
import 'package:flutter_voice_processor/flutter_voice_processor.dart';
import 'package:flutter/services.dart';

typedef TranscriptCallback = Function(String transcript);

typedef ProcessErrorCallback = Function(CheetahException error);

class CheetahManager {
  VoiceProcessor? _voiceProcessor;
  Cheetah? _cheetah;

  final TranscriptCallback _transcriptCallback;

  static Future<CheetahManager> create(
      String accessKey,
      String modelPath,
      TranscriptCallback transcriptCallback,
      ProcessErrorCallback processErrorCallback) async {
    Cheetah cheetah = await Cheetah.create(accessKey, modelPath,
        enableAutomaticPunctuation: true);
    return CheetahManager._(cheetah, transcriptCallback, processErrorCallback);
  }

  CheetahManager._(this._cheetah, this._transcriptCallback,
      ProcessErrorCallback processErrorCallback)
      : _voiceProcessor = VoiceProcessor.instance {
    _voiceProcessor?.addFrameListener((List<int> frame) async {
      if (!(await _voiceProcessor?.isRecording() ?? false)) {
        return;
      }
      if (_cheetah == null) {
        processErrorCallback(CheetahInvalidStateException(
            "Cannot process with Cheetah - resources have already been released"));
        return;
      }

      try {
        CheetahTranscript partialResult = await _cheetah!.process(frame);

        if (partialResult.isEndpoint) {
          CheetahTranscript remainingResult = await _cheetah!.flush();
          String finalTranscript =
              partialResult.transcript + remainingResult.transcript;
          if (remainingResult.transcript.isNotEmpty) {
            finalTranscript += " ";
          }
          _transcriptCallback(finalTranscript);
        } else {
          _transcriptCallback(partialResult.transcript);
        }
      } on CheetahException catch (error) {
        processErrorCallback(error);
      }
    });

    _voiceProcessor?.addErrorListener((VoiceProcessorException error) {
      processErrorCallback(CheetahException(error.message));
    });
  }

  Future<void> startProcess() async {
    if (await _voiceProcessor?.isRecording() ?? false) {
      return;
    }

    if (_cheetah == null || _voiceProcessor == null) {
      throw CheetahInvalidStateException(
          "Cannot start Cheetah - resources have already been released");
    }

    if (await _voiceProcessor?.hasRecordAudioPermission() ?? false) {
      try {
        await _voiceProcessor?.start(
            _cheetah!.frameLength, _cheetah!.sampleRate);
      } on PlatformException catch (e) {
        throw CheetahRuntimeException(
            "Failed to start audio recording: ${e.message}");
      }
    } else {
      throw CheetahRuntimeException(
          "User did not give permission to record audio.");
    }
  }

  Future<void> stopProcess() async {
    if (_cheetah == null || _voiceProcessor == null) {
      throw CheetahInvalidStateException(
          "Cannot start Cheetah - resources have already been released");
    }

    if (await _voiceProcessor?.isRecording() ?? false) {
      try {
        await _voiceProcessor?.stop();
      } on PlatformException catch (e) {
        throw CheetahRuntimeException(
            "Failed to stop audio recording: ${e.message}");
      }

      CheetahTranscript cheetahTranscript = await _cheetah!.flush();
      _transcriptCallback((cheetahTranscript.transcript) + " ");
    }
  }

  Future<void> delete() async {
    await stopProcess();
    _voiceProcessor = null;

    _cheetah?.delete();
    _cheetah = null;
  }
}
