import { Cheetah } from './cheetah';
import { CheetahWorker } from './cheetah_worker';

import {
  CheetahOptions,
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

import cheetahWasm from '../lib/pv_cheetah.wasm';
import cheetahWasmSimd from '../lib/pv_cheetah_simd.wasm';

Cheetah.setWasm(cheetahWasm);
Cheetah.setWasmSimd(cheetahWasmSimd);
CheetahWorker.setWasm(cheetahWasm);
CheetahWorker.setWasmSimd(cheetahWasmSimd);

export {
  Cheetah,
  CheetahOptions,
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
};
