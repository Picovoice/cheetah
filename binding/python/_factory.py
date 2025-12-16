#
# Copyright 2022-2025 Picovoice Inc.
#
# You may not use this file except in compliance with the license. A copy of the license is located in the "LICENSE"
# file accompanying this source.
#
# Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on
# an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the
# specific language governing permissions and limitations under the License.
#

from typing import (
    Optional,
    Sequence
)

from ._cheetah import (
    Cheetah,
    list_hardware_devices
)
from ._util import (
    default_library_path,
    default_model_path
)


def create(
        access_key: str,
        model_path: Optional[str] = None,
        device: Optional[str] = None,
        library_path: Optional[str] = None,
        endpoint_duration_sec: Optional[float] = None,
        enable_automatic_punctuation: bool = False) -> Cheetah:
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
        enable_automatic_punctuation=enable_automatic_punctuation)


def available_devices(library_path: Optional[str] = None) -> Sequence[str]:
    """
    Lists all available devices that Cheetah can use for inference. Each entry in the list can be the `device` argument
    of `.create` factory method or `Cheetah` constructor.
    :param library_path: Absolute path to Cheetah's dynamic library. If not set it will be set to the default location.
    :return: List of all available devices that Cheetah can use for inference.
    """

    if library_path is None:
        library_path = default_library_path()

    return list_hardware_devices(library_path=library_path)


__all__ = [
    'available_devices',
    'create',
]
