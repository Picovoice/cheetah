#
# Copyright 2022 Picovoice Inc.
#
# You may not use this file except in compliance with the license. A copy of the license is located in the "LICENSE"
# file accompanying this source.
#
# Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on
# an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the
# specific language governing permissions and limitations under the License.
#

from typing import *

from .cheetah import Cheetah
from .cheetah import CheetahActivationError
from .cheetah import CheetahActivationLimitError
from .cheetah import CheetahActivationRefusedError
from .cheetah import CheetahActivationThrottledError
from .cheetah import CheetahError
from .cheetah import CheetahIOError
from .cheetah import CheetahInvalidArgumentError
from .cheetah import CheetahInvalidStateError
from .cheetah import CheetahKeyError
from .cheetah import CheetahMemoryError
from .cheetah import CheetahRuntimeError
from .cheetah import CheetahStopIterationError
from .util import *


def create(
        access_key: str,
        library_path: Optional[str] = None,
        model_path: Optional[str] = None,
        endpoint_duration_sec: Optional[float] = None) -> Cheetah:
    """
    Factory method for Cheetah speech-to-text engine.

    :param access_key: AccessKey obtained from Picovoice Console (https://console.picovoice.ai/)
    :param library_path: Absolute path to Cheetah's dynamic library. If not set it will be set to the default location.
    :param model_path: Absolute path to the file containing model parameters. If not set it will be set to the default
    location.
    :param endpoint_duration_sec Duration of endpoint in seconds. A speech endpoint is detected when there is a chunk of
    audio (with a duration specified herein) after an utterance without any speech in it. Set to `None`
    :return: An instance of Cheetah speech-to-text engine.
    """

    if library_path is None:
        library_path = default_library_path('')

    if model_path is None:
        model_path = default_model_path('')

    return Cheetah(
        access_key=access_key,
        library_path=library_path,
        model_path=model_path,
        endpoint_duration_sec=endpoint_duration_sec)
