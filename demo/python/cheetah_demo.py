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

import argparse
import os
import sys

import soundfile

sys.path.append(os.path.join(os.path.dirname(__file__), '../../binding/python'))

from cheetah import Cheetah


if __name__ == '__main__':
    def abs_path(rel_path):
        return os.path.join(os.path.dirname(__file__), '../..', rel_path)

    parser = argparse.ArgumentParser()

    parser.add_argument(
        '--library_path',
        help="absolute path to Cheetah's dynamic library",
        default=abs_path('lib/linux/x86_64/libpv_cheetah.so'))

    parser.add_argument(
        '--acoustic_model_path',
        help='absolute path to acoustic model parameter file',
        default=abs_path('lib/common/acoustic_model.pv'))

    parser.add_argument(
        '--language_model_path',
        help='absolute path to language model parameter file',
        default=abs_path('lib/common/language_model.pv'))

    parser.add_argument(
        '--license_path',
        help='absolute path to license file',
        default=abs_path('resources/license/cheetah_eval_linux_public.lic'))

    parser.add_argument(
        '--audio_paths',
        help='comma-separated absolute paths to audio files to be transcribed',
        nargs='+',
        required=True)

    args = parser.parse_args()

    cheetah = Cheetah(
        library_path=args.library_path,
        acoustic_model_path=args.acoustic_model_path,
        language_model_path=args.language_model_path,
        license_path=args.license_path)

    for audio_path in args.audio_paths:
        audio_path = os.path.expanduser(audio_path.strip())
        audio, sample_rate = soundfile.read(audio_path, dtype='int16')
        if sample_rate != cheetah.sample_rate:
            raise ValueError('Cheetah can only process audio data with sample rate of %d' % cheetah.sample_rate)

        num_frames = len(audio) // cheetah.frame_length
        transcript = ''
        for i in range(num_frames):
            frame = audio[i * cheetah.frame_length:(i + 1) * cheetah.frame_length]
            partial_transcript, _ = cheetah.process(frame)
            transcript += partial_transcript

        transcript += cheetah.flush()

        print(transcript)
