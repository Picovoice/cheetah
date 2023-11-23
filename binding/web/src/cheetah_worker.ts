/*
  Copyright 2022-2023 Picovoice Inc.

  You may not use this file except in compliance with the license. A copy of the license is located in the "LICENSE"
  file accompanying this source.

  Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on
  an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the
  specific language governing permissions and limitations under the License.
*/

import PvWorker from 'web-worker:./cheetah_worker_handler.ts';

import {
  CheetahModel,
  CheetahOptions,
  CheetahTranscript,
  CheetahWorkerInitResponse,
  CheetahWorkerProcessResponse,
  CheetahWorkerReleaseResponse,
  PvStatus,
} from './types';
import { loadModel } from '@picovoice/web-utils';

import { pvStatusToException } from './cheetah_errors';

export class CheetahWorker {
  private readonly _worker: Worker;
  private readonly _version: string;
  private readonly _frameLength: number;
  private readonly _sampleRate: number;

  private static _wasm: string;
  private static _wasmSimd: string;
  private static _sdk: string = "web";

  private constructor(worker: Worker, version: string, frameLength: number, sampleRate: number) {
    this._worker = worker;
    this._version = version;
    this._frameLength = frameLength;
    this._sampleRate = sampleRate;
  }

  /**
   * Get Cheetah engine version.
   */
  get version(): string {
    return this._version;
  }

  /**
   * Get Cheetah frame length.
   */
  get frameLength(): number {
    return this._frameLength;
  }

  /**
   * Get sample rate.
   */
  get sampleRate(): number {
    return this._sampleRate;
  }

  /**
   * Get Cheetah worker instance.
   */
  get worker(): Worker {
    return this._worker;
  }

  /**
   * Set base64 wasm file.
   * @param wasm Base64'd wasm file to use to initialize wasm.
   */
  public static setWasm(wasm: string): void {
    if (this._wasm === undefined) {
      this._wasm = wasm;
    }
  }

  /**
   * Set base64 wasm file with SIMD feature.
   * @param wasmSimd Base64'd wasm file to use to initialize wasm.
   */
  public static setWasmSimd(wasmSimd: string): void {
    if (this._wasmSimd === undefined) {
      this._wasmSimd = wasmSimd;
    }
  }

  public static setSdk(sdk: string): void {
    CheetahWorker._sdk = sdk;
  }

