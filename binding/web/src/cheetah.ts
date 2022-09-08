/*
  Copyright 2022 Picovoice Inc.

  You may not use this file except in compliance with the license. A copy of the license is located in the "LICENSE"
  file accompanying this source.

  Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on
  an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the
  specific language governing permissions and limitations under the License.
*/

/* eslint camelcase: 0 */

import { Mutex } from 'async-mutex';

import {
  aligned_alloc_type,
  pv_free_type,
  buildWasm,
  arrayBufferToStringAtIndex,
  isAccessKeyValid,
  fromBase64,
  fromPublicDirectory,
  loadModel,
} from '@picovoice/web-utils';

import { simd } from 'wasm-feature-detect';

import { CheetahModel, CheetahOptions, CheetahTranscript } from './types';

/**
 * WebAssembly function types
 */
type pv_cheetah_init_type = (accessKey: number, modelPath: number, endpointDurationSec: number, enableAutomaticPunctuation: number, object: number) => Promise<number>;
type pv_cheetah_process_type = (object: number, pcm: number, transcript: number, isEndpoint: number) => Promise<number>;
type pv_cheetah_flush_type = (object: number, transcript: number) => Promise<number>;
type pv_cheetah_delete_type = (object: number) => Promise<void>;
type pv_status_to_string_type = (status: number) => Promise<number>
type pv_cheetah_frame_length_type = () => Promise<number>;
type pv_sample_rate_type = () => Promise<number>;
type pv_cheetah_version_type = () => Promise<number>;

/**
 * JavaScript/WebAssembly Binding for Cheetah
 */

type CheetahWasmOutput = {
  aligned_alloc: aligned_alloc_type;
  memory: WebAssembly.Memory;
  pvFree: pv_free_type;
  objectAddress: number;
  pvCheetahDelete: pv_cheetah_delete_type;
  pvCheetahProcess: pv_cheetah_process_type;
  pvCheetahFlush: pv_cheetah_flush_type;
  pvStatusToString: pv_status_to_string_type;
  frameLength: number
  sampleRate: number;
  version: string;
  inputBufferAddress: number;
  isEndpointAddress: number;
  transcriptAddressAddress: number;
};

const PV_STATUS_SUCCESS = 10000;

export class Cheetah {
  private readonly _pvCheetahDelete: pv_cheetah_delete_type;
  private readonly _pvCheetahProcess: pv_cheetah_process_type;
  private readonly _pvCheetahFlush: pv_cheetah_flush_type;
  private readonly _pvStatusToString: pv_status_to_string_type;

  private _wasmMemory: WebAssembly.Memory | undefined;
  private readonly _pvFree: pv_free_type;
  private readonly _memoryBuffer: Int16Array;
  private readonly _memoryBufferUint8: Uint8Array;
  private readonly _memoryBufferView: DataView;
  private readonly _processMutex: Mutex;

  private readonly _objectAddress: number;
  private readonly _inputBufferAddress: number;
  private readonly _alignedAlloc: CallableFunction;
  private readonly _isEndpointAddress: number;
  private readonly _transcriptAddressAddress: number;

  private static _frameLength: number;
  private static _sampleRate: number;
  private static _version: string;
  private static _wasm: string;
  private static _wasmSimd: string;

  private static _cheetahMutex = new Mutex();

  private readonly _transcriptCallback: (cheetahTranscript: CheetahTranscript) => void;
  private readonly _processErrorCallback?: (error: string) => void;

