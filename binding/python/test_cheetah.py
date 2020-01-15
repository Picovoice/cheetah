#
#    Copyright 2018 Picovoice Inc.
#
#    You may not use this file except in compliance with the license. A copy of the license is located in the "LICENSE"
#    file accompanying this source.
#
#    Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on
#    an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the
#    specific language governing permissions and limitations under the License.
#

import os
import unittest

import soundfile
from cheetah import Cheetah


class CheetahTestCase(unittest.TestCase):
    def test_transcribe(self):
        def abs_path(rel_path):
            return os.path.join(os.path.dirname(__file__), '../..', rel_path)

        cheetah = Cheetah(
            library_path=abs_path('lib/linux/x86_64/libpv_cheetah.so'),
            acoustic_model_path=abs_path('lib/common/acoustic_model.pv'),
            language_model_path=abs_path('lib/common/language_model.pv'),
            license_path=abs_path('resources/license/cheetah_eval_linux_public.lic'))

        audio, sample_rate = soundfile.read(abs_path('resources/audio_samples/test.wav'), dtype='int16')
        assert sample_rate == cheetah.sample_rate

        transcript = ''
        num_frames = len(audio) // cheetah.frame_length
        for i in range(num_frames):
            frame = audio[i * cheetah.frame_length:(i + 1) * cheetah.frame_length]
            partial_transcript, _ = cheetah.process(frame)
            transcript += partial_transcript

        final_transcript = cheetah.flush()
        transcript += final_transcript
        self.assertEqual(
            transcript,
            "MISTER QUILTER IS THE APOSTLE OF THE MIDDLE CLASSES AND WE ARE GLAD TO WELCOME HIS GOSPEL")


if __name__ == '__main__':
    unittest.main()
