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
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_voice_processor/flutter_voice_processor.dart';
import 'package:cheetah_flutter/cheetah.dart';
import 'package:cheetah_flutter/cheetah_error.dart';

void main() {
  runApp(MyApp());
}

class MyApp extends StatefulWidget {
  @override
  _MyAppState createState() => _MyAppState();
}

class _MyAppState extends State<MyApp> {
  final String accessKey = '{YOUR_ACCESS_KEY_HERE}'; // AccessKey obtained from Picovoice Console (https://picovoice.ai/console/)

  final GlobalKey<ScaffoldState> _scaffoldKey = GlobalKey<ScaffoldState>();

  bool isError = false;
  String errorMessage = "";

  bool isProcessing = false;
  String transcriptText = "";
  CheetahManager? _cheetahManager;

  ScrollController _controller = ScrollController();

  @override
  void initState() {
    super.initState();
    setState(() {
      transcriptText = "";
    });

    initCheetah();
  }

  Future<void> initCheetah() async {
    String platform = Platform.isAndroid
        ? "android"
        : Platform.isIOS
            ? "ios"
            : throw CheetahRuntimeException(
                "This demo supports iOS and Android only.");
    String modelPath = "assets/contexts/$platform/cheetah_params.pv";

    try {
      _cheetahManager = await CheetahManager.create(accessKey, modelPath, transcriptCallback, errorCallback);
    } on CheetahInvalidArgumentException catch (ex) {
      errorCallback(CheetahInvalidArgumentException(
          "${ex.message}\nEnsure your accessKey '$accessKey' is a valid access key."));
    } on CheetahActivationException {
      errorCallback(CheetahActivationException("AccessKey activation error."));
    } on CheetahActivationLimitException {
      errorCallback(
          CheetahActivationLimitException("AccessKey reached its device limit."));
    } on CheetahActivationRefusedException {
      errorCallback(CheetahActivationRefusedException("AccessKey refused."));
    } on CheetahActivationThrottledException {
      errorCallback(
          CheetahActivationThrottledException("AccessKey has been throttled."));
    } on CheetahException catch (ex) {
      errorCallback(ex);
    }
  }

  void transcriptCallback(String transcript) {
    bool shouldScroll = _controller.position.pixels == _controller.position.maxScrollExtent;

    setState(() {
      transcriptText = transcriptText + transcript;
    });

    WidgetsBinding.instance?.addPostFrameCallback((_) {
      if (shouldScroll && !_controller.position.atEdge) {
        _controller.jumpTo(_controller.position.maxScrollExtent);
      }
    });
  }

  void errorCallback(CheetahException error) {
    setState(() {
      isError = true;
      errorMessage = error.message!;
    });
  }

  Future<void> _startProcessing() async {
    if (isProcessing) {
      return;
    }

    try {
      await _cheetahManager!.startProcess();
      setState(() {
        isProcessing = true;
      });
    } on CheetahException catch (ex) {
      print("Failed to start audio capture: ${ex.message}");
    }
  }

  Future<void> _stopProcessing() async {
    if (!isProcessing) {
      return;
    }

    try {
      await _cheetahManager!.stopProcess();
      setState(() {
        isProcessing = false;
      });
    } on CheetahException catch (ex) {
      print("Failed to start audio capture: ${ex.message}");
    }
  }

  Color picoBlue = Color.fromRGBO(55, 125, 255, 1);
  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      home: Scaffold(
        key: _scaffoldKey,
        appBar: AppBar(
          title: const Text('Cheetah Demo'),
          backgroundColor: picoBlue,
        ),
        body: Column(
          children: [
            buildCheetahTextArea(context),
            buildErrorMessage(context),
            buildStartButton(context),
            footer
          ],
        ),
      ),
    );
  }

  buildStartButton(BuildContext context) {
    final ButtonStyle buttonStyle = ElevatedButton.styleFrom(
        primary: picoBlue,
        shape: CircleBorder(),
        textStyle: TextStyle(color: Colors.white));

    return Expanded(
      flex: 2,
      child: Container(
          child: SizedBox(
              width: 130,
              height: 130,
              child: ElevatedButton(
                style: buttonStyle,
                onPressed:
                    (isProcessing) ? _stopProcessing : _startProcessing,
                child: Text(isProcessing ? "Stop" : "Start",
                    style: TextStyle(fontSize: 30)),
              ))),
    );
  }

  buildCheetahTextArea(BuildContext context) {
    return Expanded(
        flex: 6,
        child: Container(
          alignment: Alignment.topCenter,
          color: Color(0xff25187e),
          margin: EdgeInsets.all(10),
          child: SingleChildScrollView(
            controller: _controller,
            scrollDirection: Axis.vertical,
            padding: EdgeInsets.all(10),
            physics: RangeMaintainingScrollPhysics(),
            child: Align(
              alignment: Alignment.topLeft,
              child: Text(
                transcriptText,
                textAlign: TextAlign.left,
                style: TextStyle(color: Colors.white, fontSize: 20),
              )
            )
          )
        )
      );
  }

  buildErrorMessage(BuildContext context) {
    return Expanded(
        flex: isError ? 2 : 0,
        child: Container(
            alignment: Alignment.center,
            margin: EdgeInsets.only(left: 20, right: 20),
            padding: EdgeInsets.all(5),
            decoration: !isError
                ? null
                : BoxDecoration(
                    color: Colors.red, borderRadius: BorderRadius.circular(5)),
            child: !isError
                ? null
                : Text(
                    errorMessage,
                    style: TextStyle(color: Colors.white, fontSize: 18),
                  )));
  }

  Widget footer = Expanded(
      flex: 1,
      child: Container(
          alignment: Alignment.bottomCenter,
          padding: EdgeInsets.only(bottom: 20),
          child: const Text(
            "Made in Vancouver, Canada by Picovoice",
            style: TextStyle(color: Color(0xff666666)),
          )));
}

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
      String accessKey, String modelPath, TranscriptCallback transcriptCallback, ProcessErrorCallback processErrorCallback) async {
    Cheetah cheetah = await Cheetah.create(accessKey, modelPath);
    return CheetahManager._(cheetah, transcriptCallback, processErrorCallback);
  }

  CheetahManager._(this._cheetah, this._transcriptCallback, this._processErrorCallback)
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

      try {
        CheetahTranscript? cheetahTranscript = await _cheetah?.process(cheetahFrame);
        _transcriptCallback(cheetahTranscript?.transcript ?? "");

        if (cheetahTranscript?.isEndpoint ?? false) {
          CheetahTranscript? cheetahTranscript = await _cheetah?.flush();
          _transcriptCallback(" " + (cheetahTranscript?.transcript ?? "") + " ");
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

      CheetahTranscript? cheetahTranscript = await _cheetah?.flush();
      _transcriptCallback((cheetahTranscript?.transcript ?? "") + " ");
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