  private constructor(
    handleWasm: CheetahWasmOutput,
    transcriptCallback: (cheetahTranscript: CheetahTranscript) => void,
    processErrorCallback?: (error: string) => void,
  ) {
    Cheetah._frameLength = handleWasm.frameLength;
    Cheetah._sampleRate = handleWasm.sampleRate;
    Cheetah._version = handleWasm.version;

    this._pvCheetahDelete = handleWasm.pvCheetahDelete;
    this._pvCheetahProcess = handleWasm.pvCheetahProcess;
    this._pvCheetahFlush = handleWasm.pvCheetahFlush;
    this._pvStatusToString = handleWasm.pvStatusToString;

    this._wasmMemory = handleWasm.memory;
    this._pvFree = handleWasm.pvFree;
    this._objectAddress = handleWasm.objectAddress;
    this._inputBufferAddress = handleWasm.inputBufferAddress;
    this._alignedAlloc = handleWasm.aligned_alloc;
    this._isEndpointAddress = handleWasm.isEndpointAddress;
    this._transcriptAddressAddress = handleWasm.transcriptAddressAddress;

    this._memoryBuffer = new Int16Array(handleWasm.memory.buffer);
    this._memoryBufferUint8 = new Uint8Array(handleWasm.memory.buffer);
    this._memoryBufferView = new DataView(handleWasm.memory.buffer);
    this._processMutex = new Mutex();

    this._transcriptCallback = transcriptCallback;
    this._processErrorCallback = processErrorCallback;
  }

  /**
   * Get Cheetah engine version.
   */
  get version(): string {
    return Cheetah._version;
  }

  /**
   * Get frame length.
   */
  get frameLength(): number {
    return Cheetah._frameLength;
  }

