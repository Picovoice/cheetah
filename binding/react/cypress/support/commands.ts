import { WebVoiceProcessor } from '@picovoice/web-voice-processor';
import { act } from '@testing-library/react-hooks/dom';

const WAV_HEADER_SIZE = 44;

Cypress.Commands.add('wrapHook', (fn: () => Promise<any>) =>
  cy.wrap(null).then(async () => {
    await act(async () => {
      await fn();
    });
  })
);

Cypress.Commands.add('mockRecording', (path: string, delayMs = 2000) => {
  // @ts-ignore
  const instance = WebVoiceProcessor.instance();

  instance._microphoneStream?.getAudioTracks().forEach((track: any) => {
    track.stop();
  });

  cy.fixture(path, 'base64')
    .then(Cypress.Blob.base64StringToBlob)
    .then(async blob => {
      let data = new Int16Array(await blob.arrayBuffer());
      data = data.slice(WAV_HEADER_SIZE / Int16Array.BYTES_PER_ELEMENT);
      for (let i = 0; i < data.length; i += 512) {
        instance.recorderCallback(data.slice(i, i + 512));
      }
    })
    .wait(delayMs);
});
