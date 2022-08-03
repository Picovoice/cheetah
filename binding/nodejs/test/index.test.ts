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
"use strict";

import {Cheetah, CheetahInvalidArgumentError, getInt16Frames, checkWaveFile} from "../src";
import * as fs from "fs";
import * as path from "path";
import {WaveFile} from "wavefile";

import {getSystemLibraryPath} from "../src/platforms";

const MODEL_PATH = "./lib/common/cheetah_params.pv";

const WAV_PATH = "../../../resources/audio_samples/test.wav";
const TRANSCRIPT =
  "Mr quilter is the apostle of the middle classes and we are glad to welcome his gospel";

const libraryPath = getSystemLibraryPath();

const ACCESS_KEY = process.argv
  .filter((x) => x.startsWith("--access_key="))[0]
  .split("--access_key=")[1];

function cheetahProcessWaveFile(
  engineInstance: Cheetah,
  relativeWaveFilePath: string
): [string, boolean] {
  const waveFilePath = path.join(__dirname, relativeWaveFilePath);
  const waveBuffer = fs.readFileSync(waveFilePath);
  const waveAudioFile = new WaveFile(waveBuffer);

  if (!checkWaveFile(waveAudioFile, engineInstance.sampleRate)) {
    console.error(
      "Audio file did not meet requirements. Wave file must be 16KHz, 16-bit, linear PCM (mono)."
    );
    return ["", false];
  }

  const frames = getInt16Frames(waveAudioFile, engineInstance.frameLength);

  let transcript = "";
  let isEndpoint = false;
  for (let i = 0; i < frames.length; i++) {
    const frame = frames[i];
    const [partialTranscript, partialIsEndpoint] =
      engineInstance.process(frame);
    transcript += partialTranscript;
    isEndpoint = partialIsEndpoint;
  }
  const partialTranscript = engineInstance.flush();
  transcript += partialTranscript;

  return [transcript, isEndpoint];
}

describe("Defaults", () => {
  test("successful process", () => {
    let cheetahEngine = new Cheetah(ACCESS_KEY);

    let [transcript, isEndpoint] = cheetahProcessWaveFile(
      cheetahEngine,
      WAV_PATH
    );

    expect(transcript).toBe(TRANSCRIPT);
    expect(isEndpoint).toBe(false);

    cheetahEngine.release();
  });

  test("successful process with endpoint detection", () => {
    let cheetahEngine = new Cheetah(ACCESS_KEY, {endpointDurationSec: 0.2});

    let [transcript, isEndpoint] = cheetahProcessWaveFile(
      cheetahEngine,
      WAV_PATH
    );

    expect(transcript).toBe(TRANSCRIPT);
    expect(isEndpoint).toBe(true);

    cheetahEngine.release();
  });

  test("Empty AccessKey", () => {
    expect(() => {
      let cheetahEngine = new Cheetah("");
    }).toThrow(CheetahInvalidArgumentError);
  });
});

describe("manual paths", () => {
  test("manual model path", () => {
    let cheetahEngine = new Cheetah(ACCESS_KEY, {modelPath: MODEL_PATH});

    let [transcript, isEndpoint] = cheetahProcessWaveFile(
      cheetahEngine,
      WAV_PATH
    );

    expect(transcript).toBe(TRANSCRIPT);
    expect(isEndpoint).toBe(false);

    cheetahEngine.release();
  });

  test("manual model and library path", () => {
    let cheetahEngine = new Cheetah(
      ACCESS_KEY,
      {modelPath: MODEL_PATH, libraryPath: libraryPath, endpointDurationSec: 0.2});

    let [transcript, isEndpoint] = cheetahProcessWaveFile(
      cheetahEngine,
      WAV_PATH
    );

    expect(transcript).toBe(TRANSCRIPT);
    expect(isEndpoint).toBe(true);

    cheetahEngine.release();
  });

  test("Enable automatic punctuation", () => {
    let cheetahEngine = new Cheetah(
      ACCESS_KEY,
      {enableAutomaticPunctuation: true, endpointDurationSec: 0.2});

    let [transcript, _] = cheetahProcessWaveFile(
      cheetahEngine,
      WAV_PATH
    );

    expect(transcript).toBe('Mr. Quilter is the apostle of the middle classes and we are glad to welcome his gospel.');

    cheetahEngine.release();
  });
});
