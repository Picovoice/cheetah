import { Cheetah, CheetahWorker } from "../";
import { CheetahError } from "../dist/types/cheetah_error";

// @ts-ignore
import cheetahParams from "./cheetah_params";
import { PvModel } from '@picovoice/web-utils';

const ACCESS_KEY: string = Cypress.env("ACCESS_KEY");

const testParam = {
  language: 'en',
  audio_file: 'test.wav',
  transcript: 'Mr. Quilter is the apostle of the middle classes and we are glad to welcome his gospel.',
  punctuations: ['.'],
  error_rate: 0.025,
};

const levenshteinDistance = (words1: string[], words2: string[]) => {
  const res = Array.from(Array(words1.length + 1), () => new Array(words2.length + 1));
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
        res[i - 1][j - 1] + (words1[i - 1].toUpperCase() === words2[j - 1].toUpperCase() ? 0 : 1),
      );
    }
  }
  return res[words1.length][words2.length];
};

const wordErrorRate = (reference: string, hypothesis: string, useCER = false): number => {
  const splitter = (useCER) ? '' : ' ';
  const ed = levenshteinDistance(reference.split(splitter), hypothesis.split(splitter));
  return ed / reference.length;
};

function delay(time: number) {
  return new Promise(resolve => setTimeout(resolve, time));
}

const runInitTest = async (
  instance: typeof Cheetah | typeof CheetahWorker,
  params: {
    accessKey?: string,
    model?: PvModel,
    expectFailure?: boolean,
  } = {}
) => {
  const {
    accessKey = ACCESS_KEY,
    model = { publicPath: '/test/cheetah_params.pv', forceWrite: true },
    expectFailure = false,
  } = params;

  let isFailed = false;

  try {
    const cheetah = await instance.create(
      accessKey,
      () => {},
      model);

    expect(cheetah.sampleRate).to.be.eq(16000);
    expect(typeof cheetah.version).to.eq('string');
    expect(cheetah.version.length).to.be.greaterThan(0);

    if (cheetah instanceof CheetahWorker) {
      cheetah.terminate();
    } else {
      await cheetah.release();
    }
  } catch (e) {
    if (expectFailure) {
      isFailed = true;
    } else {
      expect(e).to.be.undefined;
    }
  }

  if (expectFailure) {
    expect(isFailed).to.be.true;
  }
};

const runProcTest = async (
  instance: typeof Cheetah | typeof CheetahWorker,
  inputPcm: Int16Array,
  punctuations: string[],
  expectedTranscript: string,
  expectedErrorRate: number,
  params: {
    accessKey?: string,
    model?: PvModel,
    enablePunctuation?: boolean,
    useCER?: boolean,
  } = {}
) => {
  const {
    accessKey = ACCESS_KEY,
    model = { publicPath: '/test/cheetah_params.pv', forceWrite: true },
    enablePunctuation = true,
    useCER = false,
  } = params;

  let normalizedTranscript = expectedTranscript;
  if (!enablePunctuation) {
    for (const punctuation of punctuations) {
      normalizedTranscript = normalizedTranscript.replaceAll(punctuation, '');
    }
  }

  let transcript = "";

  const runProcess = () =>
    new Promise<void>(async (resolve, reject) => {
      const cheetah = await instance.create(
        accessKey,
        cheetahTranscript => {
          transcript += cheetahTranscript.transcript;
          if (cheetahTranscript.isFlushed) {
            resolve();
          }
        },
        model,
        {
          enableAutomaticPunctuation: enablePunctuation,
          processErrorCallback: (error: string) => {
            reject(error);
          }
        }
      );

      for (
        let i = 0;
        i < inputPcm.length - cheetah.frameLength + 1;
        i += cheetah.frameLength
      ) {
        await cheetah.process(inputPcm.slice(i, i + cheetah.frameLength));
      }
      await cheetah.flush();

      await delay(1000);

      if (cheetah instanceof CheetahWorker) {
        cheetah.terminate();
      } else {
        await cheetah.release();
      }
    });

  try {
    await runProcess();
    const errorRate = wordErrorRate(normalizedTranscript, transcript, useCER);
    expect(errorRate).to.be.lt(expectedErrorRate);
  } catch (e) {
    expect(e).to.be.undefined;
  }
};

