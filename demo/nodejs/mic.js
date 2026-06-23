#! /usr/bin/env node
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
"use strict";

const { program } = require("commander");
const readline = require("readline");

const { PvRecorder } = require("@picovoice/pvrecorder-node");

const { Cheetah, CheetahActivationLimitReachedError } = require("@picovoice/cheetah-node");

program
  .option(
    "-a, --access_key <string>",
    "AccessKey obtain from the Picovoice Console (https://console.picovoice.ai/)"
  )
  .option(
    "-l, --library_file_path <string>",
    "absolute path to cheetah dynamic library"
  )
  .option("-m, --model_file_path <string>", "absolute path to cheetah model")
  .option(
    "-y, --device <string>",
    "Device to run inference on (`best`, `cpu:{num_threads}`, `gpu:{gpu_index}`). Default: selects best device for inference device")
  .option(
    "-i, --audio_device_index <number>",
    "index of audio device to use to record audio",
    Number,
    -1
  )
  .option(
    "-e, --endpoint_duration_sec <number>",
    "Duration of endpoint in seconds",
    Number,
    3
  )
  .option("-s, --show_audio_devices", "show the list of available devices")
  .option("-p, --disable_automatic_punctuation", "disable automatic punctuation")
  .option("-n, --disable_text_normalization", "disable text normalization")
  .option("-v, --verbose", "verbose mode, prints metadata")
  .option(
      "-z, --show_inference_devices",
      "Print devices that are available to run Porcupine inference.",
      false);;

if (process.argv.length < 1) {
  program.help();
}
program.parse(process.argv);

let isInterrupted = false;

async function micDemo() {
  let accessKey = program["access_key"];
  let libraryFilePath = program["library_file_path"];
  let modelFilePath = program["model_file_path"];
  let device = program["device"];
  let audioDeviceIndex = program["audio_device_index"];
  let endpointDurationSec = program["endpoint_duration_sec"];
  let showAudioDevices = program["show_audio_devices"];
  let disableAutomaticPunctuation = program["disable_automatic_punctuation"];
  let disableTextNormalization = program["disable_text_normalization"];
  let verbose = program["verbose"];

  let showAudioDevicesDefined = showAudioDevices !== undefined;

  const showInferenceDevices = program["show_inference_devices"];
  if (showInferenceDevices) {
    console.log(Porcupine.listAvailableDevices().join('\n'));
    process.exit();
  }

  if (showAudioDevicesDefined) {
    const devices = PvRecorder.getAvailableDevices();
    for (let i = 0; i < devices.length; i++) {
      console.log(`index: ${i}, device name: ${devices[i]}`);
    }
    process.exit();
  }

  if (accessKey === undefined) {
    console.log("No AccessKey provided");
    process.exit();
  }

  let engineInstance = new Cheetah(
    accessKey,
    {
      modelPath: modelFilePath,
      device: device,
      libraryPath: libraryFilePath,
      endpointDurationSec: endpointDurationSec,
      enableAutomaticPunctuation: !disableAutomaticPunctuation,
      enableTextNormalization: !disableTextNormalization
    });

  const recorder = new PvRecorder(engineInstance.frameLength, audioDeviceIndex);
  recorder.start();

  console.log(`Using device: ${recorder.getSelectedDevice()}`);

  console.log(
    "Listening... Press `ENTER` to stop:"
  );

  readline.emitKeypressEvents(process.stdin);
  process.stdin.setRawMode(true);

  process.stdin.on("keypress", (key, str) => {
    if (str.sequence === '\r' || str.sequence === '\n') {
      isInterrupted = true;
    }
  });

  const COLUMN_A = 22;
  const COLUMN_B = "startSeconds".length + 2;
  const COLUMN_C = "endSeconds".length + 2;
  const COLUMN_D = "confidence".length + 2;
  const logRow = (a, b, c, d) => {
    process.stdout.write(a.slice(0, COLUMN_A));
    process.stdout.write(" ".repeat(COLUMN_A - a.length));
    process.stdout.write(b.slice(0, COLUMN_B));
    process.stdout.write(" ".repeat(COLUMN_B - b.length));
    process.stdout.write(c.slice(0, COLUMN_C));
    process.stdout.write(" ".repeat(COLUMN_C - c.length));
    process.stdout.write(d.slice(0, COLUMN_D));
    process.stdout.write(" ".repeat(COLUMN_D - d.length));
    process.stdout.write("\n");
  };

  if (verbose) {
    logRow("word", "startSeconds", "endSeconds", "confidence");
    process.stdout.write("-".repeat(COLUMN_A + COLUMN_B + COLUMN_C + COLUMN_D));
    process.stdout.write("\n");
  }

  const processFrame = pcm => {
    if (verbose) {
      const { words: words, isEndpoint: isEndpoint } = engineInstance.processAnnotated(pcm);
      for (const word of words) {
        logRow(
          word.word,
          `${word.startSeconds.toFixed(4)}`,
          `${word.endSeconds.toFixed(4)}`,
          `${(100 * word.confidence).toFixed(1)}%`
        );
      }

      if (isEndpoint === true) {
        const { words: extraWords } = engineInstance.flushAnnotated();
        for (const word of extraWords) {
          logRow(
            word.word,
            `${word.startSeconds.toFixed(4)}`,
            `${word.endSeconds.toFixed(4)}`,
            `${(100 * word.confidence).toFixed(1)}%`
          );
        }
      }
    } else {
      const [partialTranscript, isEndpoint] = engineInstance.process(pcm);
      process.stdout.write(partialTranscript);
      if (isEndpoint === true) {
        const finalTranscript = engineInstance.flush();
        process.stdout.write(`${finalTranscript}\n`);
      }
    }
  }

  while (!isInterrupted) {
    const pcm = await recorder.read();
    try {
      processFrame(pcm);
    } catch (err) {
      if (err instanceof CheetahActivationLimitReachedError) {
        console.error(`AccessKey '${accessKey}' has reached it's processing limit.`);
      } else {
        console.error(err);
      }
      isInterrupted = true;
    }
  }

  recorder.stop();
  recorder.release();
  engineInstance.release();
  process.exit();
}

micDemo();
