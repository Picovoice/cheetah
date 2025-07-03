import { Cheetah } from './cheetah';
import { CheetahWorker } from './cheetah_worker';

import {
  CheetahModel,
  CheetahOptions,
  CheetahTranscript,
  CheetahWorkerInitRequest,
  CheetahWorkerProcessRequest,
  CheetahWorkerReleaseRequest,
  CheetahWorkerRequest,
  CheetahWorkerInitResponse,
  CheetahWorkerProcessResponse,
  CheetahWorkerReleaseResponse,
  CheetahWorkerFailureResponse,
  CheetahWorkerResponse,
} from './types';

import * as CheetahErrors from './cheetah_errors';

import cheetahWasm from './lib/pv_cheetah.wasm';
import cheetahWasmLib from './lib/pv_cheetah.txt';
import cheetahWasmSimd from './lib/pv_cheetah_simd.wasm';
import cheetahWasmSimdLib from './lib/pv_cheetah_simd.txt';

Cheetah.setWasm(cheetahWasm);
Cheetah.setWasmLib(cheetahWasmLib);
Cheetah.setWasmSimd(cheetahWasmSimd);
Cheetah.setWasmSimdLib(cheetahWasmSimdLib);
CheetahWorker.setWasm(cheetahWasm);
CheetahWorker.setWasmLib(cheetahWasmLib);
CheetahWorker.setWasmSimd(cheetahWasmSimd);
CheetahWorker.setWasmSimdLib(cheetahWasmSimdLib);

export {
  Cheetah,
  CheetahModel,
  CheetahOptions,
  CheetahTranscript,
  CheetahWorker,
  CheetahWorkerInitRequest,
  CheetahWorkerProcessRequest,
  CheetahWorkerReleaseRequest,
  CheetahWorkerRequest,
  CheetahWorkerInitResponse,
  CheetahWorkerProcessResponse,
  CheetahWorkerReleaseResponse,
  CheetahWorkerFailureResponse,
  CheetahWorkerResponse,
  CheetahErrors,
};
