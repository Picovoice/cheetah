/*
  Copyright 2022-2025 Picovoice Inc.

  You may not use this file except in compliance with the license. A copy of the license is located in the "LICENSE"
  file accompanying this source.

  Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on
  an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the
  specific language governing permissions and limitations under the License.
*/

/* eslint camelcase: 0 */

import { Mutex } from 'async-mutex';

import {
  base64ToUint8Array,
  arrayBufferToStringAtIndex,
  isAccessKeyValid,
  loadModel,
} from '@picovoice/web-utils';

import createModule from "./lib/pv_cheetah";
import createModuleSimd from "./lib/pv_cheetah_simd";

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
type pv_cheetah_transcript_delete_type = (transcript: number) => void;
type pv_cheetah_delete_type = (object: number) => void;
type pv_cheetah_frame_length_type = () => number;
type pv_sample_rate_type = () => number;
type pv_cheetah_version_type = () => number;
type pv_set_sdk_type = (sdk: number) => void;
type pv_get_error_stack_type = (messageStack: number, messageStackDepth: number) => number;
type pv_free_error_stack_type = (messageStack: number) => void;

/**
 * JavaScript/WebAssembly Binding for Cheetah
 */

type CheetahModule = EmscriptenModule & {
  _pv_free: (address: number) => void;

  _pv_cheetah_delete: pv_cheetah_delete_type;
  _pv_cheetah_transcript_delete: pv_cheetah_transcript_delete_type;
  _pv_cheetah_frame_length: pv_cheetah_frame_length_type;
  _pv_sample_rate: pv_sample_rate_type;
  _pv_cheetah_version: pv_cheetah_version_type;

  _pv_set_sdk: pv_set_sdk_type;
  _pv_get_error_stack: pv_get_error_stack_type;
  _pv_free_error_stack: pv_free_error_stack_type;

  // em default functions
  addFunction: typeof addFunction;
  ccall: typeof ccall;
  cwrap: typeof cwrap;
}

type CheetahWasmOutput = {
  module: CheetahModule;

  pv_cheetah_process: pv_cheetah_process_type;
  pv_cheetah_flush: pv_cheetah_flush_type;

  frameLength: number;
  sampleRate: number;
  version: string;

  objectAddress: number;
  inputBufferAddress: number;
  isEndpointAddress: number;
  transcriptAddressAddress: number;
  messageStackAddressAddressAddress: number;
  messageStackDepthAddress: number;
};

const PV_STATUS_SUCCESS = 10000;

export class Cheetah {
  private readonly _module: CheetahModule;

  private readonly _pv_cheetah_process: pv_cheetah_process_type;
  private readonly _pv_cheetah_flush: pv_cheetah_flush_type;

  private readonly _version: string;
  private readonly _sampleRate: number;
  private readonly _frameLength: number;

  private readonly _processMutex: Mutex;

  private readonly _objectAddress: number;
  private readonly _inputBufferAddress: number;
  private readonly _isEndpointAddress: number;
  private readonly _transcriptAddressAddress: number;
  private readonly _messageStackAddressAddressAddress: number;
  private readonly _messageStackDepthAddress: number;

  private static _wasm: string;
  private static _wasmLib: string;
  private static _wasmSimd: string;
  private static _wasmSimdLib: string;
  private static _sdk: string = "web";

  private static _cheetahMutex = new Mutex();

  private readonly _transcriptCallback: (cheetahTranscript: CheetahTranscript) => void;
  private readonly _processErrorCallback?: (error: CheetahErrors.CheetahError) => void;

  private constructor(
    handleWasm: CheetahWasmOutput,
    transcriptCallback: (cheetahTranscript: CheetahTranscript) => void,
    processErrorCallback?: (error: CheetahErrors.CheetahError) => void,
  ) {
    this._module = handleWasm.module;

    this._pv_cheetah_process = handleWasm.pv_cheetah_process;
    this._pv_cheetah_flush = handleWasm.pv_cheetah_flush;

    this._version = handleWasm.version;
    this._sampleRate = handleWasm.sampleRate;
    this._frameLength = handleWasm.frameLength;

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
    return this._version;
  }

