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

import Cheetah from "./cheetah";

import {getInt16Frames, checkWaveFile} from "./wave_util"

import {
  CheetahInitOptions,
  CheetahInputOptions,
  CheetahOptions,
} from "./types";

import {
  CheetahError,
  CheetahOutOfMemoryError,
  CheetahIoError,
  CheetahInvalidArgumentError,
  CheetahStopIterationError,
  CheetahKeyError,
  CheetahInvalidStateError,
  CheetahRuntimeError,
  CheetahActivationError,
  CheetahActivationLimitReached,
  CheetahActivationThrottled,
  CheetahActivationRefused,
} from "./errors";

export {
  Cheetah,
  CheetahActivationError,
  CheetahActivationLimitReached,
  CheetahActivationRefused,
  CheetahActivationThrottled,
  CheetahError,
  CheetahInitOptions,
  CheetahInputOptions,
  CheetahInvalidArgumentError,
  CheetahInvalidStateError,
  CheetahIoError,
  CheetahKeyError,
  CheetahOptions,
  CheetahOutOfMemoryError,
  CheetahRuntimeError,
  CheetahStopIterationError,
  checkWaveFile,
  getInt16Frames,
};
