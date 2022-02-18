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

class CheetahError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CheetahError';
  }
}

class CheetahMemoryError extends CheetahError {
  constructor(message: string) {
    super(message);
    this.name = 'CheetahMemoryError';
  }
}

class CheetahIOError extends CheetahError {
  constructor(message: string) {
    super(message);
    this.name = 'CheetahIOError';
  }
}

class CheetahInvalidArgumentError extends CheetahError {
  constructor(message: string) {
    super(message);
    this.name = 'CheetahInvalidArgumentError';
  }
}

class CheetahStopIterationError extends CheetahError {
  constructor(message: string) {
    super(message);
    this.name = 'CheetahStopIterationError';
  }
}

class CheetahKeyError extends CheetahError {
  constructor(message: string) {
    super(message);
    this.name = 'CheetahKeyError';
  }
}

class CheetahInvalidStateError extends CheetahError {
  constructor(message: string) {
    super(message);
    this.name = 'CheetahInvalidStateError';
  }
}

class CheetahRuntimeError extends CheetahError {
  constructor(message: string) {
    super(message);
    this.name = 'CheetahRuntimeError';
  }
}

class CheetahActivationError extends CheetahError {
  constructor(message: string) {
    super(message);
    this.name = 'CheetahActivationError';
  }
}

class CheetahActivationLimitError extends CheetahError {
  constructor(message: string) {
    super(message);
    this.name = 'CheetahActivationLimitError';
  }
}

class CheetahActivationThrottledError extends CheetahError {
  constructor(message: string) {
    super(message);
    this.name = 'CheetahActivationThrottledError';
  }
}

class CheetahActivationRefusedError extends CheetahError {
  constructor(message: string) {
    super(message);
    this.name = 'CheetahActivationRefusedError';
  }
}

export {
  CheetahError,
  CheetahMemoryError,
  CheetahIOError,
  CheetahInvalidArgumentError,
  CheetahStopIterationError,
  CheetahKeyError,
  CheetahInvalidStateError,
  CheetahRuntimeError,
  CheetahActivationError,
  CheetahActivationLimitError,
  CheetahActivationThrottledError,
  CheetahActivationRefusedError,
};
