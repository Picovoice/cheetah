import os
import unittest

import soundfile

from .cheetah import Cheetah


class CheetahTestCase(unittest.TestCase):
    def test_transcribe(self):
        def _abs_path(rel_path):
            return os.path.join(os.path.dirname(__file__), rel_path)

        cheetah = Cheetah(
            library_path=_abs_path('../../lib/linux/x86_64/libpv_cheetah.so'),
            acoustic_model_file_path=_abs_path('../../lib/common/acoustic_model.pv'),
            language_model_file_path=_abs_path('../../lib/common/language_model.pv'),
            license_file_path=_abs_path('../../resources/license/cheetah_eval_linux_public.lic'))

        audio, sample_rate = soundfile.read(_abs_path('../../resources/audio_samples/test.wav'), dtype='int16')
        assert sample_rate == cheetah.sample_rate

        num_frames = len(audio) // cheetah.frame_length
        for i in range(num_frames):
            frame = audio[i * cheetah.frame_length:(i + 1) * cheetah.frame_length]
            cheetah.process(frame)

        self.assertEqual(
            cheetah.transcribe(),
            'MISTER QUILTY IS THE APOSTLE OF THE MIDDLE CLASSES AND WE WERE GLAD TO WELCOME HIS GOSPEL')


if __name__ == '__main__':
    unittest.main()
