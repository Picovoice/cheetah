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
from typing import Sequence
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

    def _get_mismatch_count(self, words1: Sequence[str], words2: Sequence[str]) -> int:
        res = [[0] * (len(words2) + 1) for _ in range(len(words1) + 1)]
        for i in range(len(words1) + 1):
            res[i][0] = i
        for j in range(len(words2) + 1):
            res[0][j] = j

        for i in range(1, len(words1) + 1):
            for j in range(1, len(words2) + 1):
                res[i][j] = min(
                    res[i - 1][j] + 1,
                    res[i][j - 1] + 1,
                    res[i - 1][j - 1] + (0 if words1[i - 1].upper() == words2[j - 1].upper() else 1)
                )

        return res[len(words1)][len(words2)]

    @parameterized.expand(language_tests)
    def test_cheetah(
            self,
            language,
            model_name,
            audio_file_name,
            ground_truth,
            expected_words,
            punctuations,
            normalization,
            error_rate,
            mismatch_count_threshold):
        args = [
            os.path.join(os.path.dirname(__file__), "../build/cheetah_demo_file"),
            "-a", self._access_key,
            "-l", self._get_library_file(),
            "-y", self._device,
            "-m", self._get_model_path_by_model_name(model_name),
        ]
        if not normalization:
            args.append("-n")
        args.append(os.path.join(self._root_dir, 'resources/', "audio_samples/", audio_file_name))

        process = subprocess.Popen(args, stderr=subprocess.PIPE, stdout=subprocess.PIPE)
        stdout, stderr = process.communicate()
        self.assertEqual(process.poll(), 0, stderr.decode('utf-8'))
        self.assertEqual(stderr.decode('utf-8'), '')

        transcript = stdout.decode('utf-8').strip().split('\n')[-2]

        for punctuation in punctuations:
            transcript = transcript.replace(punctuation, "")
            ground_truth = ground_truth.replace(punctuation, "")

        error = wer(ground_truth, transcript)
        self.assertLessEqual(error, error_rate)

    @parameterized.expand(language_tests)
    def test_cheetah_punctuation(
            self,
            language,
            model_name,
            audio_file_name,
            ground_truth,
            expected_words,
            punctuations,
            normalization,
            error_rate,
            mismatch_count_threshold):
        args = [
            os.path.join(os.path.dirname(__file__), "../build/cheetah_demo_file"),
            "-a", self._access_key,
            "-l", self._get_library_file(),
            "-y", self._device,
            "-m", self._get_model_path_by_model_name(model_name),
        ]
        if not normalization:
            args.append("-n")
        args.append(os.path.join(self._root_dir, 'resources/', "audio_samples/", audio_file_name))

        process = subprocess.Popen(args, stderr=subprocess.PIPE, stdout=subprocess.PIPE)
        stdout, stderr = process.communicate()
        self.assertEqual(process.poll(), 0, stderr.decode('utf-8'))
        self.assertEqual(stderr.decode('utf-8'), '')

        transcript = stdout.decode('utf-8').strip().split('\n')[-2]
        error = wer(ground_truth, transcript)
        self.assertLessEqual(error, error_rate)
    
    @parameterized.expand(language_tests)
    def test_cheetah_verbose_process(
            self,
            language,
            model_name,
            audio_file_name,
            ground_truth,
            expected_words,
            punctuations,
            normalization,
            error_rate,
            mismatch_count_threshold):
        args = [
            os.path.join(os.path.dirname(__file__), "../build/cheetah_demo_file"),
            "-a", self._access_key,
            "-l", self._get_library_file(),
            "-y", self._device,
            "-m", self._get_model_path_by_model_name(model_name),
            "-v",
        ]

        if not normalization:
            args.append("-n")
        args.append(os.path.join(self._root_dir, 'resources/', "audio_samples/", audio_file_name))

        process = subprocess.Popen(args, stderr=subprocess.PIPE, stdout=subprocess.PIPE)
        stdout, stderr = process.communicate()
        self.assertEqual(process.poll(), 0, stderr.decode('utf-8'))
        self.assertEqual(stderr.decode('utf-8'), '')

        lines = stdout.decode('utf-8').strip().split('\n')

        words = []
        for line in lines:
            columns = line.split()
            if len(columns) != 4:
                continue

            word, start_sec, end_sec, confidence = columns

            try:
                start_sec = float(start_sec)
                end_sec = float(end_sec)
                confidence = float(confidence)
            except ValueError:
                continue

            words.append(word)
            self.assertLessEqual(start_sec, end_sec)
            self.assertGreater(start_sec, 0.0)
            self.assertGreater(end_sec, 0.0)
            self.assertGreaterEqual(confidence, 0.0)
            self.assertLessEqual(confidence, 1.0)

        normalized_words = [
            item for item in expected_words
            if item not in punctuations
        ]
        words = [
            item for item in words
            if item not in punctuations
        ]

        self.assertLessEqual(
            self._get_mismatch_count(words, normalized_words),
            mismatch_count_threshold
        )
    
    @parameterized.expand(language_tests)
    def test_cheetah_process_verbose_punctuation(
            self,
            language,
            model_name,
            audio_file_name,
            ground_truth,
            expected_words,
            punctuations,
            normalization,
            error_rate,
            mismatch_count_threshold):
        args = [
            os.path.join(os.path.dirname(__file__), "../build/cheetah_demo_file"),
            "-a", self._access_key,
            "-l", self._get_library_file(),
            "-y", self._device,
            "-m", self._get_model_path_by_model_name(model_name),
            "-v",
        ]

        if not normalization:
            args.append("-n")
        args.append(os.path.join(self._root_dir, 'resources/', "audio_samples/", audio_file_name))

        process = subprocess.Popen(args, stderr=subprocess.PIPE, stdout=subprocess.PIPE)
        stdout, stderr = process.communicate()
        self.assertEqual(process.poll(), 0, stderr.decode('utf-8'))
        self.assertEqual(stderr.decode('utf-8'), '')

        lines = stdout.decode('utf-8').strip().split('\n')

        words = []
        for line in lines:
            columns = line.split()
            if len(columns) != 4:
                continue

            word, start_sec, end_sec, confidence = columns

            try:
                start_sec = float(start_sec)
                end_sec = float(end_sec)
                confidence = float(confidence)
            except ValueError:
                continue

            words.append(word)
            self.assertLessEqual(start_sec, end_sec)
            self.assertGreater(start_sec, 0.0)
            self.assertGreater(end_sec, 0.0)
            self.assertGreaterEqual(confidence, 0.0)
            self.assertLessEqual(confidence, 1.0)

        self.assertLessEqual(
            self._get_mismatch_count(words, expected_words),
            mismatch_count_threshold
        )


if __name__ == '__main__':
    if len(sys.argv) < 4 or len(sys.argv) > 5:
        print("usage: test_cheetah_c.py ${AccessKey} ${Device} ${Platform} [${Arch}]")
        exit(1)
    unittest.main(argv=sys.argv[:1])
