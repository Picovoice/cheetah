#! /usr/bin/env node
//
// Copyright 2020-2026 Picovoice Inc.
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
const fs = require("fs");

const WaveFile = require("wavefile").WaveFile;

const { Cheetah, getInt16Frames, checkWaveFile } = require("@picovoice/cheetah-node");

program
  .option(
    "-a, --access_key <string>",
    "AccessKey obtain from the Picovoice Console (https://console.picovoice.ai/)"
  )
  .option(
    "-i, --input_audio_file_path <string>",
    "input wav file"
  )
  .option(
    "-y, --device <string>",
    "Device to run inference on (`best`, `cpu:{num_threads}`, `gpu:{gpu_index}`). Default: selects best device for inference device")
  .option(
    "-l, --library_file_path <string>",
    "absolute path to cheetah dynamic library"
  )
  .option("-m, --model_file_path <string>", "absolute path to cheetah model")
  .option("-p, --disable_automatic_punctuation", "disable automatic punctuation")
  .option("-n, --disable_text_normalization", "disable text normalization")
  .option("-v, --verbose", "verbose mode, prints metadata")
  .option(
    "-z, --show_inference_devices",
    "Print devices that are available to run Cheetah inference.",
    false);

if (process.argv.length < 2) {
  program.help();
}
program.parse(process.argv);

function fileDemo() {
  let audioPath = program["input_audio_file_path"];
  let accessKey = program["access_key"]
  let libraryFilePath = program["library_file_path"];
  let modelFilePath = program["model_file_path"];
  let device = program["device"];
  let disableAutomaticPunctuation = program["disable_automatic_punctuation"];
  let disableTextNormalization = program["disable_text_normalization"];
  let verbose = program["verbose"];

  const showInferenceDevices = program["show_inference_devices"];
  if (showInferenceDevices) {
    console.log(Cheetah.listAvailableDevices().join('\n'));
    process.exit();
  }

  if (accessKey === undefined || audioPath === undefined) {
    console.error(
      "`--access_key` and `--input_audio_file_path` are required arguments"
    );
    return;
  }

  let engineInstance = new Cheetah(
    accessKey,
    {
      modelPath: modelFilePath,
      device: device,
      libraryPath: libraryFilePath,
      endpointDurationSec: 0.4,
      enableAutomaticPunctuation: !disableAutomaticPunctuation,
      enableTextNormalization: !disableTextNormalization
    });

  if (!fs.existsSync(audioPath)) {
    console.error(`--input_audio_file_path file not found: ${audioPath}`);
    return;
  }

  let waveBuffer = fs.readFileSync(audioPath);
  let inputWaveFile;
  try {
    inputWaveFile = new WaveFile(waveBuffer);
  } catch (error) {
    console.error(`Exception trying to read file as wave format: ${audioPath}`);
    console.error(error);
    return;
  }

  if (!checkWaveFile(inputWaveFile, engineInstance.sampleRate)) {
    console.error(
      "Audio file did not meet requirements. Wave file must be 16KHz, 16-bit, linear PCM (mono)."
    );
  }

  let frames = getInt16Frames(inputWaveFile, engineInstance.frameLength);

  if (verbose) {
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

    logRow("word", "startSeconds", "endSeconds", "confidence");
    process.stdout.write("-".repeat(COLUMN_A + COLUMN_B + COLUMN_C + COLUMN_D));
    process.stdout.write("\n");

    for (const frame of frames) {
      const { words: words } = engineInstance.processAnnotated(frame);
      for (const word of words) {
        logRow(
          word.word,
          `${word.startSeconds.toFixed(4)}`,
          `${word.endSeconds.toFixed(4)}`,
          `${(100 * word.confidence).toFixed(1)}%`
        );
      }
    }

    const { words: words } = engineInstance.flushAnnotated();
    for (const word of words) {
      logRow(
        word.word,
        `${word.startSeconds.toFixed(4)}`,
        `${word.endSeconds.toFixed(4)}`,
        `${(100 * word.confidence).toFixed(1)}%`
      );
    }
  } else {
    let transcript= '';
    for (const frame of frames) {
      const [ partialTranscript ] = engineInstance.process(frame);
      transcript += partialTranscript;
    }

    const extraTranscript = engineInstance.flush();
    transcript += extraTranscript;
    console.log(transcript);
  }

  engineInstance.release();
}

fileDemo();
