#! /usr/bin/env node
//
// Copyright 2020 Picovoice Inc.
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
  .requiredOption(
    "-a, --access_key <string>",
    "AccessKey obtain from the Picovoice Console (https://console.picovoice.ai/)"
  )
  .requiredOption(
    "-i, --input_audio_file_path <string>",
    "input wav file"
  )
  .option(
    "-l, --library_file_path <string>",
    "absolute path to cheetah dynamic library"
  )
  .option("-m, --model_file_path <string>", "absolute path to cheetah model")
  .option("-d, --disable_automatic_punctuation", "disable automatic punctuation")

if (process.argv.length < 2) {
  program.help();
}
program.parse(process.argv);

function fileDemo() {
  let audioPath = program["input_audio_file_path"];
  let accessKey = program["access_key"]
  let libraryFilePath = program["library_file_path"];
  let modelFilePath = program["model_file_path"];
  let disableAutomaticPunctuation = program["disable_automatic_punctuation"];

  let engineInstance = new Cheetah(
    accessKey,
    {
      modelPath: modelFilePath,
      libraryPath: libraryFilePath,
      endpointDurationSec: 0.4,
      enableAutomaticPunctuation: !disableAutomaticPunctuation
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

  let transcript = '';
  for (let frame of frames) {
    const [partialTranscript, _] = engineInstance.process(frame);
    transcript += partialTranscript
  }

  transcript += engineInstance.flush();
  console.log(transcript);
  engineInstance.release();
}

fileDemo();
