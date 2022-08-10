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

import { NativeModules } from 'react-native';
import * as CheetahErrors from './cheetah_errors';
import type { CheetahOptions, CheetahTranscript } from './cheetah_types';

const RCTCheetah = NativeModules.PvCheetah;

type NativeError = {
  code: string;
  message: string;
};

class Cheetah {
  private readonly _handle: string;
  private readonly _frameLength: number;
  private readonly _sampleRate: number;
  private readonly _version: string;

  /**
   * Static creator for initializing Cheetah given the model path.
   * @param accessKey AccessKey obtained from Picovoice Console (https://console.picovoice.ai/).
   * @param modelPath Path to the file containing model parameters.
   * @param options Optional configuration arguments.
   * @param options.endpointDuration Duration of endpoint in seconds. A speech endpoint is detected when there is a
   *                         chunk of audio (with a duration specified herein) after an utterance without any speech in it.
   *                         Set duration to 0 to disable this. Default is 1 second.
   * @param options.enableAutomaticPunctuation Set to `true` to enable automatic punctuation insertion.
   * @returns An instance of the engine.
   */
  public static async create(
    accessKey: string,
    modelPath: string,
    options: CheetahOptions = {}
  ) {
    const { endpointDuration = 1.0, enableAutomaticPunctuation = false } =
      options;

    try {
      let { handle, frameLength, sampleRate, version } =
        await RCTCheetah.create(
          accessKey,
          modelPath,
          endpointDuration,
          enableAutomaticPunctuation
        );
      return new Cheetah(handle, frameLength, sampleRate, version);
    } catch (err) {
      if (err instanceof CheetahErrors.CheetahError) {
        throw err;
      } else {
        const nativeError = err as NativeError;
        throw this.codeToError(nativeError.code, nativeError.message);
      }
    }
  }

  private constructor(
    handle: string,
    frameLength: number,
    sampleRate: number,
    version: string
  ) {
    this._handle = handle;
    this._frameLength = frameLength;
    this._sampleRate = sampleRate;
    this._version = version;
  }

  /**
   * Process a frame of audio with the speech-to-text engine.
   * @param frame An array of 16-bit pcm samples. The number of samples per frame can be attained by calling
   *              `Cheetah.frameLength`. The incoming audio needs to have a sample rate equal to `Cheetah.sampleRate`
   *              and be 16-bit linearly-encoded. Furthermore, Cheetah operates on single-channel audio.
   * @returns {Promise<CheetahTranscript>} transcript of any newly-transcribed speech (if none is available then an
   *                                       empty string is returned) and a flag indicating if an endpoint has been detected.
   */
  async process(frame: number[]): Promise<CheetahTranscript> {
    if (frame === undefined || frame === null) {
      throw new CheetahErrors.CheetahInvalidArgumentError(
        `Frame array provided to process() is undefined or null`
      );
    } else if (frame.length !== this._frameLength) {
      throw new CheetahErrors.CheetahInvalidArgumentError(
        `Size of frame array provided to 'process' (${frame.length}) does not match the engine 'frameLength' (${this._frameLength})`
      );
    }

    // sample the first frame to check for non-integer values
    if (!Number.isInteger(frame[0])) {
      throw new CheetahErrors.CheetahInvalidArgumentError(
        `Non-integer frame values provided to process(): ${frame[0]}. Cheetah requires 16-bit integers`
      );
    }

    try {
      return await RCTCheetah.process(this._handle, frame);
    } catch (err) {
      const nativeError = err as NativeError;
      throw Cheetah.codeToError(nativeError.code, nativeError.message);
    }
  }

  /**
   * Marks the end of the audio stream, flushes internal state of the object, and returns
   * any remaining transcribed text.
   *
   * @returns {Promise<CheetahTranscript>} Any remaining transcribed text. If none is available then an empty string is returned.
   */
  async flush(): Promise<CheetahTranscript> {
    try {
      return RCTCheetah.flush(this._handle);
    } catch (err) {
      const nativeError = err as NativeError;
      throw Cheetah.codeToError(nativeError.code, nativeError.message);
    }
  }

  /**
   * Frees memory that was allocated for Cheetah
   */
  async delete() {
    return RCTCheetah.delete(this._handle);
  }

  /**
   * Gets the required number of audio samples per frame.
   * @returns Required frame length.
   */
  get frameLength() {
    return this._frameLength;
  }

  /**
   * Get the audio sample rate required by Cheetah.
   * @returns Required sample rate.
   */
  get sampleRate() {
    return this._sampleRate;
  }

  /**
   * Gets the version number of the Cheetah library.
   * @returns Version of Cheetah
   */
  get version() {
    return this._version;
  }

  /**
   * Gets the Error type given a code.
   * @param code Code name of native Error.
   * @param message Detailed message of the error.
   */
  private static codeToError(code: string, message: string) {
    switch (code) {
      case 'CheetahException':
        return new CheetahErrors.CheetahError(message);
      case 'CheetahMemoryException':
        return new CheetahErrors.CheetahMemoryError(message);
      case 'CheetahIOException':
        return new CheetahErrors.CheetahIOError(message);
      case 'CheetahInvalidArgumentException':
        return new CheetahErrors.CheetahInvalidArgumentError(message);
      case 'CheetahStopIterationException':
        return new CheetahErrors.CheetahStopIterationError(message);
      case 'CheetahKeyException':
        return new CheetahErrors.CheetahKeyError(message);
      case 'CheetahInvalidStateException':
        return new CheetahErrors.CheetahInvalidStateError(message);
      case 'CheetahRuntimeException':
        return new CheetahErrors.CheetahRuntimeError(message);
      case 'CheetahActivationException':
        return new CheetahErrors.CheetahActivationError(message);
      case 'CheetahActivationLimitException':
        return new CheetahErrors.CheetahActivationLimitError(message);
      case 'CheetahActivationThrottledException':
        return new CheetahErrors.CheetahActivationThrottledError(message);
      case 'CheetahActivationRefusedException':
        return new CheetahErrors.CheetahActivationRefusedError(message);
      default:
        throw new Error(`unexpected code: ${code}, message: ${message}`);
    }
  }
}

export default Cheetah;
