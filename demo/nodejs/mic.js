#! /usr/bin/env node
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
  .option("-d, --disable_automatic_punctuation", "disable automatic punctuation");

if (process.argv.length < 1) {
  program.help();
}
program.parse(process.argv);

let isInterrupted = false;

async function micDemo() {
  let accessKey = program["access_key"];
  let libraryFilePath = program["library_file_path"];
  let modelFilePath = program["model_file_path"];
  let audioDeviceIndex = program["audio_device_index"];
  let endpointDurationSec = program["endpoint_duration_sec"];
  let showAudioDevices = program["show_audio_devices"];
  let disableAutomaticPunctuation = program["disable_automatic_punctuation"];

  let showAudioDevicesDefined = showAudioDevices !== undefined;

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
      libraryPath: libraryFilePath,
      endpointDurationSec: endpointDurationSec,
      enableAutomaticPunctuation: !disableAutomaticPunctuation
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

  while (!isInterrupted) {
    const pcm = await recorder.read();
    try {
      const [partialTranscript, isEndpoint] = engineInstance.process(pcm);
      process.stdout.write(partialTranscript);
      if (isEndpoint === true) {
        const finalTranscript = engineInstance.flush();
        process.stdout.write(`${finalTranscript}\n`);
      }
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
