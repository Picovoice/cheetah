#
#    Copyright 2018-2022 Picovoice Inc.
#
#    You may not use this file except in compliance with the license. A copy of the license is located in the "LICENSE"
#    file accompanying this source.
#
#    Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on
#    an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the
#    specific language governing permissions and limitations under the License.
#

import os
from ctypes import *
from enum import Enum
from typing import *


class CheetahError(Exception):
    pass


class CheetahMemoryError(CheetahError):
    pass


class CheetahIOError(CheetahError):
    pass


class CheetahInvalidArgumentError(CheetahError):
    pass


class CheetahStopIterationError(CheetahError):
    pass


class CheetahKeyError(CheetahError):
    pass


class CheetahInvalidStateError(CheetahError):
    pass


class CheetahRuntimeError(CheetahError):
    pass


class CheetahActivationError(CheetahError):
    pass


class CheetahActivationLimitError(CheetahError):
    pass


class CheetahActivationThrottledError(CheetahError):
    pass


class CheetahActivationRefusedError(CheetahError):
    pass


class Cheetah(object):
    """Python binding for Cheetah streaming speech-to-text engine."""

    class PicovoiceStatuses(Enum):
        SUCCESS = 0
        OUT_OF_MEMORY = 1
        IO_ERROR = 2
        INVALID_ARGUMENT = 3
        STOP_ITERATION = 4
        KEY_ERROR = 5
        INVALID_STATE = 6
        RUNTIME_ERROR = 7
        ACTIVATION_ERROR = 8
        ACTIVATION_LIMIT_REACHED = 9
        ACTIVATION_THROTTLED = 10
        ACTIVATION_REFUSED = 11

    _PICOVOICE_STATUS_TO_EXCEPTION = {
        PicovoiceStatuses.OUT_OF_MEMORY: CheetahMemoryError,
        PicovoiceStatuses.IO_ERROR: CheetahIOError,
        PicovoiceStatuses.INVALID_ARGUMENT: CheetahInvalidArgumentError,
        PicovoiceStatuses.STOP_ITERATION: CheetahStopIterationError,
        PicovoiceStatuses.KEY_ERROR: CheetahKeyError,
        PicovoiceStatuses.INVALID_STATE: CheetahInvalidStateError,
        PicovoiceStatuses.RUNTIME_ERROR: CheetahRuntimeError,
        PicovoiceStatuses.ACTIVATION_ERROR: CheetahActivationError,
        PicovoiceStatuses.ACTIVATION_LIMIT_REACHED: CheetahActivationLimitError,
        PicovoiceStatuses.ACTIVATION_THROTTLED: CheetahActivationThrottledError,
        PicovoiceStatuses.ACTIVATION_REFUSED: CheetahActivationRefusedError
    }

    class CCheetah(Structure):
        pass

    def __init__(
            self,
            access_key: str,
            library_path: str,
            model_path: str,
            endpoint_duration_sec: Optional[float] = None):
        """
        Constructor

        :param access_key: AccessKey obtained from Picovoice Console (https://console.picovoice.ai/)
        :param library_path: Absolute path to Cheetah's dynamic library.
        :param model_path: Absolute path to the file containing model parameters.
        :param endpoint_duration_sec Duration of endpoint in seconds. A speech endpoint is detected when there is a
        chunk of audio (with a duration specified herein) after an utterance without any speech in it. Set to `None`
        to disable endpoint detection.
        """

        if not isinstance(access_key, str) or len(access_key) == 0:
            raise CheetahInvalidArgumentError("`access_key` should be a non-empty string.")

        if not os.path.exists(library_path):
            raise CheetahIOError("Could not find Cheetah's dynamic library at `%s`." % library_path)

        library = cdll.LoadLibrary(library_path)

        if not os.path.exists(model_path):
            raise CheetahIOError("Could not find model file at `%s`." % model_path)

        if endpoint_duration_sec is not None and not endpoint_duration_sec >= 0.:
            raise CheetahInvalidArgumentError("`endpoint_duration_sec` is either `None` or a positive number")

        init_func = library.pv_cheetah_init
        init_func.argtypes = [c_char_p, c_char_p, c_float, POINTER(POINTER(self.CCheetah))]
        init_func.restype = self.PicovoiceStatuses

        self._handle = POINTER(self.CCheetah)()

        status = init_func(
            access_key.encode(),
            model_path.encode(),
            float(endpoint_duration_sec) if endpoint_duration_sec is not None else -1.,
            byref(self._handle))
        if status is not self.PicovoiceStatuses.SUCCESS:
            raise self._PICOVOICE_STATUS_TO_EXCEPTION[status]()

        self._delete_func = library.pv_cheetah_delete
        self._delete_func.argtypes = [POINTER(self.CCheetah)]
        self._delete_func.restype = None

        self._process_func = library.pv_cheetah_process
        self._process_func.argtypes = \
            [POINTER(self.CCheetah), POINTER(c_short), POINTER(c_char_p), POINTER(c_bool)]
        self._process_func.restype = self.PicovoiceStatuses

        self._flush_func = library.pv_cheetah_flush
        self._flush_func.argtypes = [POINTER(self.CCheetah), POINTER(c_char_p)]
        self._flush_func.restype = self.PicovoiceStatuses

        version_func = library.pv_cheetah_version
        version_func.argtypes = []
        version_func.restype = c_char_p
        self._version = version_func().decode('utf-8')

        self._sample_rate = library.pv_sample_rate()

        self._frame_length = library.pv_cheetah_frame_length()

    def process(self, pcm: Sequence[int]) -> Tuple[str, bool]:
        """
        Processes a frame of audio and returns newly-transcribed text and a flag indicating if an endpoint has been
        detected. Upon detection of an endpoint, the client may invoke `.`flush()` to retrieve any remaining
        transcription.

        :param pcm: A frame of audio samples. The number of samples per frame can be attained by calling
        `.frame_length`. The incoming audio needs to have a sample rate equal to `.sample_rate` and be 16-bit
        linearly-encoded. Furthermore, Cheetah operates on single-channel audio.

        :return: tuple of Any newly-transcribed speech (if none is available then an empty string is returned) and a
        flag indicating if an endpoint has been detected.
        """

        if len(pcm) != self.frame_length:
            raise CheetahInvalidArgumentError()

        c_partial_transcript = c_char_p()
        is_endpoint = c_bool()
        status = self._process_func(
            self._handle,
            (c_short * len(pcm))(*pcm),
            byref(c_partial_transcript),
            byref(is_endpoint))
        if status is not self.PicovoiceStatuses.SUCCESS:
            raise self._PICOVOICE_STATUS_TO_EXCEPTION[status]()

        return c_partial_transcript.value.decode('utf-8'), is_endpoint

    def flush(self) -> str:
        """
        Marks the end of the audio stream, flushes internal state of the object, and returns any remaining transcribed
        text.

        :return: final_transcript Any remaining transcribed text. If none is available then an empty string is returned.
        """

        c_final_transcript = c_char_p()
        status = self._flush_func(self._handle, byref(c_final_transcript))
        if status is not self.PicovoiceStatuses.SUCCESS:
            raise self._PICOVOICE_STATUS_TO_EXCEPTION[status]()

        return c_final_transcript.value.decode('utf-8')

    def delete(self) -> None:
        """Releases resources acquired by Cheetah."""

        self._delete_func(self._handle)

    @property
    def version(self):
        """Version."""

        return self._version

    @property
    def sample_rate(self) -> int:
        """Audio sample rate accepted by `.process`."""

        return self._sample_rate

    @property
    def frame_length(self) -> int:
        """Number of audio samples per frame expected by C library."""

        return self._frame_length
