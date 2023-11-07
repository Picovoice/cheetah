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
'use strict';

import {
  Cheetah,
  CheetahInvalidArgumentError,
} from '../src';
import * as fs from 'fs';
import { WaveFile } from 'wavefile';

import { getSystemLibraryPath } from '../src/platforms';

import {
  getAudioFile,
  getModelPath,
  getTestParameters,
} from './test_utils';

const MODEL_PATH = getModelPath();
const TEST_PARAMETERS = getTestParameters();

const libraryPath = getSystemLibraryPath();

const ACCESS_KEY = process.argv
  .filter(x => x.startsWith('--access_key='))[0]
  .split('--access_key=')[1];

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

  const pcm: any = waveAudioFile.getSamples(false, Int16Array);
  return pcm;
};

const cheetahProcessWaveFile = (
  engineInstance: Cheetah,
  audioFile: string
): [string, boolean] => {
  const pcm = loadPcm(audioFile);

  let transcript = '';
  let isEndpoint = false;
  for (let i = 0; i < pcm.length; i += engineInstance.frameLength) {
    const [partialTranscript, partialIsEndpoint] =engineInstance.process(pcm.slice(i, i + engineInstance.frameLength));
    transcript += partialTranscript;
    isEndpoint = partialIsEndpoint;
  }
  const partialTranscript = engineInstance.flush();
  transcript += partialTranscript;

  return [transcript, isEndpoint];
}


const testCheetahProcess = (
  _: string,
  transcript: string,
  punctuations: string[],
  testPunctuation: boolean,
  errorRate: number,
  audioFile: string
) => {
  let normTranscript = transcript;
  if (!testPunctuation) {
    for (const punctuation of punctuations) {
      normTranscript = normTranscript.replace(new RegExp(`[${punctuation}]`, "g"), '');
    }
  }

  let cheetahEngine = new Cheetah(ACCESS_KEY, {
    enableAutomaticPunctuation: testPunctuation,
  });

  let [res, __] = cheetahProcessWaveFile(cheetahEngine, audioFile);

  expect(
    characterErrorRate(res, normTranscript) < errorRate
  ).toBeTruthy();

  cheetahEngine.release();
};

describe('successful processes', () => {
  it.each(TEST_PARAMETERS)(
    'testing process `%p`',
    (
      language: string,
      transcript: string,
      punctuations: string[],
      errorRate: number,
      audioFile: string
    ) => {
      testCheetahProcess(
        language,
        transcript,
        punctuations,
        false,
        errorRate,
        audioFile
      );
    }
  );

  it.each(TEST_PARAMETERS)(
    'testing process `%p` with punctuation',
    (
      language: string,
      transcript: string,
      punctuations: string[],
      errorRate: number,
      audioFile: string
    ) => {
      testCheetahProcess(
        language,
        transcript,
        punctuations,
        true,
        errorRate,
        audioFile
      );
    }
  );
});

describe('Defaults', () => {
  test('Empty AccessKey', () => {
    expect(() => {
      new Cheetah('');
    }).toThrow(CheetahInvalidArgumentError);
  });
});

describe('manual paths', () => {
  test('manual model path', () => {
    let cheetahEngine = new Cheetah(ACCESS_KEY, { modelPath: MODEL_PATH });

    let [transcript, isEndpoint] = cheetahProcessWaveFile(
      cheetahEngine,
      WAV_PATH
    );

    expect(transcript).toBe(TRANSCRIPT);
    expect(isEndpoint).toBe(false);

    cheetahEngine.release();
  });

  test('manual model and library path', () => {
    let cheetahEngine = new Cheetah(ACCESS_KEY, {
      modelPath:  MODEL_PATH,
      libraryPath: libraryPath,
      endpointDurationSec: 0.2,
    });

    let [transcript, isEndpoint] = cheetahProcessWaveFile(
      cheetahEngine,
      WAV_PATH
    );

    expect(transcript).toBe(TRANSCRIPT);
    expect(isEndpoint).toBe(true);

    cheetahEngine.release();
  });

  test('Enable automatic punctuation', () => {
    let cheetahEngine = new Cheetah(ACCESS_KEY, {
      enableAutomaticPunctuation: true,
      endpointDurationSec: 0.2,
    });

    // eslint-disable-next-line no-unused-vars
    let [transcript, _] = cheetahProcessWaveFile(cheetahEngine, WAV_PATH);

    expect(transcript).toBe(
      'Mr. Quilter is the apostle of the middle classes and we are glad to welcome his gospel.'
    );

    cheetahEngine.release();
  });
});

describe("error message stack", () => {
  test("message stack cleared after read", () => {
    let error: string[] = [];
    try {
      new Cheetah('invalid', { modelPath: MODEL_PATH });
    } catch (e: any) {
      error = e.messageStack;
    }

    expect(error.length).toBeGreaterThan(0);
    expect(error.length).toBeLessThanOrEqual(8);

    try {
      new Cheetah('invalid', { modelPath: MODEL_PATH });
    } catch (e: any) {
      for (let i = 0; i < error.length; i++) {
        expect(error[i]).toEqual(e.messageStack[i]);
      }
    }
  });
});
