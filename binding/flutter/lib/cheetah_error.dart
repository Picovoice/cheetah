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

class CheetahException implements Exception {
  final String? message;
  CheetahException([this.message]);
}

class CheetahMemoryException extends CheetahException {
  CheetahMemoryException(String? message) : super(message);
}

class CheetahIOException extends CheetahException {
  CheetahIOException(String? message) : super(message);
}

class CheetahInvalidArgumentException extends CheetahException {
  CheetahInvalidArgumentException(String? message) : super(message);
}

class CheetahStopIterationException extends CheetahException {
  CheetahStopIterationException(String? message) : super(message);
}

class CheetahKeyException extends CheetahException {
  CheetahKeyException(String? message) : super(message);
}

class CheetahInvalidStateException extends CheetahException {
  CheetahInvalidStateException(String? message) : super(message);
}

class CheetahRuntimeException extends CheetahException {
  CheetahRuntimeException(String? message) : super(message);
}

class CheetahActivationException extends CheetahException {
  CheetahActivationException(String? message) : super(message);
}

class CheetahActivationLimitException extends CheetahException {
  CheetahActivationLimitException(String? message) : super(message);
}

class CheetahActivationThrottledException extends CheetahException {
  CheetahActivationThrottledException(String? message) : super(message);
}

class CheetahActivationRefusedException extends CheetahException {
  CheetahActivationRefusedException(String? message) : super(message);
}

cheetahStatusToException(String code, String? message) {
  switch (code) {
    case 'CheetahException':
      return CheetahException(message);
    case 'CheetahMemoryException':
      return CheetahMemoryException(message);
    case 'CheetahIOException':
      return CheetahIOException(message);
    case 'CheetahInvalidArgumentException':
      return CheetahInvalidArgumentException(message);
    case 'CheetahStopIterationException':
      return CheetahStopIterationException(message);
    case 'CheetahKeyException':
      return CheetahKeyException(message);
    case 'CheetahInvalidStateException':
      return CheetahInvalidStateException(message);
    case 'CheetahRuntimeException':
      return CheetahRuntimeException(message);
    case 'CheetahActivationException':
      return CheetahActivationException(message);
    case 'CheetahActivationLimitException':
      return CheetahActivationLimitException(message);
    case 'CheetahActivationThrottledException':
      return CheetahActivationThrottledException(message);
    case 'CheetahActivationRefusedException':
      return CheetahActivationRefusedException(message);
    default:
      return CheetahException("unexpected code: $code, message: $message");
  }
}
