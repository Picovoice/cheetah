//
// Copyright 2022 Picovoice Inc.
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
  final VoiceProcessor? _voiceProcessor;
  Cheetah? _cheetah;

  final TranscriptCallback _transcriptCallback;
  final ProcessErrorCallback _processErrorCallback;
  RemoveListener? _removeVoiceProcessorListener;
  RemoveListener? _removeErrorListener;

  static Future<CheetahManager> create(
      String accessKey,
      String modelPath,
      TranscriptCallback transcriptCallback,
      ProcessErrorCallback processErrorCallback) async {
    Cheetah cheetah = await Cheetah.create(accessKey, modelPath,
        enableAutomaticPunctuation: true);
    return CheetahManager._(cheetah, transcriptCallback, processErrorCallback);
  }

  CheetahManager._(
      this._cheetah, this._transcriptCallback, this._processErrorCallback)
      : _voiceProcessor = VoiceProcessor.getVoiceProcessor(
            _cheetah!.frameLength, _cheetah.sampleRate) {
    if (_voiceProcessor == null) {
      throw CheetahRuntimeException("flutter_voice_processor not available.");
    }
    _removeVoiceProcessorListener =
        _voiceProcessor!.addListener((buffer) async {
      List<int> cheetahFrame;
      try {
        cheetahFrame = (buffer as List<dynamic>).cast<int>();
      } on Error {
        CheetahException castError = CheetahException(
            "flutter_voice_processor sent an unexpected data type.");
        _processErrorCallback(castError);
        return;
      }

      if (_cheetah == null) {
        throw CheetahInvalidStateException(
            "Cannot process with Cheetah - resources have already been released");
      }

      try {
        CheetahTranscript partialResult = await _cheetah!.process(cheetahFrame);

        if (partialResult.isEndpoint) {
          CheetahTranscript remainingResult = await _cheetah!.flush();
          var finalTranscript =
              partialResult.transcript + remainingResult.transcript;
          if (remainingResult.transcript.isNotEmpty) {
            finalTranscript += " ";
          }
          _transcriptCallback(finalTranscript);
        } else {
          _transcriptCallback(partialResult.transcript);
        }
      } on CheetahException catch (error) {
        _processErrorCallback(error);
      }
    });

    _removeErrorListener = _voiceProcessor!.addErrorListener((errorMsg) {
      CheetahException nativeError = CheetahException(errorMsg as String);
      _processErrorCallback(nativeError);
    });
  }

  Future<void> startProcess() async {
    if (_cheetah == null || _voiceProcessor == null) {
      throw CheetahInvalidStateException(
          "Cannot start Cheetah - resources have already been released");
    }

    if (await _voiceProcessor?.hasRecordAudioPermission() ?? false) {
      try {
        await _voiceProcessor!.start();
      } on PlatformException {
        throw CheetahRuntimeException(
            "Audio engine failed to start. Hardware may not be supported.");
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

    if (_voiceProcessor?.isRecording ?? false) {
      await _voiceProcessor!.stop();

      CheetahTranscript cheetahTranscript = await _cheetah!.flush();
      _transcriptCallback((cheetahTranscript.transcript) + " ");
    }
  }

  Future<void> delete() async {
    if (_voiceProcessor?.isRecording ?? false) {
      await _voiceProcessor!.stop();
    }
    _removeVoiceProcessorListener?.call();
    _removeErrorListener?.call();
    _cheetah?.delete();
    _cheetah = null;
  }
}
