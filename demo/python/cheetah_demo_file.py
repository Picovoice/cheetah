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

import argparse
import sys

import soundfile
from pvcheetah import *


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--access_key', required=True)
    parser.add_argument('--library_path', default=None)
    parser.add_argument('--model_path', default=None)
    parser.add_argument('--audio_paths', nargs='+', required=True)
    args = parser.parse_args()

    o = create(access_key=args.access_key)

    try:
        for audio_path in args.audio_paths:
            audio, sample_rate = soundfile.read(audio_path, dtype='int16')
            if sample_rate != o.sample_rate:
                raise ValueError('Cheetah can only process audio data with sample rate of `%d`' % o.sample_rate)

            num_frames = len(audio) // o.frame_length
            transcript = ''
            for i in range(num_frames):
                frame = audio[i * o.frame_length:(i + 1) * o.frame_length]
                partial_transcript, _ = o.process(frame)
                sys.stdout.write(partial_transcript)
                sys.stdout.flush()
                transcript += partial_transcript
            final_transcript = o.flush()
            sys.stdout.write(f"{final_transcript}\n")
            sys.stdout.flush()
    except CheetahActivationLimitError:
        print(f"AccessKey `{args.access_key}` has reached it's processing limit.")


if __name__ == '__main__':
    main()
