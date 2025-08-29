import {Platform} from 'react-native';
import fs from 'react-native-fs';
import {decode as atob} from 'base-64';

import {Cheetah} from '@picovoice/cheetah-react-native';

const testData = require('./test_data.json');
const platform = Platform.OS;

const TEST_ACCESS_KEY: string = '{TESTING_ACCESS_KEY_HERE}';

export type Result = {
  testName: string;
  success: boolean;
  errorString?: string;
};

const levenshteinDistance = (words1: string[], words2: string[]) => {
  const res = Array.from(
    Array(words1.length + 1),
    () => new Array(words2.length + 1),
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
          (words1[i - 1].toUpperCase() === words2[j - 1].toUpperCase() ? 0 : 1),
      );
    }
  }
  return res[words1.length][words2.length];
};

const wordErrorRate = (reference: string, hypothesis: string): number => {
  const ed = levenshteinDistance(reference.split(' '), hypothesis.split(' '));
  return ed / reference.split(' ').length;
};

function logResult(result: Result) {
  if (result.success) {
    console.info(result);
  } else {
    console.error(result);
  }
}

function getPath(filePath: string) {
  if (platform === 'ios') {
    return `Assets.bundle/${filePath}`;
  }
  return filePath;
}

async function getBinaryFile(audioFilePath: string) {
  let fileBase64;
  if (platform === 'ios') {
    fileBase64 = await fs.readFile(
      `${fs.MainBundlePath}/${audioFilePath}`,
      'base64',
    );
  } else {
    fileBase64 = await fs.readFileAssets(audioFilePath, 'base64');
  }
  const fileBinary = atob(fileBase64);

  const bytes = new Uint8Array(fileBinary.length);
  for (let i = 0; i < fileBinary.length; i++) {
    bytes[i] = fileBinary.charCodeAt(i);
  }
  return bytes;
}

async function getPcmFromFile(
  audioFilePath: string,
  expectedSampleRate: number,
) {
  const headerSampleRateOffset = 24;
  const headerOffset = 44;

  const fileBytes = await getBinaryFile(audioFilePath);
  const dataView = new DataView(fileBytes.buffer);

  const fileSampleRate = dataView.getInt32(headerSampleRateOffset, true);
  if (fileSampleRate !== expectedSampleRate) {
    throw new Error(
      `Specified sample rate did not match test file: '${fileSampleRate}' != '${expectedSampleRate}'`,
    );
  }

  const pcm: number[] = [];
  for (let i = headerOffset; i < fileBytes.length; i += 2) {
    pcm.push(dataView.getInt16(i, true));
  }

  return pcm;
}

async function runInitTestCase(
  params: {
    accessKey?: string;
    modelPath?: string;
    expectFailure?: boolean;
  } = {},
) {
  const {
    accessKey = TEST_ACCESS_KEY,
    modelPath = getPath('model_files/cheetah_params.pv'),
    expectFailure = false,
  } = params;

  const result: Result = {testName: '', success: true};

  let isFailed = false;
  try {
    const cheetah = await Cheetah.create(accessKey, modelPath);
    if (cheetah.sampleRate !== 16000) {
      result.success = false;
      result.errorString = `Invalid sample rate: '${cheetah.sampleRate}'`;
    } else if (typeof cheetah.version !== 'string') {
      result.success = false;
      result.errorString = `Invalid version: '${cheetah.version}'`;
    } else if (cheetah.version.length === 0) {
      result.success = false;
      result.errorString = 'Invalid version length.';
    }

    await cheetah.delete();
  } catch (e) {
    if (expectFailure) {
      isFailed = true;
    } else {
      result.success = false;
      result.errorString = `Failed to initialize cheetah with:  '${e}'`;
    }
  }

  if (expectFailure && !isFailed) {
    result.success = false;
    result.errorString = 'Expected init to fail but succeeded.';
  }

  return result;
}

async function runProcTestCase(
  modelFile: string,
  audioFile: string,
  expectedTranscript: string,
  punctuations: string[],
  errorRate: number,
  params: {
    enablePunctuation?: boolean;
  } = {},
): Promise<Result> {
  const {enablePunctuation = false} = params;

  const result: Result = {testName: '', success: false};

  try {
    const modelPath = getPath(`model_files/${modelFile}`);
    const audioPath = getPath(`audio_samples/${audioFile}`);

    const cheetah = await Cheetah.create(TEST_ACCESS_KEY, modelPath, {
      enableAutomaticPunctuation: enablePunctuation,
    });

    const pcm = await getPcmFromFile(audioPath, cheetah.sampleRate);
    const numFrames = Math.floor(pcm.length / cheetah.frameLength);

    let transcript = '';
    for (let i = 0; i < numFrames; i++) {
      transcript += (
        await cheetah.process(
          pcm.slice(i * cheetah.frameLength, (i + 1) * cheetah.frameLength),
        )
      ).transcript;
    }
    transcript += (await cheetah.flush()).transcript;

    await cheetah.delete();

    let normalizedTranscript = expectedTranscript;
    if (!enablePunctuation) {
      for (const punctuation of punctuations) {
        normalizedTranscript = normalizedTranscript.replaceAll(punctuation, '');
      }
    }

    const wer = wordErrorRate(transcript, normalizedTranscript);
    if (wer > errorRate) {
      result.errorString = `Expected WER '${wer}' to be less than '${errorRate}'`;
      return result;
    }

    result.success = true;
  } catch (e) {
    result.errorString = `Failed to process cheetah with: ${e}`;
  }

  return result;
}

async function initTests(): Promise<Result[]> {
  const results: Result[] = [];

  let result = await runInitTestCase({
    accessKey: 'invalid',
    expectFailure: true,
  });
  result.testName = 'Invalid access key test';
  logResult(result);
  results.push(result);

  result = await runInitTestCase({
    modelPath: 'invalid',
    expectFailure: true,
  });
  result.testName = 'Invalid model path';
  logResult(result);
  results.push(result);

  return results;
}

async function processTests(): Promise<Result[]> {
  const results: Result[] = [];

  for (const testParam of testData.tests.language_tests) {
    for (const modelFile of testParam.models) {
      const result = await runProcTestCase(
        modelFile,
        testParam.audio_file,
        testParam.transcript,
        testParam.punctuations,
        testParam.error_rate,
      );
      result.testName = `Process test for '${modelFile}'`;
      logResult(result);
      results.push(result);
    }
  }

  for (const testParam of testData.tests.language_tests) {
    for (const modelFile of testParam.models) {
      const result = await runProcTestCase(
        modelFile,
        testParam.audio_file,
        testParam.transcript,
        testParam.punctuations,
        testParam.error_rate,
        {
          enablePunctuation: true,
        },
      );
      result.testName = `Process test with punctuation for '${modelFile}'`;
      logResult(result);
      results.push(result);
    }
  }

  return results;
}

export async function runCheetahTests(): Promise<Result[]> {
  const initResults = await initTests();
  const processResults = await processTests();
  return [...initResults, ...processResults];
}
