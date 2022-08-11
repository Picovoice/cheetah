//
// Copyright 2022 Picovoice Inc.
//
// You may not use this file except in compliance with the license. A copy of the license is located in the "LICENSE"
// file accompanying this source.
//
// Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on
// an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the
// specific language governing permissions and limitations under the License.
//

import * as fs from "fs";
import * as path from "path";
import * as assert from "assert";

import PvStatus from "./pv_status_t";

import {
  CheetahInvalidArgumentError,
  CheetahInvalidStateError,
  pvStatusToException,
} from "./errors";

import {
  CheetahOptions,
} from "./types";

import {getSystemLibraryPath} from "./platforms";

const DEFAULT_MODEL_PATH = "../lib/common/cheetah_params.pv";

type CheetahHandleAndStatus = { handle: any; status: PvStatus };
type TranscriptAndStatus = { transcript: string; status: PvStatus };
type PartialTranscriptAndStatus = { transcript: string; is_endpoint: number, status: PvStatus };


/**
 * Node.js binding for Cheetah streaming speech-to-text engine
 *
 * Performs the calls to the Cheetah node library. Does some basic parameter validation to prevent
 * errors occurring in the library layer. Provides clearer error messages in native JavaScript.
 */
export default class Cheetah {
  private _pvCheetah: any;

  private _handle: any;

  private readonly _version: string;
  private readonly _frameLength: number;
  private readonly _sampleRate: number;

  /**
   * Creates an instance of Cheetah.
   * @param {string} accessKey AccessKey obtained from Picovoice Console (https://console.picovoice.ai/).
   * @param options Optional configuration arguments.
   * @param {string} options.modelPath the path to the Cheetah model (.pv extension)
   * @param {string} options.libraryPath the path to the Cheetah library (.node extension)
   * @param {number} options.endpointDurationSec Duration of endpoint in seconds. A speech endpoint is detected when there is a
   * chunk of audio (with a duration specified herein) after an utterance without any speech in it. Set to `0`
   * to disable endpoint detection.
   * @param {boolean} options.enableAutomaticPunctuation Flag to enable automatic punctuation insertion.
   */
  constructor(
    accessKey: string,
    options: CheetahOptions = {}) {
    assert(typeof accessKey === "string");
    if (
      accessKey === null ||
      accessKey === undefined ||
      accessKey.length === 0
    ) {
      throw new CheetahInvalidArgumentError(`No AccessKey provided to Cheetah`);
    }

    const {
      modelPath = path.resolve(__dirname, DEFAULT_MODEL_PATH),
      libraryPath = getSystemLibraryPath(),
      endpointDurationSec = 1.0,
      enableAutomaticPunctuation = false
    } = options;

    if (endpointDurationSec < 0) {
      throw new RangeError(
        `Duration of endpoint value in 'endpointDurationSec' must be a positive number: ${endpointDurationSec}`
      );
    }

    if (!fs.existsSync(libraryPath)) {
      throw new CheetahInvalidArgumentError(
        `File not found at 'libraryPath': ${libraryPath}`
      );
    }

    if (!fs.existsSync(modelPath)) {
      throw new CheetahInvalidArgumentError(
        `File not found at 'modelPath': ${modelPath}`
      );
    }

    const pvCheetah = require(libraryPath);

    let cheetahHandleAndStatus: CheetahHandleAndStatus | null = null;
    try {
      cheetahHandleAndStatus = pvCheetah.init(
        accessKey,
        modelPath,
        endpointDurationSec,
        enableAutomaticPunctuation
      );
    } catch (err: any) {
      pvStatusToException(<PvStatus>err.code, err);
    }

    const status = cheetahHandleAndStatus!.status;
    if (status !== PvStatus.SUCCESS) {
      pvStatusToException(status, "Cheetah failed to initialize");
    }

    this._handle = cheetahHandleAndStatus!.handle;
    this._pvCheetah = pvCheetah;
    this._sampleRate = pvCheetah.sample_rate();
    this._frameLength = pvCheetah.frame_length();
    this._version = pvCheetah.version();
  }

