#
# Copyright 2018-2025 Picovoice Inc.
#
# You may not use this file except in compliance with the license. A copy of the license is located in the "LICENSE"
# file accompanying this source.
#
# Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on
# an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the
# specific language governing permissions and limitations under the License.
#

import os
import sys
import unittest

from parameterized import parameterized

from _cheetah import Cheetah, CheetahError
from _util import *
from test_util import *


language_tests = load_test_data()


class CheetahTestCase(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls._access_key = sys.argv[1]
        cls._audio_directory = os.path.join('..', '..', 'resources', 'audio_samples')

    @classmethod
    def _create_cheetah(cls, model_file: str, enable_automatic_punctuation: bool) -> Cheetah:
        return Cheetah(
            access_key=cls._access_key,
            model_path=get_model_path(model_file=model_file),
            library_path=default_library_path('../..'),
            enable_automatic_punctuation=enable_automatic_punctuation)

    @parameterized.expand(language_tests)
    def test_process(
            self,
            language: str,
            model_file: str,
            audio_file: str,
            expected_transcript: str,
            punctuations: List[str],
            error_rate: float):
        o = None

        try:
            o = self._create_cheetah(model_file=model_file, enable_automatic_punctuation=False)

            pcm = read_wav_file(
                file_name=os.path.join(self._audio_directory, audio_file),
                sample_rate=o.sample_rate)

            transcript = ''
            num_frames = len(pcm) // o.frame_length
            for i in range(num_frames):
                frame = pcm[i * o.frame_length:(i + 1) * o.frame_length]
                partial_transcript, _ = o.process(frame)
                transcript += partial_transcript

            final_transcript = o.flush()
            transcript += final_transcript

            normalized_transcript = expected_transcript
            for punctuation in punctuations:
                normalized_transcript = normalized_transcript.replace(punctuation, "")

            self.assertLessEqual(
                get_word_error_rate(transcript, normalized_transcript),
                error_rate)
        finally:
            if o is not None:
                o.delete()

    @parameterized.expand(language_tests)
    def test_process_with_punctuation(
            self,
            language: str,
            model_file: str,
            audio_file: str,
            expected_transcript: str,
            punctuations: List[str],
            error_rate: float):
        o = None

        try:
            o = self._create_cheetah(model_file=model_file, enable_automatic_punctuation=True)

            pcm = read_wav_file(
                file_name=os.path.join(self._audio_directory, audio_file),
                sample_rate=o.sample_rate)

            transcript = ''
            num_frames = len(pcm) // o.frame_length
            for i in range(num_frames):
                frame = pcm[i * o.frame_length:(i + 1) * o.frame_length]
                partial_transcript, _ = o.process(frame)
                transcript += partial_transcript

            final_transcript = o.flush()
            transcript += final_transcript

            self.assertLessEqual(
                get_word_error_rate(transcript, expected_transcript),
                error_rate)
        finally:
            if o is not None:
                o.delete()

    def test_version(self):
        o = Cheetah(
            access_key=self._access_key,
            model_path=default_model_path('../..'),
            library_path=default_library_path('../..'),
            enable_automatic_punctuation=True)
        self.assertIsInstance(o.version, str)
        self.assertGreater(len(o.version), 0)

    def test_message_stack(self):
        relative = '../../'

        error = None
        try:
            c = Cheetah(
                access_key='invalid',
                library_path=default_library_path(relative),
                model_path=default_model_path(relative),
                enable_automatic_punctuation=True)
            self.assertIsNone(c)
        except CheetahError as e:
            error = e.message_stack

        self.assertIsNotNone(error)
        self.assertGreater(len(error), 0)

        try:
            c = Cheetah(
                access_key='invalid',
                library_path=default_library_path(relative),
                model_path=default_model_path(relative),
                enable_automatic_punctuation=True)
            self.assertIsNone(c)
        except CheetahError as e:
            self.assertEqual(len(error), len(e.message_stack))
            self.assertListEqual(list(error), list(e.message_stack))

    def test_process_flush_message_stack(self):
        relative = '../../'

        c = Cheetah(
            access_key=sys.argv[1],
            library_path=default_library_path(relative),
            model_path=default_model_path(relative),
            enable_automatic_punctuation=True)
        test_pcm = [0] * c._frame_length

        address = c._handle
        c._handle = None

        try:
            res = c.process(test_pcm)
            self.assertIsNone(res)
        except CheetahError as e:
            self.assertGreater(len(e.message_stack), 0)
            self.assertLess(len(e.message_stack), 8)

        try:
            res = c.flush()
            self.assertIsNone(res)
        except CheetahError as e:
            self.assertGreater(len(e.message_stack), 0)
            self.assertLess(len(e.message_stack), 8)

        c._handle = address


if __name__ == '__main__':
    if len(sys.argv) != 2:
        print("usage: %s ${ACCESS_KEY}" % sys.argv[0])
        exit(1)

    unittest.main(argv=sys.argv[:1])