describe("Cheetah Binding", function () {
  it(`should return process and flush error message stack`, async () => {
    let errors: [CheetahError] = [];

    const runProcess = () => new Promise<void>(async resolve => {
      const cheetah = await Cheetah.create(
        ACCESS_KEY,
        () => { },
        { publicPath: '/test/cheetah_params.pv', forceWrite: true },
        {
          processErrorCallback: (e: CheetahError) => {
            errors.push(e);
            resolve();
          }
        }
      );
      const testPcm = new Int16Array(cheetah.frameLength);
      // @ts-ignore
      const objectAddress = cheetah._objectAddress;

      // @ts-ignore
      cheetah._objectAddress = 0;
      await cheetah.process(testPcm);
      await cheetah.flush();

      await delay(1000);

      // @ts-ignore
      cheetah._objectAddress = objectAddress;
      await cheetah.release();
    });

    await runProcess();
    expect(errors.length).to.be.gte(0);

    for (let i = 0; i < errors.length; i++) {
      expect((errors[i] as CheetahError).messageStack.length).to.be.gt(0);
      expect((errors[i] as CheetahError).messageStack.length).to.be.lte(8);
    }
  });

  for (const instance of [Cheetah, CheetahWorker]) {
    const instanceString = (instance === CheetahWorker) ? 'worker' : 'main';

    it(`should return correct error message stack (${instanceString})`, async () => {
      let messageStack = [];
      try {
        const cheetah = await instance.create(
          "invalidAccessKey",
          () => { },
          { publicPath: '/test/cheetah_params.pv', forceWrite: true }
        );
        expect(cheetah).to.be.undefined;
      } catch (e: any) {
        messageStack = e.messageStack;
      }

      expect(messageStack.length).to.be.gt(0);
      expect(messageStack.length).to.be.lte(8);

      try {
        const cheetah = await instance.create(
          "invalidAccessKey",
          () => { },
          { publicPath: '/test/cheetah_params.pv', forceWrite: true }
        );
        expect(cheetah).to.be.undefined;
      } catch (e: any) {
        expect(messageStack.length).to.be.eq(e.messageStack.length);
      }
    });

    it(`should be able to init with public path (${instanceString})`, () => {
      cy.wrap(null).then(async () => {
        await runInitTest(instance);
      });
    });

    it(`should be able to init with base64 (${instanceString})`, () => {
      cy.wrap(null).then(async () => {
        await runInitTest(instance, {
          model: { base64: cheetahParams, forceWrite: true }
        });
      });
    });

    it(`should be able to handle UTF-8 public path (${instanceString})`, () => {
      cy.wrap(null).then(async () => {
        await runInitTest(instance, {
          model: { publicPath: '/test/cheetah_params.pv', forceWrite: true, customWritePath: '테스트' }
        });
      });
    });

    it(`should be able to handle invalid public path (${instanceString})`, () => {
      cy.wrap(null).then(async () => {
        await runInitTest(instance, {
          model: { publicPath: 'invalid', forceWrite: true },
          expectFailure: true
        });
      });
    });

    it(`should be able to handle invalid base64 (${instanceString})`, () => {
      cy.wrap(null).then(async () => {
        await runInitTest(instance, {
          model: { base64: 'invalid', forceWrite: true },
          expectFailure: true
        });
      });
    });

    it(`should be able to handle invalid access key (${instanceString})`, () => {
      cy.wrap(null).then(async () => {
        await runInitTest(instance, {
          accessKey: 'invalid',
          expectFailure: true
        });
      });
    });

    it(`should be able to process (${testParam.language}) (${instanceString})`, () => {
      try {
        cy.getFramesFromFile(`audio_samples/${testParam.audio_file}`).then( async pcm => {
          const suffix = (testParam.language === 'en') ? '' : `_${testParam.language}`;
          await runProcTest(
            instance,
            pcm,
            testParam.punctuations,
            testParam.transcript,
            testParam.error_rate,
            {
              model: { publicPath: `/test/cheetah_params${suffix}.pv`, forceWrite: true },
              enablePunctuation: false,
              useCER: (testParam.language === 'ja')
            });
        });
      } catch (e) {
        expect(e).to.be.undefined;
      }
    });

    it(`should be able to process with punctuation (${testParam.language}) (${instanceString})`, () => {
      try {
        cy.getFramesFromFile(`audio_samples/${testParam.audio_file}`).then( async pcm => {
          const suffix = (testParam.language === 'en') ? '' : `_${testParam.language}`;
          await runProcTest(
            instance,
            pcm,
            testParam.punctuations,
            testParam.transcript,
            testParam.error_rate,
            {
              model: { publicPath: `/test/cheetah_params${suffix}.pv`, forceWrite: true },
              useCER: (testParam.language === 'ja')
            });
        });
      } catch (e) {
        expect(e).to.be.undefined;
      }
    });
  }
});