  /**
   * @returns number of audio samples per frame (i.e. the length of the array provided to the process function)
   * @see {@link process}
   */
  get frameLength(): number {
    return this._frameLength;
  }

  /**
   * @returns the audio sampling rate accepted by the process function
   * @see {@link process}
   */
  get sampleRate(): number {
    return this._sampleRate;
  }

  /**
   * @returns the version of the Cheetah engine
   */
  get version(): string {
    return this._version;
  }

  /**
   * Processes a frame of audio and returns newly-transcribed text and a flag indicating if an endpoint has been detected.
   * Upon detection of an endpoint, the client may invoke `Cheetah.flush()` to retrieve any remaining transcription.
   *
   * @param {Int16Array} pcm Audio data. The audio needs to have a sample rate equal to `Cheetah.sampleRate` and be 16-bit linearly-encoded.
   * The specific array length can be attained by calling `Cheetah.frameLength`. This function operates on single-channel audio.
   * @returns {string, bool} Inferred transcription, and a flag indicating if an endpoint has been detected.
   */
  process(pcm: Int16Array): [string, boolean] {
    assert(pcm instanceof Int16Array);

    if (
      this._handle === 0 ||
      this._handle === null ||
      this._handle === undefined
    ) {
      throw new CheetahInvalidStateError("Cheetah is not initialized");
    }

    if (pcm === undefined || pcm === null) {
      throw new CheetahInvalidArgumentError(
        `PCM array provided to 'Cheetah.process()' is undefined or null`
      );
    } else if (pcm.length !== this.frameLength) {
      throw new CheetahInvalidArgumentError(
        `Size of frame array provided to 'Cheetah.process()' (${pcm.length}) does not match the engine 'Cheetah.frameLength' (${this.frameLength})`
      );
    }

    let partialTranscriptAndStatus: PartialTranscriptAndStatus | null = null;
    try {
      partialTranscriptAndStatus = this._pvCheetah.process(this._handle, pcm);
    } catch (err: any) {
      pvStatusToException(<PvStatus>err.code, err);
    }

    const status = partialTranscriptAndStatus!.status;
    if (status !== PvStatus.SUCCESS) {
      pvStatusToException(status, "Cheetah failed to process the audio frame");
    }

    return [
      partialTranscriptAndStatus!.transcript,
      partialTranscriptAndStatus!.is_endpoint === 0 ? false : true,
    ];
  }

  /**
   * Marks the end of the audio stream, flushes internal state of the object, and returns any remaining transcript.
   *
   * @returns {string} Inferred transcription.
   */
  flush(): string {
    if (
      this._handle === 0 ||
      this._handle === null ||
      this._handle === undefined
    ) {
      throw new CheetahInvalidStateError("Cheetah is not initialized");
    }

    let transcriptAndStatus: TranscriptAndStatus | null = null;
    try {
      transcriptAndStatus = this._pvCheetah.flush(this._handle);
    } catch (err: any) {
      pvStatusToException(<PvStatus>err.code, err);
    }

    const status = transcriptAndStatus!.status;
    if (status !== PvStatus.SUCCESS) {
      pvStatusToException(status, "Cheetah failed to process the audio frame");
    }

    return transcriptAndStatus!.transcript;
  }

  /**
   * Releases the resources acquired by Cheetah.
   *
   * Be sure to call this when finished with the instance
   * to reclaim the memory that was allocated by the C library.
   */
  release() {
    if (this._handle !== 0) {
      try {
        this._pvCheetah.delete(this._handle);
      } catch (err: any) {
        pvStatusToException(<PvStatus>err.code, err);
      }
      this._handle = 0;
    } else {
      console.warn("Cheetah is not initialized");
    }
  }
}
