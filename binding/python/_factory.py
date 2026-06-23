#
# Copyright 2022-2026 Picovoice Inc.
#
# You may not use this file except in compliance with the license. A copy of the license is located in the "LICENSE"
# file accompanying this source.
#
# Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on
# an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the
# specific language governing permissions and limitations under the License.
#

import os
from io import StringIO
from typing import (
    Dict,
    Optional,
    Sequence,
    Set
)

from ruamel.yaml import YAML
from ruamel.yaml.error import YAMLError

from ._cheetah import (
    Cheetah,
    list_hardware_devices
)
from ._util import (
    default_library_path,
    default_model_path,
    pv_train_model,
)


def create(
        access_key: str,
        model_path: Optional[str] = None,
        device: Optional[str] = None,
        library_path: Optional[str] = None,
        endpoint_duration_sec: Optional[float] = None,
        enable_automatic_punctuation: bool = False,
        enable_text_normalization: bool = False) -> Cheetah:
    """
    Factory method for Cheetah speech-to-text engine.

    :param access_key: AccessKey obtained from Picovoice Console (https://console.picovoice.ai/)
    :param model_path: Absolute path to the file containing model parameters. If not set it will be set to the default
    location.
    :param device: String representation of the device (e.g., CPU or GPU) to use. If set to `best`, the most
    suitable device is selected automatically. If set to `gpu`, the engine uses the first available GPU device.
    To select a specific GPU device, set this argument to `gpu:${GPU_INDEX}`, where `${GPU_INDEX}` is the index
    of the target GPU. If set to `cpu`, the engine will run on the CPU with the default number of threads.
    To specify the number of threads, set this argument to `cpu:${NUM_THREADS}`, where `${NUM_THREADS}`
    is the desired number of threads.
    :param library_path: Absolute path to Cheetah's dynamic library. If not set it will be set to the default location.
    :param endpoint_duration_sec Duration of endpoint in seconds. A speech endpoint is detected when there is a chunk of
    audio (with a duration specified herein) after an utterance without any speech in it. Set to `None` to disable
    endpoint detection.
    :param enable_automatic_punctuation Set to `True` to enable automatic punctuation insertion.
    :param enable_text_normalization Set to `True` to enable text normalization. Enabling this feature
    improves the readability and formatting of Cheetah's transcriptions (e.g. converts number words to digits)
    at the cost of some additional latency.
    :return: An instance of Cheetah speech-to-text engine.
    """

    if model_path is None:
        model_path = default_model_path('')

    if device is None:
        device = "best"

    if library_path is None:
        library_path = default_library_path('')

    return Cheetah(
        access_key=access_key,
        model_path=model_path,
        device=device,
        library_path=library_path,
        endpoint_duration_sec=endpoint_duration_sec,
        enable_automatic_punctuation=enable_automatic_punctuation,
        enable_text_normalization=enable_text_normalization)


def available_devices(library_path: Optional[str] = None) -> Sequence[str]:
    """
    Lists all available devices that Cheetah can use for inference. Each entry in the list can be the `device` argument
    of `.create` factory method or `Cheetah` constructor.
    :param library_path: Absolute path to Cheetah's dynamic library. If not set it will be set to the default location.
    :return: List of all available devices that Cheetah can use for inference.
    """

    if library_path is None:
        library_path = default_library_path('')

    return list_hardware_devices(library_path=library_path)


def train_model_from_yaml(
        access_key: str,
        output_path: str,
        language: str,
        yaml_path: str):
    """
    Trains a model using a Cat content (.yml) file.

    :param access_key: AccessKey obtained from Picovoice Console (https://console.picovoice.ai/).
    :param output_path: Absolute path to file where the trained model will be saved.
    :param language: Two character language code for the model (i.e 'en', 'fr').
    Check https://picovoice.ai/docs/model-api/cheetah/ for supported languages.
    :param yaml_path: Absolute path to the YAML configuration file.
    """

    if not os.path.exists(yaml_path):
        raise IOError("Couldn't find yaml file at '%s'." % yaml_path)

    with open(yaml_path) as f:
        yaml_content = f.read()

    pv_train_model(
        access_key=access_key,
        output_path=output_path,
        language=language,
        yaml_content=yaml_content)


def train_model_from_words(
        access_key: str,
        output_path: str,
        language: str,
        new_words: Dict[str, Set[str]],
        boost_words: Set[str]):
    """
    Trains a model using the specified `new_words` and `boost_words` arguments.

    :param access_key: AccessKey obtained from Picovoice Console (https://console.picovoice.ai/).
    :param output_path: Absolute path to file where the trained model will be saved.
    :param language: Two character language code for the model (i.e 'en', 'fr').
    Check https://picovoice.ai/docs/model-api/cheetah/ for supported languages.
    :param new_words: A dictionary of words to pronunciations to add to the new model. Keys should be
    the word string. Values are a Set of pronunciations for the given word, each pronunciation
    is a string of space separated IPA phonemes. An empty Set will result in the training
    generating a default pronunciation.
    :param boost_words: A Set of words to "boost". The engine will be more likely to select the boosted words.
    """

    yaml = YAML()
    stream = StringIO()

    content = {
        'new': new_words,
        'boost': boost_words
    }
    try:
        yaml.dump(content, stream)
    except YAMLError as e:
        if hasattr(e, "problem_mark"):
            raise ValueError(f"YAML error at line {e.problem_mark.line + 1}: {e.problem}") from e
        else:
            raise ValueError("Failed to parse yaml content") from e

    yaml_content = stream.getvalue()
    stream.close()

    pv_train_model(
        access_key=access_key,
        output_path=output_path,
        language=language,
        yaml_content=yaml_content)


__all__ = [
    'available_devices',
    'create',
    'train_model_from_yaml',
    'train_model_from_words',
]
