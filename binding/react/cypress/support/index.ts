import './commands';

/* eslint-disable no-unused-vars */
declare global {
  namespace Cypress {
    interface Chainable {
      wrapHook(fn: () => Promise<any>): Chainable<void>;
      mockRecording(path: string, delayMs?: number): Chainable<void>;
    }
  }
}
