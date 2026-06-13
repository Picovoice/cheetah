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
  .option("-c, --word_confidence", "display word confidences inline")
  .option(
    "-z, --show_inference_devices",
    "Print devices that are available to run Cheetah inference.",
    false);

if (process.argv.length < 2) {
  program.help();
}
program.parse(process.argv);

function amendTranscript(transcript, words) {
  let i = 0;
  let outputTranscript = "";
  for (const word of words) {
    let foundIndex = transcript.slice(i).indexOf(word.word);
    outputTranscript += transcript.slice(i, i+foundIndex);
    outputTranscript += `${word.word} (${(word.confidence * 100).toFixed(0)}%)`;
    i += foundIndex + word.word.length;
  }
  return outputTranscript;
}

function fileDemo() {
  let audioPath = program["input_audio_file_path"];
  let accessKey = program["access_key"]
  let libraryFilePath = program["library_file_path"];
  let modelFilePath = program["model_file_path"];
  let device = program["device"];
  let disableAutomaticPunctuation = program["disable_automatic_punctuation"];
  let disableTextNormalization = program["disable_text_normalization"];
  let wordConfidence = program["word_confidence"];

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

  let transcript= '';
  for (const frame of frames) {
    const {
      transcript: partialTranscript,
      words: partialWords
    } = engineInstance.process(frame);
    transcript += wordConfidence ? amendTranscript(partialTranscript, partialWords) : partialTranscript;
  }

  const {
    transcript: extraTranscript,
    words: extraWords
  } = engineInstance.flush();
  transcript += wordConfidence ? amendTranscript(extraTranscript, extraWords) : extraTranscript;
  console.log(transcript);

  engineInstance.release();
}

fileDemo();