  /**
   * Creates a worker instance of the Picovoice Cheetah Speech-to-Text engine.
   * Behind the scenes, it requires the WebAssembly code to load and initialize before
   * it can create an instance.
   *
   * @param accessKey AccessKey obtained from Picovoice Console (https://console.picovoice.ai/)
   * @param transcriptCallback User-defined callback to run after receiving transcript result.
   * @param model Cheetah model options.
   * @param model.base64 The model in base64 string to initialize Cheetah.
   * @param model.publicPath The model path relative to the public directory.
   * @param model.customWritePath Custom path to save the model in storage.
   * Set to a different name to use multiple models across `cheetah` instances.
   * @param model.forceWrite Flag to overwrite the model in storage even if it exists.
   * @param model.version Version of the model file. Increment to update the model file in storage.
   * @param options Optional configuration arguments.
   * @param options.endpointDurationSec Duration of endpoint in seconds. A speech endpoint is detected when there is a
   * chunk of audio (with a duration specified herein) after an utterance without any speech in it. Set to `0`
   * to disable endpoint detection.
   * @param options.enableAutomaticPunctuation Flag to enable automatic punctuation insertion.
   * @param options.processErrorCallback User-defined callback invoked if any error happens
   * while processing the audio stream. Its only input argument is the error message.
   *
   * @returns An instance of CheetahWorker.
   */
  public static async create(
    accessKey: string,
    transcriptCallback: (cheetahTranscript: CheetahTranscript) => void,
    model: CheetahModel,
    options: CheetahOptions = {},
  ): Promise<CheetahWorker> {
    const { processErrorCallback, ...workerOptions } = options;

    const customWritePath = (model.customWritePath) ? model.customWritePath : 'cheetah_model';
    const modelPath = await loadModel({ ...model, customWritePath });

    const worker = new PvWorker();
    const returnPromise: Promise<CheetahWorker> = new Promise((resolve, reject) => {
      // @ts-ignore - block from GC
      this.worker = worker;
      worker.onmessage = (event: MessageEvent<CheetahWorkerInitResponse>): void => {
        switch (event.data.command) {
          case 'ok':
            worker.onmessage = (ev: MessageEvent<CheetahWorkerProcessResponse>): void => {
              switch (ev.data.command) {
                case 'ok':
                  transcriptCallback(ev.data.cheetahTranscript);
                  break;
                case 'failed':
                case 'error':
                  const error = pvStatusToException(ev.data.status, ev.data.shortMessage, ev.data.messageStack);
                  if (processErrorCallback) {
                    processErrorCallback(error);
                  } else {
                    // eslint-disable-next-line no-console
                    console.error(error);
                  }
                  break;
                default:
                  // @ts-ignore
                  processErrorCallback(pvStatusToException(PvStatus.RUNTIME_ERROR, `Unrecognized command: ${event.data.command}`));
              }
            };
            resolve(new CheetahWorker(worker, event.data.version, event.data.frameLength, event.data.sampleRate));
            break;
          case 'failed':
          case 'error':
            const error = pvStatusToException(event.data.status, event.data.shortMessage, event.data.messageStack);
            reject(error);
            break;
          default:
            // @ts-ignore
            reject(pvStatusToException(PvStatus.RUNTIME_ERROR, `Unrecognized command: ${event.data.command}`));
        }
      };
    });

    worker.postMessage({
      command: 'init',
      accessKey: accessKey,
      modelPath: modelPath,
      options: workerOptions,
      wasm: this._wasm,
      wasmSimd: this._wasmSimd,
      sdk: this._sdk,
    });

    return returnPromise;
  }

  /**
   * Processes a frame of audio in a worker.
   * The transcript result will be supplied with the callback provided when initializing the worker either
   * by 'fromBase64' or 'fromPublicDirectory'.
   * Can also send a message directly using 'this.worker.postMessage({command: "process", pcm: [...]})'.
   *
   * @param pcm A frame of audio sample.
   */
  public process(pcm: Int16Array): void {
    this._worker.postMessage({
      command: 'process',
      inputFrame: pcm,
    });
  }

  /**
   * Flushes internal state of the object, sends a message to the worker to transcribe remaining text.
   * The transcript result will be supplied with the callback provided when initializing the worker either
   * by 'fromBase64' or 'fromPublicDirectory' with 'endpoint=true'.
   * Can also send a message directly using 'this.worker.postMessage({command: "flush"})'.
   */
  public flush(): void {
    this._worker.postMessage({
      command: 'flush',
    });
  }

  /**
   * Releases resources acquired by WebAssembly module.
   */
  public release(): Promise<void> {
    const returnPromise: Promise<void> = new Promise((resolve, reject) => {
      this._worker.onmessage = (event: MessageEvent<CheetahWorkerReleaseResponse>): void => {
        switch (event.data.command) {
          case 'ok':
            resolve();
            break;
          case 'failed':
          case 'error':
            const error = pvStatusToException(event.data.status, event.data.shortMessage, event.data.messageStack);
            reject(error);
            break;
          default:
            // @ts-ignore
            reject(pvStatusToException(PvStatus.RUNTIME_ERROR, `Unrecognized command: ${event.data.command}`));
        }
      };
    });

    this._worker.postMessage({
      command: 'release',
    });

    return returnPromise;
  }

  /**
   * Terminates the active worker. Stops all requests being handled by worker.
   */
  public terminate(): void {
    this._worker.terminate();
  }
}
