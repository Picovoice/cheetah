import ctypes
import os
from ctypes import *
from enum import Enum


class Cheetah(object):
    """Python binding for Picovoice's speech-to-text (a.k.a Cheetah) library."""

    class PicovoiceStatuses(Enum):
        """Status codes corresponding to 'pv_status_t' defined in 'include/picovoice.h'"""

        SUCCESS = 0
        OUT_OF_MEMORY = 1
        IO_ERROR = 2
        INVALID_ARGUMENT = 3
        STOP_ITERATION = 4
        KEY_ERROR = 5

    _PICOVOICE_STATUS_TO_EXCEPTION = {
        PicovoiceStatuses.OUT_OF_MEMORY: MemoryError,
        PicovoiceStatuses.IO_ERROR: IOError,
        PicovoiceStatuses.INVALID_ARGUMENT: ValueError,
        PicovoiceStatuses.STOP_ITERATION: StopIteration,
        PicovoiceStatuses.KEY_ERROR: KeyError
    }

    class CCheetah(Structure):
        pass

    def __init__(
            self,
            library_path,
            acoustic_model_file_path,
            language_model_file_path,
            license_file_path):
        """
        Loads Cheetah's shared library and creates an instance of speech-to-text object.

        :param library_path: Absolute path to Cheetah's shared library.
        :param acoustic_model_file_path: Absolute path to file containing acoustic model parameters.
        :param language_model_file_path: Absolute path to file containing language model parameters.
        :param license_file_path : Absolute path to license file.
        """

        self._libc = CDLL(ctypes.util.find_library('c'))

        if not os.path.exists(library_path):
            raise IOError("Could not find Cheetah's library at '%s'" % library_path)

        library = cdll.LoadLibrary(library_path)

        if not os.path.exists(acoustic_model_file_path):
            raise IOError("Could not find acoustic model file at '%s'" % acoustic_model_file_path)

        if not os.path.exists(language_model_file_path):
            raise IOError("Could not find language model file at '%s'" % language_model_file_path)

        if not os.path.exists(license_file_path):
            raise IOError("Could not find license file at '%s'" % license_file_path)

        init_func = library.pv_cheetah_init
        init_func.argtypes = [c_char_p, c_char_p, c_char_p, POINTER(POINTER(self.CCheetah))]
        init_func.restype = self.PicovoiceStatuses

        self._handle = POINTER(self.CCheetah)()

        status = init_func(
            acoustic_model_file_path.encode(),
            language_model_file_path.encode(),
            license_file_path.encode(),
            byref(self._handle))
        if status is not self.PicovoiceStatuses.SUCCESS:
            raise self._PICOVOICE_STATUS_TO_EXCEPTION[status]('Initialization failed')

        self._delete_func = library.pv_cheetah_delete
        self._delete_func.argtypes = [POINTER(self.CCheetah)]
        self._delete_func.restype = None

        self._process_func = library.pv_cheetah_process
        self._process_func.argtypes = [POINTER(self.CCheetah), POINTER(c_short)]
        self._process_func.restype = self.PicovoiceStatuses

        self._transcribe_func = library.pv_cheetah_transcribe
        self._transcribe_func.argtypes = [POINTER(self.CCheetah), POINTER(c_char_p)]
        self._transcribe_func.restype = self.PicovoiceStatuses

        self._sample_rate = library.pv_sample_rate()

        self._frame_length = library.pv_cheetah_frame_length()

    @property
    def sample_rate(self):
        return self._sample_rate

    @property
    def frame_length(self):
        return self._frame_length

    def process(self, pcm):
        assert len(pcm) == self.frame_length
        status = self._process_func(self._handle, (c_short * len(pcm))(*pcm))

        if status is not self.PicovoiceStatuses.SUCCESS:
            raise self._PICOVOICE_STATUS_TO_EXCEPTION[status]('Processing failed')

    def transcribe(self):
        transcript_pointer = c_char_p()
        status = self._transcribe_func(self._handle, byref(transcript_pointer))

        if status is not self.PicovoiceStatuses.SUCCESS:
            raise self._PICOVOICE_STATUS_TO_EXCEPTION[status]('Transcription failed')

        transcript = transcript_pointer.value.decode('utf-8')

        self._libc.free(transcript_pointer)

        return transcript

    def delete(self):
        self._delete_func(self._handle)
