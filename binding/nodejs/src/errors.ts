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

import PvStatus from "./pv_status_t";

export class CheetahError extends Error {}

export class CheetahOutOfMemoryError extends CheetahError {}
export class CheetahIoError extends CheetahError {}
export class CheetahInvalidArgumentError extends CheetahError {}
export class CheetahStopIterationError extends CheetahError {}
export class CheetahKeyError extends CheetahError {}
export class CheetahInvalidStateError extends CheetahError {}
export class CheetahRuntimeError extends CheetahError {}
export class CheetahActivationError extends CheetahError {}
export class CheetahActivationLimitReached extends CheetahError {}
export class CheetahActivationThrottled extends CheetahError {}
export class CheetahActivationRefused extends CheetahError {}

export function pvStatusToException(pvStatus: PvStatus, errorMessage: string) {
  switch (pvStatus) {
    case PvStatus.OUT_OF_MEMORY:
      throw new CheetahOutOfMemoryError(errorMessage);
    case PvStatus.IO_ERROR:
      throw new CheetahIoError(errorMessage);
    case PvStatus.INVALID_ARGUMENT:
      throw new CheetahInvalidArgumentError(errorMessage);
    case PvStatus.STOP_ITERATION:
      throw new CheetahStopIterationError(errorMessage);
    case PvStatus.KEY_ERROR:
      throw new CheetahKeyError(errorMessage);
    case PvStatus.INVALID_STATE:
      throw new CheetahInvalidStateError(errorMessage);
    case PvStatus.RUNTIME_ERROR:
      throw new CheetahRuntimeError(errorMessage);
    case PvStatus.ACTIVATION_ERROR:
      throw new CheetahActivationError(errorMessage);
    case PvStatus.ACTIVATION_LIMIT_REACHED:
      throw new CheetahActivationLimitReached(errorMessage);
    case PvStatus.ACTIVATION_THROTTLED:
      throw new CheetahActivationThrottled(errorMessage);
    case PvStatus.ACTIVATION_REFUSED:
      throw new CheetahActivationRefused(errorMessage);
    default:
      console.warn(`Unmapped error code: ${pvStatus}`);
      throw new CheetahError(errorMessage);
  }
}
