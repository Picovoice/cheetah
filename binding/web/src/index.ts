import { Cheetah } from "./cheetah";
import { CheetahWorker } from "./cheetah_worker";

import {
  CheetahInputConfig,
  CheetahWorkerInitRequest,
  CheetahWorkerProcessRequest,
  CheetahWorkerReleaseRequest,
  CheetahWorkerRequest,
  CheetahWorkerInitResponse,
  CheetahWorkerProcessResponse,
  CheetahWorkerReleaseResponse,
  CheetahWorkerFailureResponse,
  CheetahWorkerResponse
} from "./types";

import cheetahWasm from "../lib/pv_cheetah.wasm";

Cheetah.setWasm(cheetahWasm);
CheetahWorker.setWasm(cheetahWasm);

export {
  Cheetah,
  CheetahInputConfig,
  CheetahWorker,
  CheetahWorkerInitRequest,
  CheetahWorkerProcessRequest,
  CheetahWorkerReleaseRequest,
  CheetahWorkerRequest,
  CheetahWorkerInitResponse,
  CheetahWorkerProcessResponse,
  CheetahWorkerReleaseResponse,
  CheetahWorkerFailureResponse,
  CheetahWorkerResponse
};
