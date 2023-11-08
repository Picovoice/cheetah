import { renderHook } from '@testing-library/react-hooks/dom';

import { useCheetah } from '../src';

// @ts-ignore
import cheetahParams from '@/cheetah_params.js';

const ACCESS_KEY = Cypress.env('ACCESS_KEY');

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

  it(`should be able to process audio (en)`, () => {
    const { result } = renderHook(() => useCheetah());

    cy.wrapHook(() =>
      result.current.init(
        ACCESS_KEY,
        {
          publicPath: '/test/cheetah_params.pv',
          forceWrite: true,
        },
        { enableAutomaticPunctuation: true }
      )
    ).then(() => {
      expect(
        result.current.isLoaded,
        `Failed to load 'cheetah_params.pv' with ${result.current.error}`
      ).to.be.true;
    });

    cy.wrapHook(result.current.start).then(() => {
      expect(result.current.isListening).to.be.true;
    });

    cy.mockRecording('audio_samples/test.wav');

    cy.wrapHook(result.current.stop).then(() => {
      expect(result.current.isListening).to.be.false;

      let completeTranscript = '';
      result.all.forEach(resultObj => {
        if ('result' in resultObj && resultObj.result !== null) {
          completeTranscript += resultObj.result.partialTranscript;
        }
      });

      expect(completeTranscript).to.eq(
        'Mr. Quilter is the apostle of the middle classes and we are glad to welcome his gospel.'
      );
    });

    cy.wrapHook(result.current.release).then(() => {
      expect(
        result.current.isLoaded,
        `Failed to release cheetah with ${result.current.error}`
      ).to.be.false;
    });
  });
});
