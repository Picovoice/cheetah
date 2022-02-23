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
"use strict";

const fs = require("fs");
const path = require("path");
const assert = require('assert');

const PV_STATUS_T = require("./pv_status_t");
const {
  PvArgumentError,
  PvStateError,
  pvStatusToException,
} = require("./errors");

const { getSystemLibraryPath } = require("./platforms");

const DEFAULT_MODEL_PATH = "lib/common/cheetah_params.pv";

/**
 * Node.js binding for Cheetah streaming speech-to-text engine
 *
 * Performs the calls to the Cheetah node library. Does some basic parameter validation to prevent
 * errors occurring in the library layer. Provides clearer error messages in native JavaScript.
 */
class Cheetah {
  /**
   * Creates an instance of Cheetah.
   * @param {string} accessKey AccessKey obtained from Picovoice Console (https://console.picovoice.ai/).
   * @param {number} endpointDurationSec Duration of endpoint in seconds. A speech endpoint is detected when there is a segment of audio 
   * (with a duration specified herein) after an utterance without any speech in it. Set to `0` to disable endpoint detection.
   * @param {string} modelPath the path to the Cheetah model (.pv extension)
   * @param {string} libraryPath the path to the Cheetah dynamic library (.node extension)
   */
  constructor(accessKey, endpointDurationSec, modelPath, libraryPath) {
    assert(typeof accessKey === 'string');
    
    if (
      accessKey === null ||
      accessKey === undefined ||
      accessKey.length === 0
    ) {
      throw new PvArgumentError(`No AccessKey provided to Cheetah`);
    }

    if (endpointDurationSec < 0) {
      throw new RangeError(
        `Duration of endpoint value in 'endpointDurationSec' must be a positive number: ${endpointDurationSec}`
      );
    }

    if (
      endpointDurationSec === null ||
      endpointDurationSec === undefined
    ) {
      endpointDurationSec = 1.0;
    }

    if (modelPath === undefined || modelPath === null) {
      modelPath = path.resolve(__dirname, DEFAULT_MODEL_PATH);
    }

    if (libraryPath === undefined || modelPath === null) {
      libraryPath = getSystemLibraryPath();
    }

    if (!fs.existsSync(libraryPath)) {
      throw new PvArgumentError(
        `File not found at 'libraryPath': ${libraryPath}`
      );
    }

    if (!fs.existsSync(modelPath)) {
      throw new PvArgumentError(`File not found at 'modelPath': ${modelPath}`);
    }

    const pvCheetah = require(libraryPath);

    let cheetahHandleAndStatus = null;
    try {
      cheetahHandleAndStatus = pvCheetah.init(accessKey, modelPath, endpointDurationSec);
    } catch (err) {
      pvStatusToException(PV_STATUS_T[err.code], err);
    }

    const status = cheetahHandleAndStatus.status;
    if (status !== PV_STATUS_T.SUCCESS) {
      pvStatusToException(status, "Cheetah failed to initialize");
    }

    this._handle = cheetahHandleAndStatus.handle;
    this._pvCheetah = pvCheetah;
    this._sampleRate = pvCheetah.sample_rate();
    this._frameLength = pvCheetah.frame_length();
    this._version = pvCheetah.version();
  }

  /**
   * @returns number of audio samples per frame (i.e. the length of the array provided to the process function)
   * @see {@link process}
   */
  get frameLength() {
    return this._frameLength;
  }

  /**
   * @returns the audio sampling rate accepted by the process function
   * @see {@link process}
   */
  get sampleRate() {
    return this._sampleRate;
  }

  /**
   * @returns the version of the Cheetah engine
   */
  get version() {
    return this._version;
  }

  /**
   * Processes a frame of audio and returns newly-transcribed text and a flag indicating if an endpoint has been detected.
   * Upon detection of an endpoint, the client may invoke `Cheetah.flush()` to retrieve any remaining transcription.
   *
   * @param {Int16Array} pcm Audio data. The audio needs to have a sample rate equal to `Cheetah.sampleRate` and be 16-bit linearly-encoded.
   * This function operates on single-channel audio.
   * @returns {string, bool} Inferred transcription, and a flag indicating if an endpoint has been detected.
   */
  process(pcm) {
    assert(pcm instanceof Int16Array);

    if (
      this._handle === 0 ||
      this._handle === null ||
      this._handle === undefined
    ) {
      throw new PvStateError("Cheetah is not initialized");
    }

    if (pcm === undefined || pcm === null) {
      throw new PvArgumentError(
        `PCM array provided to 'Cheetah.process()' is undefined or null`
      );
    } else if (pcm.length === 0) {
      throw new PvArgumentError(`PCM array provided to 'Cheetah.process()' is empty`);
    }

    let partialTranscriptAndStatus = null;
    try {
      partialTranscriptAndStatus = this._pvCheetah.process(this._handle, pcm);
    } catch (err) {
      pvStatusToException(PV_STATUS_T[err.code], err);
    }

    const status = partialTranscriptAndStatus.status;
    if (status !== PV_STATUS_T.SUCCESS) {
      pvStatusToException(status, "Cheetah failed to process the audio frame");
    }

    return [ partialTranscriptAndStatus.transcript, partialTranscriptAndStatus.is_endpoint === 0 ? false : true ]
  }

  /**
   * Marks the end of the audio stream, flushes internal state of the object, and returns any remaining transcript.
   *
   * @returns {string} Inferred transcription.
   */
  flush() {
    if (
      this._handle === 0 ||
      this._handle === null ||
      this._handle === undefined
    ) {
      throw new PvStateError("Cheetah is not initialized");
    }

    let partialTranscriptAndStatus = null;
    try {
      partialTranscriptAndStatus = this._pvCheetah.flush(this._handle);
    } catch (err) {
      pvStatusToException(PV_STATUS_T[err.code], err);
    }

    const status = partialTranscriptAndStatus.status;
    if (status !== PV_STATUS_T.SUCCESS) {
      pvStatusToException(status, "Cheetah failed to process the audio frame");
    }

    return partialTranscriptAndStatus.transcript
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
      } catch (err) {
        pvStatusToException(PV_STATUS_T[err.code], err);
      }
      this._handle = 0;
    } else {
      console.warn("Cheetah is not initialized");
    }
  }
}

module.exports = Cheetah;
