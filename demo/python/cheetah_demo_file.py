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
import struct
import wave

from pvcheetah import *


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--access_key', required=True)
    parser.add_argument('--model_path', default=None)
    parser.add_argument('--library_path', default=None)
    parser.add_argument('--disable_automatic_punctuation', action='store_true')
    parser.add_argument('--wav_paths', nargs='+', required=True)
    args = parser.parse_args()

    o = create(
        access_key=args.access_key,
        model_path=args.model_path,
        library_path=args.library_path,
        enable_automatic_punctuation=not args.disable_automatic_punctuation)

    try:
        for wav_path in args.wav_paths:
            with wave.open(wav_path, 'rb') as f:
                if f.getframerate() != o.sample_rate:
                    raise ValueError(
                        "invalid sample rate of `%d`. cheetah only accepts `%d`" % (f.getframerate(), o.sample_rate))
                if f.getnchannels() != 1:
                    raise ValueError("this demo can only process single-channel WAV files")
                buffer = f.readframes(f.getnframes())
                audio = struct.unpack('%dh' % (len(buffer) / struct.calcsize('h')), buffer)

            num_frames = len(audio) // o.frame_length
            transcript = ''
            for i in range(num_frames):
                frame = audio[i * o.frame_length:(i + 1) * o.frame_length]
                partial_transcript, _ = o.process(frame)
                print(partial_transcript, end='', flush=True)
                transcript += partial_transcript
            final_transcript = o.flush()
            print(final_transcript)
    except CheetahActivationLimitError:
        print("AccessKey `%s` has reached it's processing limit." % args.access_key)
    finally:
        o.delete()


if __name__ == '__main__':
    main()
