//
// Copyright 2022-2026 Picovoice Inc.
//
// You may not use this file except in compliance with the license. A copy of the license is located in the "LICENSE"
// file accompanying this source.
//
// Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on
// an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the
// specific language governing permissions and limitations under the License.
//

import 'dart:async';
import 'dart:convert';

import 'package:cheetah_flutter/cheetah.dart';
import 'package:cheetah_demo/cheetah_manager.dart';
import 'package:cheetah_flutter/cheetah_error.dart';
import 'package:flutter/material.dart';

void main() {
  runApp(MyApp());
}

class MyApp extends StatefulWidget {
  const MyApp({super.key});

  @override
  MyAppState createState() => MyAppState();
}

class MyAppState extends State<MyApp> {
  final String accessKey =
      '{YOUR_ACCESS_KEY_HERE}'; // AccessKey obtained from Picovoice Console (https://console.picovoice.ai/)
  final String device = 'cpu';

  final GlobalKey<ScaffoldState> _scaffoldKey = GlobalKey<ScaffoldState>();

  bool isError = false;
  String errorMessage = "";

  bool isProcessing = false;
  String transcriptText = "";
  List<CheetahWord> words = [];
  CheetahManager? _cheetahManager;

  final ScrollController _controller = ScrollController();
  final ScrollController _wordController = ScrollController();

  @override
  void initState() {
    super.initState();
    setState(() {
      transcriptText = "";
      words = [];
    });

    initCheetah();
  }

  Future<void> initCheetah() async {
    String language = "";
    try {
      final paramsString = await DefaultAssetBundle.of(
        context,
      ).loadString('assets/params.json');
      final params = json.decode(paramsString);

      language = params["language"];
    } catch (_) {
      errorCallback(
        CheetahException(
          "Could not find `params.json`. Ensure 'prepare_demo.dart' script was run before launching the demo.",
        ),
      );
      return;
    }

    String suffix = language != "en" ? "_$language" : "";
    final String modelPath = "assets/models/cheetah_params$suffix.pv";

    try {
      _cheetahManager = await CheetahManager.create(
        accessKey,
        modelPath,
        device,
        transcriptCallback,
        errorCallback,
      );
    } on CheetahActivationException {
      errorCallback(CheetahActivationException("AccessKey activation error."));
    } on CheetahActivationLimitException {
      errorCallback(
        CheetahActivationLimitException("AccessKey reached its device limit."),
      );
    } on CheetahActivationRefusedException {
      errorCallback(CheetahActivationRefusedException("AccessKey refused."));
    } on CheetahActivationThrottledException {
      errorCallback(
        CheetahActivationThrottledException("AccessKey has been throttled."),
      );
    } on CheetahException catch (ex) {
      errorCallback(ex);
    }
  }

  void _scrollToBottom(ScrollController controller) {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      controller.animateTo(
        controller.position.maxScrollExtent,
        duration: Duration(milliseconds: 300),
        curve: Curves.easeOut,
      );
    });
  }

  void transcriptCallback(String additionalTranscript, List<CheetahWord> additionalWords) {
    setState(() {
      transcriptText += additionalTranscript;
      words.addAll(additionalWords);
    });

    if (additionalTranscript.length > 0) {
      _scrollToBottom(_controller);
    }

    if (additionalWords.length > 0) {
      _scrollToBottom(_wordController);
    }
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
        transcriptText = "";
        words = [];
        isProcessing = true;
      });
    } on CheetahException catch (ex) {
      errorCallback(ex);
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
      errorCallback(ex);
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
            buildCheetahWordArea(context),
            buildErrorMessage(context),
            buildStartButton(context),
            footer,
          ],
        ),
      ),
    );
  }

  buildStartButton(BuildContext context) {
    final ButtonStyle buttonStyle = ElevatedButton.styleFrom(
      backgroundColor: picoBlue,
      shape: BeveledRectangleBorder(),
      foregroundColor: Colors.white,
    );

    return Expanded(
      flex: 1,
      child: SizedBox(
        width: 130,
        height: 65,
        child: ElevatedButton(
          style: buttonStyle,
          onPressed: isError
              ? null
              : isProcessing
              ? _stopProcessing
              : _startProcessing,
          child: Text(
            isProcessing ? "Stop" : "Start",
            style: TextStyle(fontSize: 30),
          ),
        ),
      ),
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
            ),
          ),
        ),
      ),
    );
  }

  buildCheetahWordArea(BuildContext context) {
    List<TableRow> tableRows = words.map<TableRow>((word) {
      return TableRow(
        children: [
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(word.word, style: TextStyle(color: Colors.white)),
            ],
          ),
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(
                '${word.startSeconds.toStringAsFixed(2)}s',
                style: TextStyle(color: Colors.white),
              ),
            ],
          ),
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(
                '${word.endSeconds.toStringAsFixed(2)}s',
                style: TextStyle(color: Colors.white),
              ),
            ],
          ),
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(
                '${(word.confidence * 100).toStringAsFixed(0)}%',
                style: TextStyle(color: Colors.white),
              ),
            ],
          ),
        ],
      );
    }).toList();

    return Expanded(
      flex: 4,
      child: Container(
        color: Color(0xff25187e),
        alignment: Alignment.topCenter,
        margin: EdgeInsets.all(10),
        child: Column(
          children: [
            Container(
              color: Colors.white,
              padding: EdgeInsets.only(bottom: 5, top: 5),
              child: Table(
                children: [
                  TableRow(
                    children: [
                      Column(
                        children: [Text("Word")]
                      ),
                      Column(
                        children: [Text("Start")]
                      ),
                      Column(
                        children: [Text("End")]
                      ),
                      Column(
                        children: [Text("Confidence")]
                      ),
                    ],
                  ),
                ],
              ),
            ),
            Flexible(
              child: SingleChildScrollView(
                controller: _wordController,
                scrollDirection: Axis.vertical,
                padding: EdgeInsets.all(10),
                physics: RangeMaintainingScrollPhysics(),
                child: Table(children: tableRows),
              ),
            ),
          ],
        ),
      ),
    );
  }

  buildErrorMessage(BuildContext context) {
    return Expanded(
      flex: isError ? 4 : 0,
      child: Container(
        alignment: Alignment.center,
        margin: EdgeInsets.only(left: 20, right: 20),
        padding: EdgeInsets.all(5),
        decoration: !isError
            ? null
            : BoxDecoration(
                color: Colors.red,
                borderRadius: BorderRadius.circular(5),
              ),
        child: !isError
            ? null
            : Text(
                errorMessage,
                style: TextStyle(color: Colors.white, fontSize: 18),
              ),
      ),
    );
  }

  Widget footer = Expanded(
    flex: 1,
    child: Container(
      alignment: Alignment.bottomCenter,
      padding: EdgeInsets.only(bottom: 20),
      child: const Text(
        "Made in Vancouver, Canada by Picovoice",
        style: TextStyle(color: Color(0xff666666)),
      ),
    ),
  );
}
