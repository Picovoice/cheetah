from .binding.python.cheetah import Cheetah
from .resources.util.python import *


def create(license_path, library_path=None, acoustic_model_path=None, language_model_path=None):
	"""
	Factory method for Cheetah

    :param library_path: Absolute path to Cheetah's dynamic library.
    :param acoustic_model_path: Absolute path to file containing acoustic model parameters.
    :param language_model_path: Absolute path to file containing language model parameters.
    :param license_path : Absolute path to license file.
    :param endpoint_duration_sec Duration of endpoint in seconds. A speech endpoint is detected when there is a
    chunk of audio (with a duration specified herein) after an utterance without any speech in it. Set to 'None'
    to disable endpoint detection.
    :return: An instance of Cheetah speech-to-text engine.
	"""

	if library_path is None:
		library_path = LIBRARY_PATH

	if acoustic_model_path is None:
		acoustic_model_path = ACOUSTIC_MODEL_PATH

	if language_model_path is None:
		language_model_path = LANGUAGE_MODEL_PATH

	return Cheetah(
	    library_path=library_path,
        acoustic_model_path=acoustic_model_path,
        language_model_path=language_model_path,
        license_path=license_path)
	