/*
  Copyright 2022-2023 Picovoice Inc.

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
  loadModel,
  PvError
} from '@picovoice/web-utils';

import { simd } from 'wasm-feature-detect';

import { CheetahModel, CheetahOptions, CheetahTranscript, PvStatus } from './types';

import * as CheetahErrors from "./cheetah_errors"
import { pvStatusToException } from './cheetah_errors';

/**
 * WebAssembly function types
 */
type pv_cheetah_init_type = (accessKey: number, modelPath: number, endpointDurationSec: number, enableAutomaticPunctuation: number, object: number) => Promise<number>;
type pv_cheetah_process_type = (object: number, pcm: number, transcript: number, isEndpoint: number) => Promise<number>;
type pv_cheetah_flush_type = (object: number, transcript: number) => Promise<number>;
type pv_cheetah_transcript_delete_type = (transcript: number) => Promise<void>;
type pv_cheetah_delete_type = (object: number) => Promise<void>;
type pv_status_to_string_type = (status: number) => Promise<number>
type pv_cheetah_frame_length_type = () => Promise<number>;
type pv_sample_rate_type = () => Promise<number>;
type pv_cheetah_version_type = () => Promise<number>;
type pv_set_sdk_type = (sdk: number) => Promise<void>;
type pv_get_error_stack_type = (messageStack: number, messageStackDepth: number) => Promise<number>;
type pv_free_error_stack_type = (messageStack: number) => Promise<void>;

/**
 * JavaScript/WebAssembly Binding for Cheetah
 */

type CheetahWasmOutput = {
  aligned_alloc: aligned_alloc_type;
  memory: WebAssembly.Memory;
  pvFree: pv_free_type;

  frameLength: number;
  sampleRate: number;
  version: string;

  objectAddress: number;
  inputBufferAddress: number;
  isEndpointAddress: number;
  transcriptAddressAddress: number;
  messageStackAddressAddressAddress: number;
  messageStackDepthAddress: number;

  pvCheetahDelete: pv_cheetah_delete_type;
  pvCheetahProcess: pv_cheetah_process_type;
  pvCheetahFlush: pv_cheetah_flush_type;
  pvCheetahTranscriptDelete: pv_cheetah_transcript_delete_type;
  pvGetErrorStack: pv_get_error_stack_type;
  pvFreeErrorStack: pv_free_error_stack_type;
};

const PV_STATUS_SUCCESS = 10000;

export class Cheetah {
  private readonly _pvCheetahDelete: pv_cheetah_delete_type;
  private readonly _pvCheetahProcess: pv_cheetah_process_type;
  private readonly _pvCheetahFlush: pv_cheetah_flush_type;
  private readonly _pvCheetahTranscriptDelete: pv_cheetah_transcript_delete_type;
  private readonly _pvGetErrorStack: pv_get_error_stack_type;
  private readonly _pvFreeErrorStack: pv_free_error_stack_type;

  private _wasmMemory: WebAssembly.Memory | undefined;

  private readonly _pvFree: pv_free_type;
  private readonly _processMutex: Mutex;

  private readonly _objectAddress: number;
  private readonly _inputBufferAddress: number;
  private readonly _isEndpointAddress: number;
  private readonly _transcriptAddressAddress: number;
  private readonly _messageStackAddressAddressAddress: number;
  private readonly _messageStackDepthAddress: number;

  private static _frameLength: number;
  private static _sampleRate: number;
  private static _version: string;
  private static _wasm: string;
  private static _wasmSimd: string;
  private static _sdk: string = "web";

  private static _cheetahMutex = new Mutex();

  private readonly _transcriptCallback: (cheetahTranscript: CheetahTranscript) => void;
  private readonly _processErrorCallback?: (error: CheetahErrors.CheetahError) => void;