  /**
   * Get sample rate.
   */
  get sampleRate(): number {
    return Cheetah._sampleRate;
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

  /**
   * Creates an instance of the Picovoice Cheetah Speech-to-Text engine.
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
   * @returns An instance of the Cheetah engine.
   */
  public static async create(
    accessKey: string,
    transcriptCallback: (cheetahTranscript: CheetahTranscript) => void,
    model: CheetahModel,
    options: CheetahOptions = {},
  ): Promise<Cheetah> {
    const customWritePath = (model.customWritePath) ? model.customWritePath : 'cheetah_model';
    const modelPath = await loadModel({ ...model, customWritePath });

    return Cheetah._init(
      accessKey,
      transcriptCallback,
      modelPath,
      options
    );
  }

  public static async _init(
    accessKey: string,
    transcriptCallback: (cheetahTranscript: CheetahTranscript) => void,
    modelPath: string,
    options: CheetahOptions = {},
  ): Promise<Cheetah> {
    const { processErrorCallback } = options;

    if (!isAccessKeyValid(accessKey)) {
      throw new Error('Invalid AccessKey');
    }

    return new Promise<Cheetah>((resolve, reject) => {
      Cheetah._cheetahMutex
        .runExclusive(async () => {
          const isSimd = await simd();
          const wasmOutput = await Cheetah.initWasm(accessKey.trim(), (isSimd) ? this._wasmSimd : this._wasm, modelPath, options);
          return new Cheetah(wasmOutput, transcriptCallback, processErrorCallback);
        })
        .then((result: Cheetah) => {
          resolve(result);
        })
        .catch((error: any) => {
          reject(error);
        });
    });
  }

  /**
   * Processes a frame of audio. The required sample rate can be retrieved from '.sampleRate' and the length
   * of frame (number of audio samples per frame) can be retrieved from '.frameLength' The audio needs to be
   * 16-bit linearly-encoded. Furthermore, the engine operates on single-channel audio.
   *
   * @param pcm A frame of audio with properties described above.
   */
  public async process(pcm: Int16Array): Promise<void> {
    if (!(pcm instanceof Int16Array)) {
      const error = new Error('The argument \'pcm\' must be provided as an Int16Array');
      if (this._processErrorCallback) {
        this._processErrorCallback(error.toString());
      } else {
        // eslint-disable-next-line no-console
        console.error(error);
      }
    }

    this._processMutex
      .runExclusive(async () => {
        if (this._wasmMemory === undefined) {
          throw new Error('Attempted to call Cheetah process after release.');
        }

        this._memoryBuffer.set(
          pcm,
          this._inputBufferAddress / Int16Array.BYTES_PER_ELEMENT,
        );

        const status = await this._pvCheetahProcess(
          this._objectAddress,
          this._inputBufferAddress,
          this._transcriptAddressAddress,
          this._isEndpointAddress,
        );
        if (status !== PV_STATUS_SUCCESS) {
          const memoryBuffer = new Uint8Array(this._wasmMemory.buffer);
          throw new Error(
            `process failed with status ${arrayBufferToStringAtIndex(
              memoryBuffer,
              await this._pvStatusToString(status),
            )}`,
          );
        }

        const isEndpoint = this._memoryBufferView.getUint8(this._isEndpointAddress) === 1;

        const transcriptAddress = this._memoryBufferView.getInt32(
          this._transcriptAddressAddress,
          true,
        );

        let transcript = arrayBufferToStringAtIndex(
          this._memoryBufferUint8,
          transcriptAddress,
        );
        await this._pvFree(transcriptAddress);

        this._transcriptCallback({ transcript });

        if (isEndpoint) {
          transcript = await this.cheetahFlush();
          this._transcriptCallback({
            transcript,
            isEndpoint: true
          });
        }
      })
      .catch((error: any) => {
        if (this._processErrorCallback) {
          this._processErrorCallback(error.toString());
        } else {
          // eslint-disable-next-line no-console
          console.error(error);
        }
      });
  }

  /**
   * Marks the end of the audio stream, flushes internal state of the object, and returns any remaining transcribed
   * text.
   *
   * @return Any remaining transcribed text. If none is available then an empty string is returned.
   */
  public async flush(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      this._processMutex
        .runExclusive(async () => await this.cheetahFlush())
        .then((transcript: string) => {
          this._transcriptCallback({
            transcript: transcript
          });
          resolve();
        })
        .catch((error: any) => {
          reject(error);
        });
    });
  }

  private async cheetahFlush(): Promise<string> {
    if (this._wasmMemory === undefined) {
      throw new Error('Attempted to call Cheetah flush after release.');
    }

    const status = await this._pvCheetahFlush(
      this._objectAddress,
      this._transcriptAddressAddress,
    );

    if (status !== PV_STATUS_SUCCESS) {
      const memoryBuffer = new Uint8Array(this._wasmMemory.buffer);
      throw new Error(
        `process failed with status ${arrayBufferToStringAtIndex(
          memoryBuffer,
          await this._pvStatusToString(status),
        )}`,
      );
    }

    const transcriptAddress = this._memoryBufferView.getInt32(
      this._transcriptAddressAddress,
      true,
    );

    const transcript = arrayBufferToStringAtIndex(
      this._memoryBufferUint8,
      transcriptAddress,
    );
    await this._pvFree(transcriptAddress);

    return transcript;
  }

  /**
   * Releases resources acquired by WebAssembly module.
   */
  public async release(): Promise<void> {
    await this._pvCheetahDelete(this._objectAddress);
    await this._pvFree(this._inputBufferAddress);
    delete this._wasmMemory;
    this._wasmMemory = undefined;
  }

  async onmessage(e: MessageEvent): Promise<void> {
    switch (e.data.command) {
      case 'process':
        await this.process(e.data.inputFrame);
        break;
      default:
        // eslint-disable-next-line no-console
        console.warn(`Unrecognized command: ${e.data.command}`);
    }
  }

  private static async initWasm(accessKey: string, wasmBase64: string, modelPath: string, options: CheetahOptions): Promise<any> {
    const { endpointDurationSec = 1.0, enableAutomaticPunctuation = false } = options;

    if (typeof endpointDurationSec !== 'number' || endpointDurationSec < 0) {
      throw new Error('Cheetah endpointDurationSec must be a non-negative number');
    }

    // A WebAssembly page has a constant size of 64KiB. -> 1MiB ~= 16 pages
    const memory = new WebAssembly.Memory({ initial: 3370 });

    const memoryBufferUint8 = new Uint8Array(memory.buffer);

    const exports = await buildWasm(memory, wasmBase64);

    const aligned_alloc = exports.aligned_alloc as aligned_alloc_type;
    const pv_free = exports.pv_free as pv_free_type;
    const pv_cheetah_version = exports.pv_cheetah_version as pv_cheetah_version_type;
    const pv_cheetah_process = exports.pv_cheetah_process as pv_cheetah_process_type;
    const pv_cheetah_flush = exports.pv_cheetah_flush as pv_cheetah_flush_type;
    const pv_cheetah_delete = exports.pv_cheetah_delete as pv_cheetah_delete_type;
    const pv_cheetah_init = exports.pv_cheetah_init as pv_cheetah_init_type;
    const pv_status_to_string = exports.pv_status_to_string as pv_status_to_string_type;
    const pv_cheetah_frame_length = exports.pv_cheetah_frame_length as pv_cheetah_frame_length_type;
    const pv_sample_rate = exports.pv_sample_rate as pv_sample_rate_type;

    const transcriptAddressAddress = await aligned_alloc(
      Int32Array.BYTES_PER_ELEMENT,
      Int32Array.BYTES_PER_ELEMENT,
    );
    if (transcriptAddressAddress === 0) {
      throw new Error('malloc failed: Cannot allocate memory');
    }

    const isEndpointAddress = await aligned_alloc(
      Uint8Array.BYTES_PER_ELEMENT,
      Uint8Array.BYTES_PER_ELEMENT,
    );
    if (isEndpointAddress === 0) {
      throw new Error('malloc failed: Cannot allocate memory');
    }

    const objectAddressAddress = await aligned_alloc(
      Int32Array.BYTES_PER_ELEMENT,
      Int32Array.BYTES_PER_ELEMENT,
    );
    if (objectAddressAddress === 0) {
      throw new Error('malloc failed: Cannot allocate memory');
    }

    const accessKeyAddress = await aligned_alloc(
      Uint8Array.BYTES_PER_ELEMENT,
      (accessKey.length + 1) * Uint8Array.BYTES_PER_ELEMENT,
    );

    if (accessKeyAddress === 0) {
      throw new Error('malloc failed: Cannot allocate memory');
    }

    for (let i = 0; i < accessKey.length; i++) {
      memoryBufferUint8[accessKeyAddress + i] = accessKey.charCodeAt(i);
    }
    memoryBufferUint8[accessKeyAddress + accessKey.length] = 0;

    const modelPathEncoded = new TextEncoder().encode(modelPath);
    const modelPathAddress = await aligned_alloc(
      Uint8Array.BYTES_PER_ELEMENT,
      (modelPathEncoded.length + 1) * Uint8Array.BYTES_PER_ELEMENT,
    );

    if (modelPathAddress === 0) {
      throw new Error('malloc failed: Cannot allocate memory');
    }

    memoryBufferUint8.set(modelPathEncoded, modelPathAddress);
    memoryBufferUint8[modelPathAddress + modelPathEncoded.length] = 0;

    const status = await pv_cheetah_init(
      accessKeyAddress,
      modelPathAddress,
      endpointDurationSec,
      (enableAutomaticPunctuation) ? 1 : 0,
      objectAddressAddress);
    if (status !== PV_STATUS_SUCCESS) {
      throw new Error(
        `'pv_cheetah_init' failed with status ${arrayBufferToStringAtIndex(
          memoryBufferUint8,
          await pv_status_to_string(status),
        )}`,
      );
    }
    const memoryBufferView = new DataView(memory.buffer);
    const objectAddress = memoryBufferView.getInt32(objectAddressAddress, true);

    const frameLength = await pv_cheetah_frame_length();
    const sampleRate = await pv_sample_rate();
    const versionAddress = await pv_cheetah_version();
    const version = arrayBufferToStringAtIndex(
      memoryBufferUint8,
      versionAddress,
    );

    const inputBufferAddress = await aligned_alloc(
      Int16Array.BYTES_PER_ELEMENT,
      frameLength * Int16Array.BYTES_PER_ELEMENT,
    );
    if (inputBufferAddress === 0) {
      throw new Error('malloc failed: Cannot allocate memory');
    }

    return {
      aligned_alloc,
      memory: memory,
      pvFree: pv_free,
      objectAddress: objectAddress,
      pvCheetahDelete: pv_cheetah_delete,
      pvCheetahProcess: pv_cheetah_process,
      pvCheetahFlush: pv_cheetah_flush,
      pvStatusToString: pv_status_to_string,
      frameLength: frameLength,
      sampleRate: sampleRate,
      version: version,
      inputBufferAddress: inputBufferAddress,
      isEndpointAddress: isEndpointAddress,
      transcriptAddressAddress: transcriptAddressAddress,
    };
  }
}
