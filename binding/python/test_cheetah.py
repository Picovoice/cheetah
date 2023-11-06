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
import struct
import sys
import unittest
import wave

from parameterized import parameterized

from _cheetah import Cheetah
from _util import *

TEST_PARAMS = [
    [False, "Mr quilter is the apostle of the middle classes and we are glad to welcome his gospel"],
    [True, "Mr. Quilter is the apostle of the middle classes and we are glad to welcome his gospel."],
]


class CheetahTestCase(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        with wave.open(os.path.join(os.path.dirname(__file__), '../../resources/audio_samples/test.wav'), 'rb') as f:
            buffer = f.readframes(f.getnframes())
            cls.pcm = struct.unpack('%dh' % (len(buffer) / struct.calcsize('h')), buffer)

    @staticmethod
    def _create_cheetah(enable_automatic_punctuation: bool) -> Cheetah:
        return Cheetah(
            access_key=sys.argv[1],
            model_path=default_model_path('../..'),
            library_path=default_library_path('../..'),
            enable_automatic_punctuation=enable_automatic_punctuation)

    @parameterized.expand(TEST_PARAMS)
    def test_transcribe(self, enable_automatic_punctuation: bool, ref: str):
        o = self._create_cheetah(enable_automatic_punctuation)

        transcript = ''
        num_frames = len(self.pcm) // o.frame_length
        for i in range(num_frames):
            frame = self.pcm[i * o.frame_length:(i + 1) * o.frame_length]
            partial_transcript, _ = o.process(frame)
            transcript += partial_transcript

        final_transcript = o.flush()
        transcript += final_transcript
        print(transcript)
        self.assertEqual(transcript, ref)

    def test_version(self):
        o = self._create_cheetah(False)
        self.assertIsInstance(o.version, str)
        self.assertGreater(len(o.version), 0)

    def test_message_stack(self):
        relative = '../../'

        error = None
        try:
            c = Cheetah(
                access_key='invalid',
                library_path=default_library_path(relative),
                model_path=get_model_path_by_language(relative),
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
                model_path=get_model_path_by_language(relative),
                enable_automatic_punctuation=True)
            self.assertIsNone(c)
        except CheetahError as e:
            self.assertEqual(len(error), len(e.message_stack))
            self.assertListEqual(list(error), list(e.message_stack))

    def test_process_flush_message_stack(self):
        c = Cheetah(
            access_key=sys.argv[1],
            library_path=default_library_path(relative),
            model_path=get_model_path_by_language(relative),
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

        o._handle = address


if __name__ == '__main__':
    if len(sys.argv) != 2:
        print("usage: %s ${ACCESS_KEY}" % sys.argv[0])
        exit(1)

    unittest.main(argv=sys.argv[:1])
