/*
  Copyright 2022 Picovoice Inc.

  You may not use this file except in compliance with the license. A copy of the license is located in the "LICENSE"
  file accompanying this source.

  Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on
  an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the
  specific language governing permissions and limitations under the License.
*/

/// <reference no-default-lib="false"/>
/// <reference lib="webworker" />

import { Cheetah } from './cheetah';
import { CheetahWorkerRequest } from './types';

/**
 * Cheetah worker handler.
 */
let cheetah: Cheetah | null = null;
self.onmessage = async function(
  event: MessageEvent<CheetahWorkerRequest>,
): Promise<void> {
  switch (event.data.command) {
    case 'init':
      if (cheetah !== null) {
        self.postMessage({
          command: 'error',
          message: 'Cheetah already initialized',
        });
        return;
      }
      try {
        Cheetah.setWasm(event.data.wasm);
        Cheetah.setWasmSimd(event.data.wasmSimd);
        cheetah = await Cheetah.create(event.data.accessKey, event.data.modelPath, event.data.options);
        self.postMessage({
          command: 'ok',
          version: cheetah.version,
          frameLength: cheetah.frameLength,
          sampleRate: cheetah.sampleRate,
        });
      } catch (e: any) {
        self.postMessage({
          command: 'error',
          message: e.message,
        });
      }
      break;
    case 'process':
      if (cheetah === null) {
        self.postMessage({
          command: 'error',
          message: 'Cheetah not initialized',
        });
        return;
      }
      try {
        const cheetahTranscript = await cheetah.process(event.data.inputFrame);
        self.postMessage({
          command: 'ok',
          cheetahTranscript: cheetahTranscript
        });
        if (cheetahTranscript.isEndpoint) {
          self.postMessage({
            command: 'ok',
            cheetahTranscript: await cheetah.flush(),
          });
        }
      } catch (e: any) {
        self.postMessage({
          command: 'error',
          message: e.message,
        });
      }
      break;
    case 'flush':
      if (cheetah === null) {
        self.postMessage({
          command: 'error',
          message: 'Cheetah not initialized',
        });
        return;
      }
      try {
        self.postMessage({
          command: 'ok',
          cheetahTranscript: await cheetah.flush()
        });
      } catch (e: any) {
        self.postMessage({
          command: 'error',
          message: e.message,
        });
      }
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
        // @ts-ignore
        message: `Unrecognized command: ${event.data.command}`,
      });
  }
};
