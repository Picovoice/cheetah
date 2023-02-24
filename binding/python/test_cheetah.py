#
#    Copyright 2018-2022 Picovoice Inc.
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


if __name__ == '__main__':
    if len(sys.argv) != 2:
        print("usage: %s ${ACCESS_KEY}" % sys.argv[0])
        exit(1)

    unittest.main(argv=sys.argv[:1])
