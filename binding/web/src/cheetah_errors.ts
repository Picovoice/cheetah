//
// Copyright 2023 Picovoice Inc.
//
// You may not use this file except in compliance with the license. A copy of the license is located in the "LICENSE"
// file accompanying this source.
//
// Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on
// an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the
// specific language governing permissions and limitations under the License.
//

import { PvError } from "@picovoice/web-utils";
import { PvStatus } from "./types";

class CheetahError extends Error {
  private readonly _status: PvStatus;
  private readonly _shortMessage: string;
  private readonly _messageStack: string[];

  constructor(status: PvStatus, message: string, messageStack: string[] = [], pvError: PvError | null = null) {
    super(CheetahError.errorToString(message, messageStack, pvError));
    this._status = status;
    this.name = 'CheetahError';
    this._shortMessage = message;
    this._messageStack = messageStack;
  }

  get status(): PvStatus {
    return this._status;
  }

  get shortMessage(): string {
    return this._shortMessage;
  }

  get messageStack(): string[] {
    return this._messageStack;
  }

  private static errorToString(
    initial: string,
    messageStack: string[],
    pvError: PvError | null = null,
  ): string {
    let msg = initial;

    if (pvError) {
      const pvErrorMessage = pvError.getErrorString();
      if (pvErrorMessage.length > 0) {
        msg += `\nDetails: ${pvErrorMessage}`;
      }
    }

    if (messageStack.length > 0) {
      msg += `: ${messageStack.reduce((acc, value, index) =>
        acc + '\n  [' + index + '] ' + value, '')}`;
    }

    return msg;
  }
}

class CheetahOutOfMemoryError extends CheetahError {
  constructor(message: string, messageStack?: string[], pvError: PvError | null = null) {
    super(PvStatus.OUT_OF_MEMORY, message, messageStack, pvError);
    this.name = 'CheetahOutOfMemoryError';
  }
}

class CheetahIOError extends CheetahError {
  constructor(message: string, messageStack: string[] = [], pvError: PvError | null = null) {
    super(PvStatus.IO_ERROR, message, messageStack, pvError);
    this.name = 'CheetahIOError';
  }
}

class CheetahInvalidArgumentError extends CheetahError {
  constructor(message: string, messageStack: string[] = [], pvError: PvError | null = null) {
    super(PvStatus.INVALID_ARGUMENT, message, messageStack, pvError);
    this.name = 'CheetahInvalidArgumentError';
  }
}

class CheetahStopIterationError extends CheetahError {
  constructor(message: string, messageStack: string[] = [], pvError: PvError | null = null) {
    super(PvStatus.STOP_ITERATION, message, messageStack, pvError);
    this.name = 'CheetahStopIterationError';
  }
}

class CheetahKeyError extends CheetahError {
  constructor(message: string, messageStack: string[] = [], pvError: PvError | null = null) {
    super(PvStatus.KEY_ERROR, message, messageStack, pvError);
    this.name = 'CheetahKeyError';
  }
}

class CheetahInvalidStateError extends CheetahError {
  constructor(message: string, messageStack: string[] = [], pvError: PvError | null = null) {
    super(PvStatus.INVALID_STATE, message, messageStack, pvError);
    this.name = 'CheetahInvalidStateError';
  }
}

class CheetahRuntimeError extends CheetahError {
  constructor(message: string, messageStack: string[] = [], pvError: PvError | null = null) {
    super(PvStatus.RUNTIME_ERROR, message, messageStack, pvError);
    this.name = 'CheetahRuntimeError';
  }
}

class CheetahActivationError extends CheetahError {
  constructor(message: string, messageStack: string[] = [], pvError: PvError | null = null) {
    super(PvStatus.ACTIVATION_ERROR, message, messageStack, pvError);
    this.name = 'CheetahActivationError';
  }
}

class CheetahActivationLimitReachedError extends CheetahError {
  constructor(message: string, messageStack: string[] = [], pvError: PvError | null = null) {
    super(PvStatus.ACTIVATION_LIMIT_REACHED, message, messageStack, pvError);
    this.name = 'CheetahActivationLimitReachedError';
  }
}

class CheetahActivationThrottledError extends CheetahError {
  constructor(message: string, messageStack: string[] = [], pvError: PvError | null = null) {
    super(PvStatus.ACTIVATION_THROTTLED, message, messageStack, pvError);
    this.name = 'CheetahActivationThrottledError';
  }
}

class CheetahActivationRefusedError extends CheetahError {
  constructor(message: string, messageStack: string[] = [], pvError: PvError | null = null) {
    super(PvStatus.ACTIVATION_REFUSED, message, messageStack, pvError);
    this.name = 'CheetahActivationRefusedError';
  }
}

export {
  CheetahError,
  CheetahOutOfMemoryError,
  CheetahIOError,
  CheetahInvalidArgumentError,
  CheetahStopIterationError,
  CheetahKeyError,
  CheetahInvalidStateError,
  CheetahRuntimeError,
  CheetahActivationError,
  CheetahActivationLimitReachedError,
  CheetahActivationThrottledError,
  CheetahActivationRefusedError,
};



export function pvStatusToException(
  pvStatus: PvStatus,
  errorMessage: string,
  messageStack: string[] = [],
  pvError: PvError | null = null
): CheetahError {
  switch (pvStatus) {
    case PvStatus.OUT_OF_MEMORY:
      return new CheetahOutOfMemoryError(errorMessage, messageStack, pvError);
    case PvStatus.IO_ERROR:
      return new CheetahIOError(errorMessage, messageStack, pvError);
    case PvStatus.INVALID_ARGUMENT:
      return new CheetahInvalidArgumentError(errorMessage, messageStack, pvError);
    case PvStatus.STOP_ITERATION:
      return new CheetahStopIterationError(errorMessage, messageStack, pvError);
    case PvStatus.KEY_ERROR:
      return new CheetahKeyError(errorMessage, messageStack, pvError);
    case PvStatus.INVALID_STATE:
      return new CheetahInvalidStateError(errorMessage, messageStack, pvError);
    case PvStatus.RUNTIME_ERROR:
      return new CheetahRuntimeError(errorMessage, messageStack, pvError);
    case PvStatus.ACTIVATION_ERROR:
      return new CheetahActivationError(errorMessage, messageStack, pvError);
    case PvStatus.ACTIVATION_LIMIT_REACHED:
      return new CheetahActivationLimitReachedError(errorMessage, messageStack, pvError);
    case PvStatus.ACTIVATION_THROTTLED:
      return new CheetahActivationThrottledError(errorMessage, messageStack, pvError);
    case PvStatus.ACTIVATION_REFUSED:
      return new CheetahActivationRefusedError(errorMessage, messageStack, pvError);
    default:
      // eslint-disable-next-line no-console
      console.warn(`Unmapped error code: ${pvStatus}`);
      return new CheetahError(pvStatus, errorMessage);
  }
}