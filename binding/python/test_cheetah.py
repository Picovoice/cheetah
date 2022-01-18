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

from cheetah import Cheetah
from util import *


class CheetahTestCase(unittest.TestCase):
    _AUDIO_PATH = os.path.join(os.path.dirname(__file__), '../../resources/audio_samples/test.wav')
    _TRANSCRIPT = "MR QUILTER IS THE APOSTLE OF THE MIDDLE CLASSES AND WE ARE GLAD TO WELCOME HIS GOSPEL"

    _o = None

    @classmethod
    def setUpClass(cls):
        cls._o = Cheetah(
            access_key=sys.argv[1],
            library_path=default_library_path('../..'),
            model_path=default_model_path('../..')
        )

    @classmethod
    def tearDownClass(cls):
        cls._o.delete()

    def test_transcribe(self):
        with wave.open(self._AUDIO_PATH, 'rb') as f:
            buffer = f.readframes(f.getnframes())
            pcm = struct.unpack('%dh' % (len(buffer) / struct.calcsize('h')), buffer)

        transcript = ''
        num_frames = len(pcm) // self._o.frame_length
        for i in range(num_frames):
            frame = pcm[i * self._o.frame_length:(i + 1) * self._o.frame_length]
            partial_transcript, _ = self._o.process(frame)
            transcript += partial_transcript

        final_transcript = self._o.flush()
        transcript += final_transcript
        self.assertEqual(transcript, self._TRANSCRIPT)

    def test_version(self):
        self.assertIsInstance(self._o.version, str)
        self.assertGreater(len(self._o.version), 0)


if __name__ == '__main__':
    unittest.main(argv=sys.argv[:1])