  /**
   * Get frame length.
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
   * Set base64 wasm file.
   * @param wasm Base64'd wasm file to use to initialize wasm.
   */
  public static setWasm(wasm: string): void {
    if (this._wasm === undefined) {
      this._wasm = wasm;
    }
  }

  /**
   * Set base64 wasm file in text format.
   * @param wasmLib Base64'd wasm file in text format.
   */
  public static setWasmLib(wasmLib: string): void {
    if (this._wasmLib === undefined) {
      this._wasmLib = wasmLib;
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
   * Set base64 SIMD wasm file in text format.
   * @param wasmSimdLib Base64'd SIMD wasm file in text format.
   */
  public static setWasmSimdLib(wasmSimdLib: string): void {
    if (this._wasmSimdLib === undefined) {
      this._wasmSimdLib = wasmSimdLib;
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
          const wasmOutput = await Cheetah.initWasm(
            accessKey.trim(),
            modelPath.trim(),
            (isSimd) ? this._wasmSimd : this._wasm,
            (isSimd) ? this._wasmSimdLib : this._wasmLib,
            (isSimd) ? createModuleSimd : createModule,
            options);
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
        if (this._module === undefined) {
          throw new CheetahErrors.CheetahInvalidStateError('Attempted to call Cheetah process after release.');
        }

        this._module.HEAP16.set(
          pcm,
          this._inputBufferAddress / Int16Array.BYTES_PER_ELEMENT,
        );

        const status = await this._pv_cheetah_process(
          this._objectAddress,
          this._inputBufferAddress,
          this._transcriptAddressAddress,
          this._isEndpointAddress,
        );

        if (status !== PV_STATUS_SUCCESS) {
          const messageStack = Cheetah.getMessageStack(
            this._module._pv_get_error_stack,
            this._module._pv_free_error_stack,
            this._messageStackAddressAddressAddress,
            this._messageStackDepthAddress,
            this._module.HEAP32,
            this._module.HEAPU8
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

        const isEndpoint = this._module.HEAPU8[this._isEndpointAddress / Uint8Array.BYTES_PER_ELEMENT] === 1;

        const transcriptAddress = this._module.HEAP32[this._transcriptAddressAddress / Int32Array.BYTES_PER_ELEMENT];

        let transcript = arrayBufferToStringAtIndex(
          this._module.HEAPU8,
          transcriptAddress,
        );
        this._module._pv_cheetah_transcript_delete(transcriptAddress);

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
    if (this._module === undefined) {
      throw new CheetahErrors.CheetahInvalidStateError('Attempted to call Cheetah flush after release.');
    }

    const status = await this._pv_cheetah_flush(
      this._objectAddress,
      this._transcriptAddressAddress,
    );

    if (status !== PV_STATUS_SUCCESS) {
      const messageStack = Cheetah.getMessageStack(
        this._module._pv_get_error_stack,
        this._module._pv_free_error_stack,
        this._messageStackAddressAddressAddress,
        this._messageStackDepthAddress,
        this._module.HEAP32,
        this._module.HEAPU8
      );

      throw pvStatusToException(status, "Flush failed", messageStack);
    }

    const transcriptAddress = this._module.HEAP32[this._transcriptAddressAddress / Int32Array.BYTES_PER_ELEMENT];

    const transcript = arrayBufferToStringAtIndex(
      this._module.HEAPU8,
      transcriptAddress,
    );
    this._module._pv_cheetah_transcript_delete(transcriptAddress);

    return transcript;
  }

  /**
   * Releases resources acquired by WebAssembly module.
   */
  public async release(): Promise<void> {
    if (!this._module) {
      return;
    }
    this._module._pv_cheetah_delete(this._objectAddress);
    this._module._pv_free(this._messageStackAddressAddressAddress);
    this._module._pv_free(this._messageStackDepthAddress);
    this._module._pv_free(this._inputBufferAddress);
    this._module._pv_free(this._isEndpointAddress);
    this._module._pv_free(this._transcriptAddressAddress);
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

  private static async initWasm(
    accessKey: string,
    modelPath: string,
    wasmBase64: string,
    wasmLibBase64: string,
    createModuleFunc: any,
    options: CheetahOptions,
  ): Promise<CheetahWasmOutput> {
    const { endpointDurationSec = 1.0, enableAutomaticPunctuation = false } = options;

    if (typeof endpointDurationSec !== 'number' || endpointDurationSec < 0) {
      throw new CheetahErrors.CheetahInvalidArgumentError('Cheetah endpointDurationSec must be a non-negative number');
    }

    const blob = new Blob(
      [base64ToUint8Array(wasmLibBase64)],
      { type: 'application/javascript' }
    );
    const module: CheetahModule = await createModuleFunc({
      mainScriptUrlOrBlob: blob,
      wasmBinary: base64ToUint8Array(wasmBase64),
    });

    const pv_cheetah_init: pv_cheetah_init_type = this.wrapAsyncFunction(
      module,
      "pv_cheetah_init",
      5);
    const pv_cheetah_process: pv_cheetah_process_type = this.wrapAsyncFunction(
      module,
      "pv_cheetah_process",
      4);
    const pv_cheetah_flush: pv_cheetah_flush_type = this.wrapAsyncFunction(
      module,
      "pv_cheetah_flush",
      2);

    const transcriptAddressAddress = module._malloc(Int32Array.BYTES_PER_ELEMENT);
    if (transcriptAddressAddress === 0) {
      throw new CheetahErrors.CheetahOutOfMemoryError('malloc failed: Cannot allocate memory');
    }

    const isEndpointAddress = module._malloc(Uint8Array.BYTES_PER_ELEMENT);
    if (isEndpointAddress === 0) {
      throw new CheetahErrors.CheetahOutOfMemoryError('malloc failed: Cannot allocate memory');
    }

    const objectAddressAddress = module._malloc(Int32Array.BYTES_PER_ELEMENT);
    if (objectAddressAddress === 0) {
      throw new CheetahErrors.CheetahOutOfMemoryError('malloc failed: Cannot allocate memory');
    }

    const accessKeyAddress = module._malloc((accessKey.length + 1) * Uint8Array.BYTES_PER_ELEMENT);
    if (accessKeyAddress === 0) {
      throw new CheetahErrors.CheetahOutOfMemoryError('malloc failed: Cannot allocate memory');
    }

    for (let i = 0; i < accessKey.length; i++) {
      module.HEAPU8[accessKeyAddress + i] = accessKey.charCodeAt(i);
    }
    module.HEAPU8[accessKeyAddress + accessKey.length] = 0;

    const modelPathEncoded = new TextEncoder().encode(modelPath);
    const modelPathAddress = module._malloc((modelPathEncoded.length + 1) * Uint8Array.BYTES_PER_ELEMENT);

    if (modelPathAddress === 0) {
      throw new CheetahErrors.CheetahOutOfMemoryError('malloc failed: Cannot allocate memory');
    }

    module.HEAPU8.set(modelPathEncoded, modelPathAddress);
    module.HEAPU8[modelPathAddress + modelPathEncoded.length] = 0;

    const sdkEncoded = new TextEncoder().encode(this._sdk);
    const sdkAddress = module._malloc((sdkEncoded.length + 1) * Uint8Array.BYTES_PER_ELEMENT);
    if (!sdkAddress) {
      throw new CheetahErrors.CheetahOutOfMemoryError('malloc failed: Cannot allocate memory');
    }
    module.HEAPU8.set(sdkEncoded, sdkAddress);
    module.HEAPU8[sdkAddress + sdkEncoded.length] = 0;
    module._pv_set_sdk(sdkAddress);
    module._pv_free(sdkAddress);

    const messageStackDepthAddress = module._malloc(Int32Array.BYTES_PER_ELEMENT);
    if (!messageStackDepthAddress) {
      throw new CheetahErrors.CheetahOutOfMemoryError('malloc failed: Cannot allocate memory');
    }

    const messageStackAddressAddressAddress = module._malloc(Int32Array.BYTES_PER_ELEMENT);
    if (!messageStackAddressAddressAddress) {
      throw new CheetahErrors.CheetahOutOfMemoryError('malloc failed: Cannot allocate memory');
    }

    const status = await pv_cheetah_init(
      accessKeyAddress,
      modelPathAddress,
      endpointDurationSec,
      (enableAutomaticPunctuation) ? 1 : 0,
      objectAddressAddress);
    module._pv_free(accessKeyAddress);
    module._pv_free(modelPathAddress);

    if (status !== PV_STATUS_SUCCESS) {
      const messageStack = Cheetah.getMessageStack(
        module._pv_get_error_stack,
        module._pv_free_error_stack,
        messageStackAddressAddressAddress,
        messageStackDepthAddress,
        module.HEAP32,
        module.HEAPU8,
      );

      throw pvStatusToException(status, "Initialization failed", messageStack);
    }

    const objectAddress = module.HEAP32[objectAddressAddress / Int32Array.BYTES_PER_ELEMENT];
    module._pv_free(objectAddressAddress);

    const frameLength = module._pv_cheetah_frame_length();
    const sampleRate = module._pv_sample_rate();
    const versionAddress = module._pv_cheetah_version();
    const version = arrayBufferToStringAtIndex(
      module.HEAPU8,
      versionAddress,
    );

    const inputBufferAddress = module._malloc(frameLength * Int16Array.BYTES_PER_ELEMENT);
    if (inputBufferAddress === 0) {
      throw new CheetahErrors.CheetahOutOfMemoryError('malloc failed: Cannot allocate memory');
    }

    return {
      module: module,

      pv_cheetah_process: pv_cheetah_process,
      pv_cheetah_flush: pv_cheetah_flush,

      frameLength: frameLength,
      sampleRate: sampleRate,
      version: version,

      objectAddress: objectAddress,
      inputBufferAddress: inputBufferAddress,
      isEndpointAddress: isEndpointAddress,
      transcriptAddressAddress: transcriptAddressAddress,
      messageStackAddressAddressAddress: messageStackAddressAddressAddress,
      messageStackDepthAddress: messageStackDepthAddress,
    };
  }

  private static getMessageStack(
    pv_get_error_stack: pv_get_error_stack_type,
    pv_free_error_stack: pv_free_error_stack_type,
    messageStackAddressAddressAddress: number,
    messageStackDepthAddress: number,
    memoryBufferInt32: Int32Array,
    memoryBufferUint8: Uint8Array,
  ): string[] {
    const status = pv_get_error_stack(messageStackAddressAddressAddress, messageStackDepthAddress);
    if (status !== PvStatus.SUCCESS) {
      throw new Error(`Unable to get error state: ${status}`);
    }

    const messageStackAddressAddress = memoryBufferInt32[messageStackAddressAddressAddress / Int32Array.BYTES_PER_ELEMENT];

    const messageStackDepth = memoryBufferInt32[messageStackDepthAddress / Int32Array.BYTES_PER_ELEMENT];
    const messageStack: string[] = [];
    for (let i = 0; i < messageStackDepth; i++) {
      const messageStackAddress = memoryBufferInt32[(messageStackAddressAddress / Int32Array.BYTES_PER_ELEMENT) + i];
      const message = arrayBufferToStringAtIndex(memoryBufferUint8, messageStackAddress);
      messageStack.push(message);
    }

    pv_free_error_stack(messageStackAddressAddress);

    return messageStack;
  }

  private static wrapAsyncFunction(module: CheetahModule, functionName: string, numArgs: number): (...args: any[]) => any {
    // @ts-ignore
    return module.cwrap(
      functionName,
      "number",
      Array(numArgs).fill("number"),
      { async: true }
    );
  }
}
