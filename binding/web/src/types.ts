/*
  Copyright 2022 Picovoice Inc.

  You may not use this file except in compliance with the license. A copy of the license is located in the "LICENSE"
  file accompanying this source.

  Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on
  an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the
  specific language governing permissions and limitations under the License.
*/

export type CheetahInputConfig = {
  /** @defaultValue 'cheetah_model' */
  modelPath?: string;
  /** @defaultValue false */
  forceWrite?: boolean;
  /** @defaultValue 1.0 */
  endpointDurationSec?: number
  /** @defaultValue undefined */
  processErrorCallback?: (error: string) => void
}

export type CheetahWorkerInitRequest = {
  command: 'init';
  accessKey: string;
  modelPath: string;
  wasm: string;
  endpointDurationSec: number;
};

export type CheetahWorkerProcessRequest = {
  command: 'process';
  inputFrame: Int16Array;
};

export type CheetahWorkerFlushRequest = {
  command: 'flush';
}

export type CheetahWorkerReleaseRequest = {
  command: 'release';
};

export type CheetahWorkerRequest =
  CheetahWorkerInitRequest |
  CheetahWorkerProcessRequest |
  CheetahWorkerFlushRequest |
  CheetahWorkerReleaseRequest;

export type CheetahWorkerFailureResponse = {
  command: 'failed' | 'error';
  message: string;
};

export type CheetahWorkerInitResponse = CheetahWorkerFailureResponse | {
  command: 'ok';
  frameLength: number;
  sampleRate: number;
  version: string;
};

export type CheetahWorkerProcessResponse = CheetahWorkerFailureResponse | {
  command: 'ok';
  transcription: string;
  isEndpoint: boolean;
};

export type CheetahWorkerFlushResponse = CheetahWorkerFailureResponse | {
  command: 'ok';
  transcription: string;
};

export type CheetahWorkerReleaseResponse = CheetahWorkerFailureResponse | {
  command: 'ok';
};

export type CheetahWorkerResponse =
  CheetahWorkerInitResponse |
  CheetahWorkerProcessResponse |
  CheetahWorkerFlushResponse |
  CheetahWorkerReleaseResponse;
