import { Cheetah, CheetahWorker, CheetahModel } from "../";

const ACCESS_KEY: string = Cypress.env("ACCESS_KEY");

const runInitTest = async (
  instance: typeof Cheetah | typeof CheetahWorker,
  params: {
    accessKey?: string,
    model?: CheetahModel,
    device?: string,
    expectFailure?: boolean,
  } = {}
) => {
  const {
    accessKey = ACCESS_KEY,
    model = { publicPath: '/test/cheetah_params.pv', forceWrite: true },
    device = "cpu:1",
    expectFailure = false,
  } = params;

  let isFailed = false;

  try {
    const cheetah = await instance.create(
      accessKey,
      () => {},
      model,
      { device }
    );
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

describe("Cheetah Train", function () {
  it(`should be able to train model`, () => {
    const writePath = "new_cheetah_params.pv";

    cy.wrap(null).then(async () => {
      const cheetahModel = await Cheetah.trainModelFromWords(
        ACCESS_KEY,
        writePath,
        "fr",
        {
          "color": ["k ɔ l ɔ u ʁ"]
        },
        ["oui"]
      );

      await runInitTest(Cheetah, {
        model: cheetahModel
      });
    });
  });

  it(`should be able to handle invalid words`, () => {
    const writePath = "new_cheetah_params.pv";

    cy.wrap(null).then(async () => {
      let failed = false;
      try {
        const cheetahModel = await Cheetah.trainModelFromWords(
          ACCESS_KEY,
          writePath,
          "fr",
          {
            125: ["k ɔ l ɔ u ʁ"]
          },
          [1234]
        );
        expect(cheetahModel).to.be.null;
      } catch (e) {
        expect(e).to.not.be.null;
        failed = true;
      }
      expect(failed).to.be.true;
    });
  });
});
