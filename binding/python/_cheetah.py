#
#    Copyright 2018-2023 Picovoice Inc.
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
    def __init__(self, message: str = '', message_stack: Sequence[str] = None):
        super().__init__(message)

        self._message = message
        self._message_stack = list() if message_stack is None else message_stack

    def __str__(self):
        message = self._message
        if len(self._message_stack) > 0:
            message += ':'
            for i in range(len(self._message_stack)):
                message += '\n  [%d] %s' % (i, self._message_stack[i])
        return message

    @property
    def message(self) -> str:
        return self._message

    @property
    def message_stack(self) -> Sequence[str]:
        return self._message_stack


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
            model_path: str,
            library_path: str,
            endpoint_duration_sec: Optional[float] = 1.0,
            enable_automatic_punctuation: bool = False):
        """
        Constructor

        :param access_key: AccessKey obtained from Picovoice Console (https://console.picovoice.ai/)
        :param model_path: Absolute path to the file containing model parameters.
        :param library_path: Absolute path to Cheetah's dynamic library.
        :param endpoint_duration_sec Duration of endpoint in seconds. A speech endpoint is detected when there is a
        chunk of audio (with a duration specified herein) after an utterance without any speech in it. Set to `None`
        to disable endpoint detection.
        :param enable_automatic_punctuation Set to `True` to enable automatic punctuation insertion.
        """

        if not isinstance(access_key, str) or len(access_key) == 0:
            raise CheetahInvalidArgumentError("`access_key` should be a non-empty string.")

        if not os.path.exists(library_path):
            raise CheetahIOError("Could not find Cheetah's dynamic library at `%s`." % library_path)

        if not os.path.exists(model_path):
            raise CheetahIOError("Could not find model file at `%s`." % model_path)

        if endpoint_duration_sec is not None and not endpoint_duration_sec > 0.:
            raise CheetahInvalidArgumentError("`endpoint_duration_sec` must be either `None` or a positive number")

        library = cdll.LoadLibrary(library_path)

        set_sdk_func = library.pv_set_sdk
        set_sdk_func.argtypes = [c_char_p]
        set_sdk_func.restype = None

        set_sdk_func('python'.encode('utf-8'))

        self._get_error_stack_func = library.pv_get_error_stack
        self._get_error_stack_func.argtypes = [POINTER(POINTER(c_char_p)), POINTER(c_int)]
        self._get_error_stack_func.restype = self.PicovoiceStatuses

        self._free_error_stack_func = library.pv_free_error_stack
        self._free_error_stack_func.argtypes = [POINTER(c_char_p)]
        self._free_error_stack_func.restype = None

        init_func = library.pv_cheetah_init
        init_func.argtypes = [c_char_p, c_char_p, c_float, c_bool, POINTER(POINTER(self.CCheetah))]
        init_func.restype = self.PicovoiceStatuses

        self._handle = POINTER(self.CCheetah)()

        status = init_func(
            access_key.encode(),
            model_path.encode(),
            float(endpoint_duration_sec) if endpoint_duration_sec is not None else 0.,
            enable_automatic_punctuation,
            byref(self._handle))
        if status is not self.PicovoiceStatuses.SUCCESS:
            raise self._PICOVOICE_STATUS_TO_EXCEPTION[status](
                message='Initialization failed',
                message_stack=self._get_error_stack())

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

        self._transcript_delete_func = library.pv_cheetah_transcript_delete
        self._transcript_delete_func.argtypes = [c_char_p]
        self._transcript_delete_func.restype = None

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
            raise self._PICOVOICE_STATUS_TO_EXCEPTION[status](
                message='Process failed',
                message_stack=self._get_error_stack())

        partial_transcript = c_partial_transcript.value.decode('utf-8')
        self._transcript_delete_func(c_partial_transcript)

        return partial_transcript, is_endpoint.value

    def flush(self) -> str:
        """
        Marks the end of the audio stream, flushes internal state of the object, and returns any remaining transcribed
        text.

        :return: final_transcript Any remaining transcribed text. If none is available then an empty string is returned.
        """

        c_final_transcript = c_char_p()
        status = self._flush_func(self._handle, byref(c_final_transcript))
        if status is not self.PicovoiceStatuses.SUCCESS:
            raise self._PICOVOICE_STATUS_TO_EXCEPTION[status](
                message='Flush failed',
                message_stack=self._get_error_stack())

        final_transcript = c_final_transcript.value.decode('utf-8')
        self._transcript_delete_func(c_final_transcript)

        return final_transcript

    def delete(self) -> None:
        """Releases resources acquired by Cheetah."""

        self._delete_func(self._handle)

    @property
    def version(self) -> str:
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

    def _get_error_stack(self) -> Sequence[str]:
        message_stack_ref = POINTER(c_char_p)()
        message_stack_depth = c_int()
        status = self._get_error_stack_func(byref(message_stack_ref), byref(message_stack_depth))
        if status is not self.PicovoiceStatuses.SUCCESS:
            raise self._PICOVOICE_STATUS_TO_EXCEPTION[status](message='Unable to get Porcupine error state')

        message_stack = list()
        for i in range(message_stack_depth.value):
            message_stack.append(message_stack_ref[i].decode('utf-8'))

        self._free_error_stack_func(message_stack_ref)

        return message_stack


__all__ = [
    'Cheetah',
    'CheetahActivationError',
    'CheetahActivationLimitError',
    'CheetahActivationRefusedError',
    'CheetahActivationThrottledError',
    'CheetahError',
    'CheetahIOError',
    'CheetahInvalidArgumentError',
    'CheetahInvalidStateError',
    'CheetahKeyError',
    'CheetahMemoryError',
    'CheetahRuntimeError',
    'CheetahStopIterationError',
]
