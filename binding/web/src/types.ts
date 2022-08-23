/*
  Copyright 2022 Picovoice Inc.

  You may not use this file except in compliance with the license. A copy of the license is located in the "LICENSE"
  file accompanying this source.

  Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on
  an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the
  specific language governing permissions and limitations under the License.
*/

import { PvModel } from "@picovoice/web-utils";

/**
 * CheetahModel types
 */
export type CheetahModel = PvModel;

export type CheetahOptions = {
  /** @defaultValue 1.0 */
  endpointDurationSec?: number
  /** @defaultValue false */
  enableAutomaticPunctuation?: boolean;
  /** @defaultValue undefined */
  processErrorCallback?: (error: string) => void
};

export type CheetahTranscript = {
  transcript: string;
  isEndpoint?: boolean;
};

export type CheetahWorkerInitRequest = {
  command: 'init';
  accessKey: string;
  modelPath: string;
  options: CheetahOptions;
  wasm: string;
  wasmSimd: string;
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
  cheetahTranscript: CheetahTranscript;
};

export type CheetahWorkerFlushResponse = CheetahWorkerFailureResponse | {
  command: 'ok';
  cheetahTranscript: CheetahTranscript;
};

export type CheetahWorkerReleaseResponse = CheetahWorkerFailureResponse | {
  command: 'ok';
};

export type CheetahWorkerResponse =
  CheetahWorkerInitResponse |
  CheetahWorkerProcessResponse |
  CheetahWorkerFlushResponse |
  CheetahWorkerReleaseResponse;
