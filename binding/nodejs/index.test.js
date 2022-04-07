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

const Cheetah = require("./index.js");
const fs = require("fs");
const { getInt16Frames, checkWaveFile } = require("./wave_util");
const WaveFile = require("wavefile").WaveFile;

const { PvArgumentError } = require("./errors");
const { getSystemLibraryPath } = require("./platforms");

const MODEL_PATH = "./lib/common/cheetah_params.pv";

const WAV_PATH = "../../resources/audio_samples/test.wav";
const TRANSCRIPT = "MR QUILTER IS THE APOSTLE OF THE MIDDLE CLASSES AND WE ARE GLAD TO WELCOME HIS GOSPEL"

const libraryPath = getSystemLibraryPath();

const ACCESS_KEY = process.argv
  .filter((x) => x.startsWith("--access_key="))[0]
  .split("--access_key=")[1];

const INIT_PERFORMANCE_THRESHOLD_SEC = Number(
  process.argv
    .filter((x) => x.startsWith("--init_performance_threshold_sec="))[0]
    ?.split("--init_performance_threshold_sec=")[1] ?? 0
);

const PROC_PERFORMANCE_THRESHOLD_SEC = Number(
  process.argv
    .filter((x) => x.startsWith("--proc_performance_threshold_sec="))[0]
    ?.split("--proc_performance_threshold_sec=")[1] ?? 0
);

const describe_if = (condition) => condition ? describe : describe.skip;

function cheetahProcessWaveFile(
  engineInstance,
  relativeWaveFilePath) {
  const path = require("path");
  const waveFilePath = path.join(__dirname, relativeWaveFilePath);
  const waveBuffer = fs.readFileSync(waveFilePath);
  const waveAudioFile = new WaveFile(waveBuffer);

  if (!checkWaveFile(waveAudioFile, engineInstance.sampleRate)) {
    console.error(
      "Audio file did not meet requirements. Wave file must be 16KHz, 16-bit, linear PCM (mono)."
    );
    return null;
  }

  const frames = getInt16Frames(waveAudioFile, engineInstance.frameLength);

  let transcript = '';
  let isEndpoint = false;
  for (let i = 0; i < frames.length; i++) {
    const frame = frames[i];
    const [partialTranscript, partialIsEndpoint] = engineInstance.process(frame);
    transcript += partialTranscript;
    isEndpoint = partialIsEndpoint;
  }
  const partialTranscript = engineInstance.flush();
  transcript += partialTranscript;

  return [transcript, isEndpoint];
}

describe("Defaults", () => {
  test("successful process", () => {
    let cheetahEngine = new Cheetah(
      ACCESS_KEY,
      0);

    let [transcript, isEndpoint] = cheetahProcessWaveFile(
      cheetahEngine,
      WAV_PATH
    )

    expect(transcript).toBe(TRANSCRIPT);
    expect(isEndpoint).toBe(false);

    cheetahEngine.release();
  });

  test("successful process with endpoint detection", () => {
    let cheetahEngine = new Cheetah(
      ACCESS_KEY,
      0.2);

    let [transcript, isEndpoint] = cheetahProcessWaveFile(
      cheetahEngine,
      WAV_PATH
    )

    expect(transcript).toBe(TRANSCRIPT);
    expect(isEndpoint).toBe(true);

    cheetahEngine.release();
  });

  test("Empty AccessKey", () => {
    expect(() => {
      let cheetahEngine = new Cheetah('', 1.0);
    }).toThrow(PvArgumentError);
  });

});

describe("manual paths", () => {
  test("manual model path", () => {
    let cheetahEngine = new Cheetah(ACCESS_KEY, 0, MODEL_PATH);

    let [transcript, isEndpoint] = cheetahProcessWaveFile(
      cheetahEngine,
      WAV_PATH
    )

    expect(transcript).toBe(TRANSCRIPT);
    expect(isEndpoint).toBe(false);

    cheetahEngine.release();
  });

  test("manual model and library path", () => {
    let cheetahEngine = new Cheetah(
      ACCESS_KEY, 
      0.1,
      MODEL_PATH,
      libraryPath);

      let [transcript, isEndpoint] = cheetahProcessWaveFile(
        cheetahEngine,
        WAV_PATH
      )
  
      expect(transcript).toBe(TRANSCRIPT);
      expect(isEndpoint).toBe(true);
  
      cheetahEngine.release();
  });
});

describe_if(
  INIT_PERFORMANCE_THRESHOLD_SEC > 0 && PROC_PERFORMANCE_THRESHOLD_SEC > 0
)("performance", () => {
  test("process", () => {
    const beforeInit = performance.now();
    let cheetahEngine = new Cheetah(
      ACCESS_KEY, 
      0.1,
      MODEL_PATH,
      libraryPath);
    const afterInit = performance.now();

    const path = require("path");
    const waveFilePath = path.join(__dirname, WAV_PATH);
    const waveBuffer = fs.readFileSync(waveFilePath);
    const waveAudioFile = new WaveFile(waveBuffer);

    const frames = getInt16Frames(waveAudioFile, cheetahEngine.frameLength);
    let totalProc = 0;
    for (let i = 0; i < frames.length; i++) {
      const frame = frames[0];
      const beforeProc = performance.now();
      cheetahEngine.process(frame);
      const afterProc = performance.now();
      totalProc += (afterProc - beforeProc);
    }

    cheetahEngine.release();

    let totalInit = Number(((afterInit - beforeInit) / 1000).toFixed(3));
    totalProc = Number((totalProc / 1000).toFixed(3));
    expect(totalInit).toBeLessThanOrEqual(INIT_PERFORMANCE_THRESHOLD_SEC);
    expect(totalProc).toBeLessThanOrEqual(PROC_PERFORMANCE_THRESHOLD_SEC);
  })
});
