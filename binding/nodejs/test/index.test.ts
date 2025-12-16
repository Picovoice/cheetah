//
// Copyright 2022-2025 Picovoice Inc.
//
// You may not use this file except in compliance with the license. A copy of the license is located in the "LICENSE"
// file accompanying this source.
//
// Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on
// an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the
// specific language governing permissions and limitations under the License.
//
'use strict';

import {
  Cheetah,
  CheetahErrors,
} from '../src';
import * as fs from 'fs';
import { WaveFile } from 'wavefile';

import { getSystemLibraryPath } from '../src/platforms';

import {
  getModelPath,
  getAudioFile,
  getLanguageTestParameters,
} from './test_utils';

const LANGUAGE_TEST_PARAMETERS = getLanguageTestParameters();

const ACCESS_KEY = process.argv
  .filter(x => x.startsWith('--access_key='))[0]
  .split('--access_key=')[1];

const DEVICE = process.argv
  .filter(x => x.startsWith('--device='))[0]
  .split('--device=')[1] ?? 'best';

const levenshteinDistance = (words1: string[], words2: string[]) => {
  const res = Array.from(
    Array(words1.length + 1),
    () => new Array(words2.length + 1)
  );
  for (let i = 0; i <= words1.length; i++) {
    res[i][0] = i;
  }
  for (let j = 0; j <= words2.length; j++) {
    res[0][j] = j;
  }
  for (let i = 1; i <= words1.length; i++) {
    for (let j = 1; j <= words2.length; j++) {
      res[i][j] = Math.min(
        res[i - 1][j] + 1,
        res[i][j - 1] + 1,
        res[i - 1][j - 1] +
          (words1[i - 1].toUpperCase() === words2[j - 1].toUpperCase() ? 0 : 1)
      );
    }
  }
  return res[words1.length][words2.length];
};

const characterErrorRate = (
  transcript: string,
  expectedTranscript: string
): number => {
  const ed = levenshteinDistance(
    transcript.split(''),
    expectedTranscript.split('')
  );
  return ed / expectedTranscript.length;
};

const loadPcm = (audioFile: string): Int16Array => {
  const waveFilePath = getAudioFile(audioFile);
  const waveBuffer = fs.readFileSync(waveFilePath);
  const waveAudioFile = new WaveFile(waveBuffer);

  return waveAudioFile.getSamples(false, Int16Array) as any;
};

const cheetahProcessWaveFile = (
  engineInstance: Cheetah,
  audioFile: string
): [string, boolean] => {
  const pcm = loadPcm(audioFile);

  let transcript = '';
  let isEndpoint = false;
  for (let i = 0; i < pcm.length - engineInstance.frameLength; i += engineInstance.frameLength) {
    const [partialTranscript, partialIsEndpoint] = engineInstance.process(pcm.slice(i, i + engineInstance.frameLength));
    transcript += partialTranscript;
    isEndpoint = partialIsEndpoint;
  }
  const partialTranscript = engineInstance.flush();
  transcript += partialTranscript;

  return [transcript, isEndpoint];
};


const testCheetahProcess = (
  modelFile: string,
  audioFile: string,
  referenceTranscript: string,
  punctuations: string[],
  enableAutomaticPunctuation: boolean,
  errorRate: number,
) => {
  const modelPath = getModelPath(modelFile);

  let cheetahEngine = new Cheetah(ACCESS_KEY, {
    modelPath,
    enableAutomaticPunctuation,
    device: DEVICE,
  });

  let [transcript] = cheetahProcessWaveFile(cheetahEngine, audioFile);

  let normalizedTranscript = referenceTranscript;
  if (!enableAutomaticPunctuation) {
    for (const punctuation of punctuations) {
      normalizedTranscript = normalizedTranscript.replace(punctuation, "");
    }
  }

  expect(
    characterErrorRate(transcript, normalizedTranscript) < errorRate
  ).toBeTruthy();

  cheetahEngine.release();
};

describe('successful processes', () => {
  for (const [
    models,
    audioFile,
    transcript,
    punctuations,
    errorRate
  ] of LANGUAGE_TEST_PARAMETERS) {
    for (const modelFile of models) {
      it(`testing process: ${modelFile}`, () => {
        testCheetahProcess(
          modelFile,
          audioFile,
          transcript,
          punctuations,
          false,
          errorRate,
        );
      });

      it(`testing process with punctuation: ${modelFile}`, () => {
        testCheetahProcess(
          modelFile,
          audioFile,
          transcript,
          punctuations,
          true,
          errorRate,
        );
      });
    }
  }
});

describe('Defaults', () => {
  test('Empty AccessKey', () => {
    expect(() => {
      new Cheetah('');
    }).toThrow(CheetahErrors.CheetahInvalidArgumentError);
  });

  test('Invalid Device', () => {
    expect(() => {
      new Cheetah(ACCESS_KEY, { device: 'invalid_device' });
    }).toThrow(CheetahErrors.CheetahInvalidArgumentError);
  });

  test('list hardware devices', () => {
    const hardwareDevices: string[] = Cheetah.listAvailableDevices();
    expect(Array.isArray(hardwareDevices)).toBeTruthy();
    expect(hardwareDevices.length).toBeGreaterThan(0);
  });
});

describe('manual paths', () => {
  test('manual model path', () => {
    let cheetahEngine = new Cheetah(ACCESS_KEY, { modelPath: getModelPath("cheetah_params.pv"), device: DEVICE });

    let [transcript] = cheetahProcessWaveFile(
      cheetahEngine,
      "test.wav"
    );

    expect(transcript.length).toBeGreaterThan(0);
    cheetahEngine.release();
  });

  test('manual model and library path', () => {
    const libraryPath = getSystemLibraryPath();

    let cheetahEngine = new Cheetah(ACCESS_KEY, {
      modelPath: getModelPath("cheetah_params.pv"),
      device: DEVICE,
      libraryPath: libraryPath,
      endpointDurationSec: 0.2,
    });

    let [transcript] = cheetahProcessWaveFile(
      cheetahEngine,
      "test.wav"
    );

    expect(transcript.length).toBeGreaterThan(0);
    cheetahEngine.release();
  });
});

describe("error message stack", () => {
  test("message stack cleared after read", () => {
    let error: string[] = [];
    try {
      new Cheetah('invalid', { modelPath: getModelPath("cheetah_params.pv"), device: DEVICE });
    } catch (e: any) {
      error = e.messageStack;
    }

    expect(error.length).toBeGreaterThan(0);
    expect(error.length).toBeLessThanOrEqual(8);

    try {
      new Cheetah('invalid', { modelPath: getModelPath("cheetah_params.pv"), device: DEVICE });
    } catch (e: any) {
      for (let i = 0; i < error.length; i++) {
        expect(error[i]).toEqual(e.messageStack[i]);
      }
    }
  });
});
