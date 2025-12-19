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

import cheetahWasmSimd from './lib/pv_cheetah_simd.wasm';
import cheetahWasmSimdLib from './lib/pv_cheetah_simd.txt';
import cheetahWasmPThread from './lib/pv_cheetah_pthread.wasm';
import cheetahWasmPThreadLib from './lib/pv_cheetah_pthread.txt';

Cheetah.setWasmSimd(cheetahWasmSimd);
Cheetah.setWasmSimdLib(cheetahWasmSimdLib);
Cheetah.setWasmPThread(cheetahWasmPThread);
Cheetah.setWasmPThreadLib(cheetahWasmPThreadLib);
CheetahWorker.setWasmSimd(cheetahWasmSimd);
CheetahWorker.setWasmSimdLib(cheetahWasmSimdLib);
CheetahWorker.setWasmPThread(cheetahWasmPThread);
CheetahWorker.setWasmPThreadLib(cheetahWasmPThreadLib);

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
