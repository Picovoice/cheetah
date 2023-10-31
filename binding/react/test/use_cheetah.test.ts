import { renderHook } from '@testing-library/react-hooks/dom';

import { useLeopard } from '../src';

// @ts-ignore
import cheetahParams from '@/cheetah_params.js';

// @ts-ignore
import testData from './test_data.json';

const ACCESS_KEY = Cypress.env('ACCESS_KEY');

describe('Cheetah binding', () => {
  it('should be able to init via public path', () => {
    const { result } = renderHook(() => useLeopard());

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
    const { result } = renderHook(() => useLeopard());

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
    const { result } = renderHook(() => useLeopard());

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
    const { result } = renderHook(() => useLeopard());

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

  for (const testInfo of testData.tests.parameters) {
    it.only(`should be able to process audio (${testInfo.language})`, () => {
      const { result } = renderHook(() => useLeopard());

      cy.wrapHook(() =>
        result.current.init(
          ACCESS_KEY,
          {
            publicPath:
              testInfo.language === 'en'
                ? `/test/cheetah_params.pv`
                : `/test/cheetah_params_${testInfo.language}.pv`,
            forceWrite: true,
          },
          {
            enableAutomaticPunctuation: true,
          }
        )
      ).then(() => {
        expect(
          result.current.isLoaded,
          `Failed to load ${testInfo.audio_file} (${testInfo.language}) with ${result.current.error}`
        ).to.be.true;
      });

      cy.getFramesFromFile(`audio_samples/${testInfo.audio_file}`).then(
        async (pcm: Int16Array) => {
          cy.wrapHook(() => result.current.process(pcm)).then(() => {
            const transcript = result.current.transcript?.transcript;
            expect(transcript).to.be.eq(testInfo.transcript);
            result.current.transcript?.words.forEach(
              ({ word, startSec, endSec, confidence }) => {
                const wordRegex = new RegExp(`${word}`, 'i');
                expect(transcript).to.match(wordRegex);
                expect(startSec).to.be.gt(0);
                expect(endSec).to.be.gt(0);
                expect(confidence).to.be.gt(0).and.lt(1);
              }
            );
          });
        }
      );

      cy.wrapHook(result.current.release).then(() => {
        expect(
          result.current.isLoaded,
          `Failed to release cheetah with ${result.current.error}`
        ).to.be.false;
      });
    });
  }
});