  private constructor(
    handleWasm: CheetahWasmOutput,
    transcriptCallback: (cheetahTranscript: CheetahTranscript) => void,
    processErrorCallback?: (error: CheetahErrors.CheetahError) => void,
  ) {
    Cheetah._frameLength = handleWasm.frameLength;
    Cheetah._sampleRate = handleWasm.sampleRate;
    Cheetah._version = handleWasm.version;

    this._pvCheetahDelete = handleWasm.pvCheetahDelete;
    this._pvCheetahProcess = handleWasm.pvCheetahProcess;
    this._pvCheetahFlush = handleWasm.pvCheetahFlush;
    this._pvCheetahTranscriptDelete = handleWasm.pvCheetahTranscriptDelete;
    this._pvGetErrorStack = handleWasm.pvGetErrorStack;
    this._pvFreeErrorStack = handleWasm.pvFreeErrorStack;

    this._wasmMemory = handleWasm.memory;
    this._pvFree = handleWasm.pvFree;
    this._objectAddress = handleWasm.objectAddress;
    this._inputBufferAddress = handleWasm.inputBufferAddress;
    this._isEndpointAddress = handleWasm.isEndpointAddress;
    this._transcriptAddressAddress = handleWasm.transcriptAddressAddress;
    this._messageStackAddressAddressAddress = handleWasm.messageStackAddressAddressAddress;
    this._messageStackDepthAddress = handleWasm.messageStackDepthAddress;

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

  public static setSdk(sdk: string): void {
    Cheetah._sdk = sdk;
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
      throw new CheetahErrors.CheetahInvalidArgumentError('Invalid AccessKey');
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
      const error = new CheetahErrors.CheetahInvalidArgumentError('The argument \'pcm\' must be provided as an Int16Array');
      if (this._processErrorCallback) {
        this._processErrorCallback(error);
      } else {
        // eslint-disable-next-line no-console
        console.error(error);
      }
    }

    this._processMutex
      .runExclusive(async () => {
        if (this._wasmMemory === undefined) {
          throw new CheetahErrors.CheetahInvalidStateError('Attempted to call Cheetah process after release.');
        }

        const memoryBuffer = new Int16Array(this._wasmMemory.buffer);

        memoryBuffer.set(
          pcm,
          this._inputBufferAddress / Int16Array.BYTES_PER_ELEMENT,
        );

        const status = await this._pvCheetahProcess(
          this._objectAddress,
          this._inputBufferAddress,
          this._transcriptAddressAddress,
          this._isEndpointAddress,
        );

        // Important that these get initialized after await so `_wasmMemory` is unchanged.
        const memoryBufferUint8 = new Uint8Array(this._wasmMemory.buffer);
        const memoryBufferView = new DataView(this._wasmMemory.buffer);

        if (status !== PV_STATUS_SUCCESS) {
          const messageStack = await Cheetah.getMessageStack(
            this._pvGetErrorStack,
            this._pvFreeErrorStack,
            this._messageStackAddressAddressAddress,
            this._messageStackDepthAddress,
            memoryBufferView,
            memoryBufferUint8
          );

          const error = pvStatusToException(status, "Processing failed", messageStack);
          if (this._processErrorCallback) {
            this._processErrorCallback(error);
          } else {
            // eslint-disable-next-line no-console
            console.error(error);
          }
          return;
        }

        const isEndpoint = memoryBufferView.getUint8(this._isEndpointAddress) === 1;

        const transcriptAddress = memoryBufferView.getInt32(
          this._transcriptAddressAddress,
          true,
        );

        let transcript = arrayBufferToStringAtIndex(
          memoryBufferUint8,
          transcriptAddress,
        );
        await this._pvCheetahTranscriptDelete(transcriptAddress);

        this._transcriptCallback({ transcript });

        if (isEndpoint) {
          transcript = await this.cheetahFlush();
          this._transcriptCallback({
            transcript,
            isEndpoint: true,
          });
        }
      })
      .catch(async (error: any) => {
        if (this._processErrorCallback) {
          this._processErrorCallback(error);
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
    // eslint-disable-next-line consistent-return
    return new Promise<void>((resolve, reject) => {
      this._processMutex
        .runExclusive(async () => await this.cheetahFlush())
        .then((transcript: string) => {
          this._transcriptCallback({
            transcript: transcript,
            isFlushed: true,
          });
          resolve();
        })
        .catch(async (error: any) => {
          if (this._processErrorCallback) {
            this._processErrorCallback(error);
          } else {
            // eslint-disable-next-line no-console
            console.error(error);
          }
        });
    });
  }

  private async cheetahFlush(): Promise<string> {
    if (this._wasmMemory === undefined) {
      throw new CheetahErrors.CheetahInvalidStateError('Attempted to call Cheetah flush after release.');
    }

    const status = await this._pvCheetahFlush(
      this._objectAddress,
      this._transcriptAddressAddress,
    );

    const memoryBufferUint8 = new Uint8Array(this._wasmMemory.buffer);
    const memoryBufferView = new DataView(this._wasmMemory.buffer);

    if (status !== PV_STATUS_SUCCESS) {
      const messageStack = await Cheetah.getMessageStack(
        this._pvGetErrorStack,
        this._pvFreeErrorStack,
        this._messageStackAddressAddressAddress,
        this._messageStackDepthAddress,
        memoryBufferView,
        memoryBufferUint8
      );

      throw pvStatusToException(status, "Flush failed", messageStack);
    }

    const transcriptAddress = memoryBufferView.getInt32(
      this._transcriptAddressAddress,
      true,
    );

    const transcript = arrayBufferToStringAtIndex(
      memoryBufferUint8,
      transcriptAddress,
    );
    await this._pvCheetahTranscriptDelete(transcriptAddress);

    return transcript;
  }

  /**
   * Releases resources acquired by WebAssembly module.
   */
  public async release(): Promise<void> {
    await this._pvCheetahDelete(this._objectAddress);
    await this._pvFree(this._messageStackAddressAddressAddress);
    await this._pvFree(this._messageStackDepthAddress);
    await this._pvFree(this._inputBufferAddress);
    await this._pvFree(this._isEndpointAddress);
    await this._pvFree(this._transcriptAddressAddress);
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
      throw new CheetahErrors.CheetahInvalidArgumentError('Cheetah endpointDurationSec must be a non-negative number');
    }

    // A WebAssembly page has a constant size of 64KiB. -> 1MiB ~= 16 pages
    const memory = new WebAssembly.Memory({ initial: 3700 });

    const memoryBufferUint8 = new Uint8Array(memory.buffer);

    const pvError = new PvError();

    const exports = await buildWasm(memory, wasmBase64, pvError);

    const aligned_alloc = exports.aligned_alloc as aligned_alloc_type;
    const pv_free = exports.pv_free as pv_free_type;
    const pv_cheetah_version = exports.pv_cheetah_version as pv_cheetah_version_type;
    const pv_cheetah_process = exports.pv_cheetah_process as pv_cheetah_process_type;
    const pv_cheetah_flush = exports.pv_cheetah_flush as pv_cheetah_flush_type;
    const pv_cheetah_transcript_delete = exports.pv_cheetah_transcript_delete as pv_cheetah_transcript_delete_type;
    const pv_cheetah_delete = exports.pv_cheetah_delete as pv_cheetah_delete_type;
    const pv_cheetah_init = exports.pv_cheetah_init as pv_cheetah_init_type;
    const pv_cheetah_frame_length = exports.pv_cheetah_frame_length as pv_cheetah_frame_length_type;
    const pv_sample_rate = exports.pv_sample_rate as pv_sample_rate_type;
    const pv_set_sdk = exports.pv_set_sdk as pv_set_sdk_type;
    const pv_get_error_stack = exports.pv_get_error_stack as pv_get_error_stack_type;
    const pv_free_error_stack = exports.pv_free_error_stack as pv_free_error_stack_type;

    const transcriptAddressAddress = await aligned_alloc(
      Int32Array.BYTES_PER_ELEMENT,
      Int32Array.BYTES_PER_ELEMENT,
    );
    if (transcriptAddressAddress === 0) {
      throw new CheetahErrors.CheetahOutOfMemoryError('malloc failed: Cannot allocate memory');
    }

    const isEndpointAddress = await aligned_alloc(
      Uint8Array.BYTES_PER_ELEMENT,
      Uint8Array.BYTES_PER_ELEMENT,
    );
    if (isEndpointAddress === 0) {
      throw new CheetahErrors.CheetahOutOfMemoryError('malloc failed: Cannot allocate memory');
    }

    const objectAddressAddress = await aligned_alloc(
      Int32Array.BYTES_PER_ELEMENT,
      Int32Array.BYTES_PER_ELEMENT,
    );
    if (objectAddressAddress === 0) {
      throw new CheetahErrors.CheetahOutOfMemoryError('malloc failed: Cannot allocate memory');
    }

    const accessKeyAddress = await aligned_alloc(
      Uint8Array.BYTES_PER_ELEMENT,
      (accessKey.length + 1) * Uint8Array.BYTES_PER_ELEMENT,
    );

    if (accessKeyAddress === 0) {
      throw new CheetahErrors.CheetahOutOfMemoryError('malloc failed: Cannot allocate memory');
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
      throw new CheetahErrors.CheetahOutOfMemoryError('malloc failed: Cannot allocate memory');
    }

    memoryBufferUint8.set(modelPathEncoded, modelPathAddress);
    memoryBufferUint8[modelPathAddress + modelPathEncoded.length] = 0;

    const sdkEncoded = new TextEncoder().encode(this._sdk);
    const sdkAddress = await aligned_alloc(
      Uint8Array.BYTES_PER_ELEMENT,
      (sdkEncoded.length + 1) * Uint8Array.BYTES_PER_ELEMENT
    );
    if (!sdkAddress) {
      throw new CheetahErrors.CheetahOutOfMemoryError('malloc failed: Cannot allocate memory');
    }
    memoryBufferUint8.set(sdkEncoded, sdkAddress);
    memoryBufferUint8[sdkAddress + sdkEncoded.length] = 0;
    await pv_set_sdk(sdkAddress);

    const messageStackDepthAddress = await aligned_alloc(
      Int32Array.BYTES_PER_ELEMENT,
      Int32Array.BYTES_PER_ELEMENT
    );
    if (!messageStackDepthAddress) {
      throw new CheetahErrors.CheetahOutOfMemoryError('malloc failed: Cannot allocate memory');
    }

    const messageStackAddressAddressAddress = await aligned_alloc(
      Int32Array.BYTES_PER_ELEMENT,
      Int32Array.BYTES_PER_ELEMENT
    );
    if (!messageStackAddressAddressAddress) {
      throw new CheetahErrors.CheetahOutOfMemoryError('malloc failed: Cannot allocate memory');
    }

    const memoryBufferView = new DataView(memory.buffer);

    const status = await pv_cheetah_init(
      accessKeyAddress,
      modelPathAddress,
      endpointDurationSec,
      (enableAutomaticPunctuation) ? 1 : 0,
      objectAddressAddress);
    if (status !== PV_STATUS_SUCCESS) {
      const messageStack = await Cheetah.getMessageStack(
        pv_get_error_stack,
        pv_free_error_stack,
        messageStackAddressAddressAddress,
        messageStackDepthAddress,
        memoryBufferView,
        memoryBufferUint8
      );

      throw pvStatusToException(status, "Initialization failed", messageStack, pvError);
    }

    const objectAddress = memoryBufferView.getInt32(objectAddressAddress, true);
    await pv_free(objectAddressAddress);

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
      throw new CheetahErrors.CheetahOutOfMemoryError('malloc failed: Cannot allocate memory');
    }

    return {
      aligned_alloc,
      memory: memory,
      pvFree: pv_free,

      frameLength: frameLength,
      sampleRate: sampleRate,
      version: version,
      
      objectAddress: objectAddress,
      inputBufferAddress: inputBufferAddress,
      isEndpointAddress: isEndpointAddress,
      transcriptAddressAddress: transcriptAddressAddress,
      messageStackAddressAddressAddress: messageStackAddressAddressAddress,
      messageStackDepthAddress: messageStackDepthAddress,

      pvCheetahDelete: pv_cheetah_delete,
      pvCheetahProcess: pv_cheetah_process,
      pvCheetahFlush: pv_cheetah_flush,
      pvCheetahTranscriptDelete: pv_cheetah_transcript_delete,
      pvGetErrorStack: pv_get_error_stack,
      pvFreeErrorStack: pv_free_error_stack,
    };
  }

  private static async getMessageStack(
    pv_get_error_stack: pv_get_error_stack_type,
    pv_free_error_stack: pv_free_error_stack_type,
    messageStackAddressAddressAddress: number,
    messageStackDepthAddress: number,
    memoryBufferView: DataView,
    memoryBufferUint8: Uint8Array,
  ): Promise<string[]> {
    const status = await pv_get_error_stack(messageStackAddressAddressAddress, messageStackDepthAddress);
    if (status != PvStatus.SUCCESS) {
      throw pvStatusToException(status, "Unable to get Cheetah error state");
    }

    const messageStackAddressAddress = memoryBufferView.getInt32(messageStackAddressAddressAddress, true);

    const messageStackDepth = memoryBufferView.getInt32(messageStackDepthAddress, true);
    const messageStack: string[] = [];
    for (let i = 0; i < messageStackDepth; i++) {
      const messageStackAddress = memoryBufferView.getInt32(
        messageStackAddressAddress + (i * Int32Array.BYTES_PER_ELEMENT), true);
      const message = arrayBufferToStringAtIndex(memoryBufferUint8, messageStackAddress);
      messageStack.push(message);
    }

    pv_free_error_stack(messageStackAddressAddress);

    return messageStack;
  }
}
