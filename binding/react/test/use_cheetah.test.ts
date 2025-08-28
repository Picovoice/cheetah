import { renderHook } from '@testing-library/react-hooks/dom';

import { useCheetah } from '../src';

// @ts-ignore
import cheetahParams from '@/cheetah_params.js';

// @ts-ignore
import testData from './test_data.json';

const ACCESS_KEY = Cypress.env('ACCESS_KEY');

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

const wordErrorRate = (
  reference: string,
  hypothesis: string,
  useCER = false
): number => {
  const splitter = useCER ? '' : ' ';
  const refWords = reference.split(splitter);
  const hypWords = hypothesis.split(splitter);
  const ed = levenshteinDistance(refWords, hypWords);
  return ed / refWords.length;
};

const runProcTest = async (
  audioFile: string,
  punctuations: string[],
  expectedTranscript: string,
  expectedErrorRate: number,
  params: {
    accessKey?: string;
    model?: Record<string, string | boolean>;
    enablePunctuation?: boolean;
    useCER?: boolean;
  } = {}
) => {
  const {
    accessKey = ACCESS_KEY,
    model = { publicPath: '/test/cheetah_params.pv', forceWrite: true },
    enablePunctuation = false,
    useCER = false,
  } = params;
  const { result } = renderHook(() => useCheetah());

  cy.wrapHook(() =>
    result.current.init(accessKey, model, {
      enableAutomaticPunctuation: enablePunctuation,
    })
  ).then(() => {
    expect(
      result.current.isLoaded,
      `Failed to load 'cheetah_params.pv' with ${result.current.error}`
    ).to.be.true;
  });

  cy.wrapHook(result.current.start).then(() => {
    expect(result.current.isListening).to.be.true;
  });

  cy.mockRecording(audioFile);

  cy.wrapHook(result.current.stop).then(() => {
    let normalizedTranscript = expectedTranscript;
    if (!enablePunctuation) {
      for (const punctuation of punctuations) {
        normalizedTranscript = normalizedTranscript.replaceAll(punctuation, '');
      }
    }

    let completeTranscript = '';
    result.all.forEach(resultObj => {
      if ('result' in resultObj && resultObj.result !== null) {
        completeTranscript += resultObj.result.transcript;
      }
    });

    const errorRate = wordErrorRate(
      normalizedTranscript,
      completeTranscript,
      useCER
    );
    expect(errorRate).to.be.lt(expectedErrorRate);
  });

  expect(result.current.isListening).to.be.false;

  cy.wrapHook(result.current.release).then(() => {
    expect(
      result.current.isLoaded,
      `Failed to release cheetah with ${result.current.error}`
    ).to.be.false;
  });
};

describe('Cheetah binding', () => {
  it('should be able to init via public path', () => {
    const { result } = renderHook(() => useCheetah());

    cy.wrapHook(() =>
      result.current.init(ACCESS_KEY, {
        publicPath: '/test/cheetah_params.pv',
        forceWrite: true,
      })
    ).then(() => {
      expect(
        result.current.isLoaded,
        `Failed to load 'cheetah_params.pv' with ${result.current.error}`
      ).to.be.true;
    });

    cy.wrapHook(result.current.release).then(() => {
      expect(
        result.current.isLoaded,
        `Failed to release cheetah with ${result.current.error}`
      ).to.be.false;
    });
  });

  it('should be able to init via base64', () => {
    const { result } = renderHook(() => useCheetah());

    cy.wrapHook(() =>
      result.current.init(ACCESS_KEY, {
        base64: cheetahParams,
        forceWrite: true,
      })
    ).then(() => {
      expect(
        result.current.isLoaded,
        `Failed to load 'cheetah_params.js' with ${result.current.error}`
      ).to.be.true;
    });
  });

  it('should show invalid model path error message', () => {
    const { result } = renderHook(() => useCheetah());

    cy.wrapHook(() =>
      result.current.init(ACCESS_KEY, {
        publicPath: '/cheetah_params_failed.pv',
        forceWrite: true,
      })
    ).then(() => {
      expect(result.current.isLoaded).to.be.false;
      expect(result.current.error?.toString()).to.contain(
        "Error response returned while fetching model from '/cheetah_params_failed.pv'"
      );
    });
  });

  it('should show invalid access key error message', () => {
    const { result } = renderHook(() => useCheetah());

    cy.wrapHook(() =>
      result.current.init('', {
        publicPath: '/test/cheetah_params.pv',
        forceWrite: true,
      })
    ).then(() => {
      expect(result.current.isLoaded).to.be.false;
      expect(result.current.error?.toString()).to.contain('Invalid AccessKey');
    });
  });

  for (const testParam of testData.tests.language_tests) {
    for (const modelFile of testParam.models) {
      it(`should be able to process (${testParam.language} ${modelFile})`, () => {
        cy.wrap(null).then(async () => {
          await runProcTest(
              `audio_samples/${testParam.audio_file}`,
              testParam.punctuations,
              testParam.transcript,
              testParam.error_rate,
              {
                model: {
                  publicPath: `/test/${modelFile}`,
                  forceWrite: true,
                },
              }
          );
        });
      });

      it(`should be able to process with punctuation (${testParam.language} ${modelFile})`, () => {
        cy.wrap(null).then(async () => {
          await runProcTest(
              `audio_samples/${testParam.audio_file}`,
              testParam.punctuations,
              testParam.transcript,
              testParam.error_rate,
              {
                model: {
                  publicPath: `/test/${modelFile}`,
                  forceWrite: true,
                },
                enablePunctuation: true,
              }
          );
        });
      });
    }
  }
});
