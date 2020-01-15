#
#    Copyright 2018 Picovoice Inc.
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
from ctypes.util import find_library
from enum import Enum


class Cheetah(object):
    """Python binding for Picovoice's streaming Speech-to-Text engine."""

    class PicovoiceStatuses(Enum):
        """Status codes corresponding to 'pv_status_t' defined in 'include/picovoice.h'"""

        SUCCESS = 0
        OUT_OF_MEMORY = 1
        IO_ERROR = 2
        INVALID_ARGUMENT = 3
        STOP_ITERATION = 4
        KEY_ERROR = 5
        INVALID_STATE = 6

    _PICOVOICE_STATUS_TO_EXCEPTION = {
        PicovoiceStatuses.OUT_OF_MEMORY: MemoryError,
        PicovoiceStatuses.IO_ERROR: IOError,
        PicovoiceStatuses.INVALID_ARGUMENT: ValueError,
        PicovoiceStatuses.STOP_ITERATION: StopIteration,
        PicovoiceStatuses.KEY_ERROR: KeyError,
        PicovoiceStatuses.INVALID_STATE: ValueError,
    }

    class CCheetah(Structure):
        pass

    def __init__(
            self,
            library_path,
            acoustic_model_path,
            language_model_path,
            license_path,
            endpoint_duration_sec=None):
        """
        Loads Cheetah's dynamic library and creates an instance of speech-to-text object.

        :param library_path: Absolute path to Cheetah's dynamic library.
        :param acoustic_model_path: Absolute path to file containing acoustic model parameters.
        :param language_model_path: Absolute path to file containing language model parameters.
        :param license_path : Absolute path to license file.
        :param endpoint_duration_sec Duration of endpoint in seconds. A speech endpoint is detected when there is a
        chunk of audio (with a duration specified herein) after an utterance without any speech in it. Set to 'None'
        to disable endpoint detection.
        """

        self._libc = CDLL(find_library('c'))

        if not os.path.exists(library_path):
            raise IOError("Could not find Cheetah's dynamic library at '%s'" % library_path)

        library = cdll.LoadLibrary(library_path)

        if not os.path.exists(acoustic_model_path):
            raise IOError("Could not find acoustic model file at '%s'" % acoustic_model_path)

        if not os.path.exists(language_model_path):
            raise IOError("Could not find language model file at '%s'" % language_model_path)

        if not os.path.exists(license_path):
            raise IOError("Could not find license file at '%s'" % license_path)

        init_func = library.pv_cheetah_init
        init_func.argtypes = [c_char_p, c_char_p, c_char_p, c_int32, POINTER(POINTER(self.CCheetah))]
        init_func.restype = self.PicovoiceStatuses

        self._handle = POINTER(self.CCheetah)()

        status = init_func(
            acoustic_model_path.encode(),
            language_model_path.encode(),
            license_path.encode(),
            endpoint_duration_sec if endpoint_duration_sec is not None else -1,
            byref(self._handle))
        if status is not self.PicovoiceStatuses.SUCCESS:
            raise self._PICOVOICE_STATUS_TO_EXCEPTION[status]('Initialization failed')

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

        self._sample_rate = library.pv_sample_rate()

        self._frame_length = library.pv_cheetah_frame_length()

    @property
    def sample_rate(self):
        """Audio sample rate accepted by Cheetah library."""

        return self._sample_rate

    @property
    def frame_length(self):
        """Number of audio samples per frame expected by C library."""

        return self._frame_length

    def process(self, pcm):
        """
        Processes a frame of audio and returns newly-transcribed text (if any) and a flag indicating if an endpoint has
        been detected. Upon detection of an endpoint, the client should invoke 'pv_cheetah_flush()' to retrieve any
        remaining transcription.

        :param pcm: A frame of audio samples. The number of samples per frame can be attained by calling '.frame_length'.
        The incoming audio needs to have a sample rate equal to '.sample_rate' and be 16-bit linearly-encoded.
        Furthermore, cheetah operates on single-channel audio.

        :return: tuple of Any newly-transcribed speech (if none is available then an empty string is returned) and a
        flag indicating if an endpoint has been detected.
        """

        assert len(pcm) == self.frame_length

        c_partial_transcript = c_char_p()
        is_endpoint = c_bool()
        status = self._process_func(
            self._handle,
            (c_short * len(pcm))(*pcm),
            byref(c_partial_transcript),
            byref(is_endpoint))

        if status is not self.PicovoiceStatuses.SUCCESS:
            raise self._PICOVOICE_STATUS_TO_EXCEPTION[status]('Processing failed')

        partial_transcript = c_partial_transcript.value.decode('utf-8')
        self._libc.free(c_partial_transcript)

        return partial_transcript, is_endpoint

    def flush(self):
        """
        Marks the end of the audio stream, flushes internal state of the object, and returns any remaining transcribed
        text.

        :return: final_transcript Any remaining transcribed text. If none is available then an empty string is returned.
        """

        c_final_transcript = c_char_p()
        status = self._flush_func(self._handle, byref(c_final_transcript))

        if status is not self.PicovoiceStatuses.SUCCESS:
            raise self._PICOVOICE_STATUS_TO_EXCEPTION[status]('Flush failed')

        final_transcript = c_final_transcript.value.decode('utf-8')
        self._libc.free(c_final_transcript)

        return final_transcript

    def delete(self):
        """Releases resources acquired by Cheetah library."""

        self._delete_func(self._handle)
