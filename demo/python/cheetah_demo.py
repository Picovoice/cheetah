import argparse
import os
import sys

import soundfile


def _abs_path(rel_path):
    return os.path.join(os.path.dirname(os.path.abspath(__file__)), rel_path)


sys.path.append(os.path.join(os.path.dirname(__file__), '../../binding/python'))
from cheetah import Cheetah


if __name__ == '__main__':
    parser = argparse.ArgumentParser()

    parser.add_argument(
        '--library_path',
        help="absolute path to Cheetah's dynamic library",
        type=str,
        default=_abs_path('../../lib/linux/x86_64/libpv_cheetah.so'))

    parser.add_argument(
        '--acoustic_model_file_path',
        help='absolute path to acoustic model parameter file',
        type=str,
        default=_abs_path('../../lib/common/acoustic_model.pv'))

    parser.add_argument(
        '--language_model_file_path',
        help='absolute path to language model parameter file',
        type=str,
        default=_abs_path('../../lib/common/language_model.pv'))

    parser.add_argument(
        '--license_file_path',
        help='absolute path to license file',
        type=str,
        default=_abs_path('../../resources/license/cheetah_eval_linux_public.lic'))

    parser.add_argument(
        '--audio_paths',
        help='comma-separated absolute paths to audio files to be transcribed',
        type=str,
        required=True)

    args = parser.parse_args()

    cheetah = Cheetah(
        library_path=args.library_path,
        acoustic_model_file_path=args.acoustic_model_file_path,
        language_model_file_path=args.language_model_file_path,
        license_file_path=args.license_file_path)

    for audio_path in [os.path.expanduser(x.strip()) for x in args.audio_paths.split(',')]:
        audio, sample_rate = soundfile.read(audio_path, dtype='int16')
        if sample_rate != cheetah.sample_rate:
            raise ValueError('Cheetah can only process audio data with sample rate of %d' % cheetah.sample_rate)

        num_frames = len(audio) // cheetah.frame_length
        for i in range(num_frames):
            frame = audio[i * cheetah.frame_length:(i + 1) * cheetah.frame_length]
            cheetah.process(frame)

        print(cheetah.transcribe())
