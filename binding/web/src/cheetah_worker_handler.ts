/*
  Copyright 2022-2023 Picovoice Inc.

  You may not use this file except in compliance with the license. A copy of the license is located in the "LICENSE"
  file accompanying this source.

  Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on
  an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the
  specific language governing permissions and limitations under the License.
*/

/// <reference no-default-lib="false"/>
/// <reference lib="webworker" />

import { Cheetah } from './cheetah';
import { CheetahTranscript, CheetahWorkerRequest, PvStatus } from './types';
import { CheetahError } from "./cheetah_errors";

let cheetah: Cheetah | null = null;

const transcriptCallback = (cheetahTranscript: CheetahTranscript): void => {
  self.postMessage({
    command: 'ok',
    cheetahTranscript: cheetahTranscript,
  });
};

const processErrorCallback = (error: CheetahError): void => {
  self.postMessage({
    command: 'error',
    status: error.status,
    shortMessage: error.shortMessage,
    messageStack: error.messageStack
  });
};

/**
 * Cheetah worker handler.
 */
self.onmessage = async function (
  event: MessageEvent<CheetahWorkerRequest>
): Promise<void> {
  switch (event.data.command) {
    case 'init':
      if (cheetah !== null) {
        self.postMessage({
          command: 'error',
          status: PvStatus.INVALID_STATE,
          shortMessage: 'Cheetah already initialized',
        });
        return;
      }
      try {
        Cheetah.setWasm(event.data.wasm);
        Cheetah.setWasmSimd(event.data.wasmSimd);
        cheetah = await Cheetah._init(
          event.data.accessKey,
          transcriptCallback,
          event.data.modelPath,
          { ...event.data.options, processErrorCallback }
        );
        self.postMessage({
          command: 'ok',
          version: cheetah.version,
          frameLength: cheetah.frameLength,
          sampleRate: cheetah.sampleRate,
        });
      } catch (e: any) {
        if (e instanceof CheetahError) {
          self.postMessage({
            command: 'error',
            status: e.status,
            shortMessage: e.shortMessage,
            messageStack: e.messageStack
          });
        } else {
          self.postMessage({
            command: 'error',
            status: PvStatus.RUNTIME_ERROR,
            shortMessage: e.message
          });
        }
      }
      break;
    case 'process':
      if (cheetah === null) {
        self.postMessage({
          command: 'error',
          status: PvStatus.INVALID_STATE,
          shortMessage: 'Cheetah not initialized',
        });
        return;
      }
      await cheetah.process(event.data.inputFrame);
      break;
    case 'flush':
      if (cheetah === null) {
        self.postMessage({
          command: 'error',
          status: PvStatus.INVALID_STATE,
          shortMEssage: 'Cheetah not initialized',
        });
        return;
      }
      await cheetah.flush();
      break;
    case 'release':
      if (cheetah !== null) {
        await cheetah.release();
        cheetah = null;
        close();
      }
      self.postMessage({
        command: 'ok',
      });
      break;
    default:
      self.postMessage({
        command: 'failed',
        status: PvStatus.RUNTIME_ERROR,
        // @ts-ignore
        shortMessage: `Unrecognized command: ${event.data.command}`,
      });
  }
};
