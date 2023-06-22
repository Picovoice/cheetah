import { Cheetah, CheetahWorker } from "../";

const ACCESS_KEY = Cypress.env('ACCESS_KEY');
const NUM_TEST_ITERATIONS = Number(Cypress.env('NUM_TEST_ITERATIONS'));
const INIT_PERFORMANCE_THRESHOLD_SEC = Number(Cypress.env('INIT_PERFORMANCE_THRESHOLD_SEC'));
const PROC_PERFORMANCE_THRESHOLD_SEC = Number(Cypress.env('PROC_PERFORMANCE_THRESHOLD_SEC'));

async function testPerformance(
  instance: typeof Cheetah | typeof CheetahWorker,
  inputPcm: Int16Array
) {
  const initPerfResults: number[] = [];
  const procPerfResults: number[] = [];

  for (let j = 0; j < NUM_TEST_ITERATIONS; j++) {
    let start = Date.now();

    let flushed = false;

    const cheetah = await instance.create(
      ACCESS_KEY,
      cheetahTranscript => {
        if (cheetahTranscript.isFlushed) {
          flushed = true;
        }
      },
      { publicPath: '/test/cheetah_params.pv', forceWrite: true }
    );

    let end = Date.now();
    initPerfResults.push((end - start) / 1000);

    const waitUntil = (): Promise<void> =>
      new Promise(resolve => {
        setInterval(() => {
          if (flushed) {
            resolve();
          }
        }, 100);
      });

    start = Date.now();
    for (
      let i = 0;
      i < inputPcm.length - cheetah.frameLength + 1;
      i += cheetah.frameLength
    ) {
      await cheetah.process(inputPcm.slice(i, i + cheetah.frameLength));
    }
    await cheetah.flush();
    await waitUntil();
    end = Date.now();
    procPerfResults.push((end - start) / 1000);

    if (cheetah instanceof CheetahWorker) {
      cheetah.terminate();
    } else {
      await cheetah.release();
    }
  }

  const initAvgPerf = initPerfResults.reduce((a, b) => a + b) / NUM_TEST_ITERATIONS;
  const procAvgPerf = procPerfResults.reduce((a, b) => a + b) / NUM_TEST_ITERATIONS;

  // eslint-disable-next-line no-console
  console.log(`Average init performance: ${initAvgPerf} seconds`);
  // eslint-disable-next-line no-console
  console.log(`Average proc performance: ${procAvgPerf} seconds`);

  expect(initAvgPerf).to.be.lessThan(INIT_PERFORMANCE_THRESHOLD_SEC);
  expect(procAvgPerf).to.be.lessThan(PROC_PERFORMANCE_THRESHOLD_SEC);
}

describe('Cheetah binding performance test', () => {
  Cypress.config('defaultCommandTimeout', 120000);

  for (const instance of [Cheetah, CheetahWorker]) {
    const instanceString = (instance === CheetahWorker) ? 'worker' : 'main';

    it(`should be lower than performance threshold (${instanceString})`, () => {
      cy.getFramesFromFile('audio_samples/test.wav').then( async inputPcm => {
        await testPerformance(instance, inputPcm);
      });
    });
  }
});
