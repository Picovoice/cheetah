//
// Copyright 2022-2023 Picovoice Inc.
//
// You may not use this file except in compliance with the license. A copy of the license is located in the "LICENSE"
// file accompanying this source.
//
// Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on
// an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the
// specific language governing permissions and limitations under the License.
//
'use strict';

import PvStatus from './pv_status_t';

export class CheetahError extends Error {
  private readonly _message: string;
  private readonly _messageStack: string[];

  constructor(message: string, messageStack: string[] = []) {
    super(CheetahError.errorToString(message, messageStack));
    this._message = message;
    this._messageStack = messageStack;
  }

  get message(): string {
    return this._message;
  }

  get messageStack(): string[] {
    return this._messageStack;
  }

  private static errorToString(
    initial: string,
    messageStack: string[]
  ): string {
    let msg = initial;

    if (messageStack.length > 0) {
      msg += `: ${messageStack.reduce(
        (acc, value, index) => acc + '\n  [' + index + '] ' + value,
        ''
      )}`;
    }

    return msg;
  }
}

export class CheetahOutOfMemoryError extends CheetahError {}
export class CheetahIOError extends CheetahError {}
export class CheetahInvalidArgumentError extends CheetahError {}
export class CheetahStopIterationError extends CheetahError {}
export class CheetahKeyError extends CheetahError {}
export class CheetahInvalidStateError extends CheetahError {}
export class CheetahRuntimeError extends CheetahError {}
export class CheetahActivationError extends CheetahError {}
export class CheetahActivationLimitReachedError extends CheetahError {}
export class CheetahActivationThrottledError extends CheetahError {}
export class CheetahActivationRefusedError extends CheetahError {}

export function pvStatusToException(
  pvStatus: PvStatus,
  errorMessage: string,
  messageStack: string[] = []
): CheetahError {
  switch (pvStatus) {
    case PvStatus.OUT_OF_MEMORY:
      throw new CheetahOutOfMemoryError(errorMessage, messageStack);
    case PvStatus.IO_ERROR:
      throw new CheetahIOError(errorMessage, messageStack);
    case PvStatus.INVALID_ARGUMENT:
      throw new CheetahInvalidArgumentError(errorMessage, messageStack);
    case PvStatus.STOP_ITERATION:
      throw new CheetahStopIterationError(errorMessage, messageStack);
    case PvStatus.KEY_ERROR:
      throw new CheetahKeyError(errorMessage, messageStack);
    case PvStatus.INVALID_STATE:
      throw new CheetahInvalidStateError(errorMessage, messageStack);
    case PvStatus.RUNTIME_ERROR:
      throw new CheetahRuntimeError(errorMessage, messageStack);
    case PvStatus.ACTIVATION_ERROR:
      throw new CheetahActivationError(errorMessage, messageStack);
    case PvStatus.ACTIVATION_LIMIT_REACHED:
      throw new CheetahActivationLimitReachedError(errorMessage, messageStack);
    case PvStatus.ACTIVATION_THROTTLED:
      throw new CheetahActivationThrottledError(errorMessage, messageStack);
    case PvStatus.ACTIVATION_REFUSED:
      throw new CheetahActivationRefusedError(errorMessage, messageStack);
    default:
      // eslint-disable-next-line no-console
      console.warn(`Unmapped error code: ${pvStatus}`);
      throw new CheetahError(errorMessage, messageStack);
  }
}
