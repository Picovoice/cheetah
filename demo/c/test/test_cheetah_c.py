#
# Copyright 2023-2026 Picovoice Inc.
#
# You may not use this file except in compliance with the license. A copy of the license is located in the "LICENSE"
# file accompanying this source.
#
# Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on
# an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the
# specific language governing permissions and limitations under the License.
#

import os.path
import subprocess
import sys
import unittest

from jiwer import wer
from parameterized import parameterized

from test_util import *

language_tests = load_languages_test_data()


class CheetahCTestCase(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        cls._access_key = sys.argv[1]
        cls._device = sys.argv[2]
        cls._platform = sys.argv[3]
        cls._arch = "" if len(sys.argv) != 5 else sys.argv[4]
        cls._root_dir = os.path.join(os.path.dirname(__file__), "../../..")

    def _get_library_file(self):
        if self._platform == "windows":
            if self._arch == "amd64":
                os.environ["PATH"] += os.pathsep + os.path.join(self._root_dir, "lib", "windows", "amd64")

        return os.path.join(
            self._root_dir,
            "lib",
            self._platform,
            self._arch,
            "libpv_cheetah." + get_lib_ext(self._platform)
        )

    def _get_model_path_by_model_name(self, model_name):
        return os.path.join(self._root_dir, "lib/common/", model_name)

    @parameterized.expand(language_tests)
    def test_cheetah(
            self,
            language,
            model_name,
            audio_file_name,
            ground_truth,
            punctuations,
            normalization,
            error_rate):
        args = [
            os.path.join(os.path.dirname(__file__), "../build/cheetah_demo_file"),
            "-a", self._access_key,
            "-l", self._get_library_file(),
            "-y", self._device,
            "-m", self._get_model_path_by_model_name(model_name),
        ]
        if normalization:
            args.append("-n")
        args.append(os.path.join(self._root_dir, 'resources/', "audio_samples/", audio_file_name))

        process = subprocess.Popen(args, stderr=subprocess.PIPE, stdout=subprocess.PIPE)
        stdout, stderr = process.communicate()
        self.assertEqual(process.poll(), 0)
        self.assertEqual(stderr.decode('utf-8'), '')

        transcript = stdout.decode('utf-8').strip().split('\n')[-2]
        error = wer(ground_truth, transcript)
        self.assertLessEqual(error, error_rate)


if __name__ == '__main__':
    if len(sys.argv) < 4 or len(sys.argv) > 5:
        print("usage: test_cheetah_c.py ${AccessKey} ${Device} ${Platform} [${Arch}]")
        exit(1)
    unittest.main(argv=sys.argv[:1])
