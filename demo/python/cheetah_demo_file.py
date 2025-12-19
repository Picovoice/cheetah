#
#    Copyright 2018-2025 Picovoice Inc.
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

import pvcheetah
from pvcheetah import CheetahActivationLimitError, create


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument(
        '--access_key',
        help='AccessKey obtained from Picovoice Console (https://console.picovoice.ai/)')
    parser.add_argument(
        '--library_path',
        help='Absolute path to dynamic library. Default: using the library provided by `pvcheetah`')
    parser.add_argument(
        '--model_path',
        help='Absolute path to Cheetah model. Default: using the model provided by `pvcheetah`')
    parser.add_argument(
        '--disable_automatic_punctuation',
        action='store_true',
        help='Disable insertion of automatic punctuation')
    parser.add_argument(
        '--wav_paths',
        nargs='+',
        metavar='PATH',
        help='Absolute paths to `.wav` files to be transcribed')
    parser.add_argument(
        '--device',
        help='Device to run inference on (`best`, `cpu:{num_threads}` or `gpu:{gpu_index}`). '
             'Default: automatically selects best device')
    parser.add_argument(
        '--show_inference_devices',
        action='store_true',
        help='Print devices that are available to run Cheetah inference')

    args = parser.parse_args()

    if args.show_inference_devices:
        print('\n'.join(pvcheetah.available_devices(library_path=args.library_path)))
        return

    if args.access_key is None or args.wav_paths is None:
        raise ValueError("Arguments --access_key and --wav_paths are required.")

    o = create(
        access_key=args.access_key,
        model_path=args.model_path,
        device=args.device,
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
                if f.getsampwidth() != 2:
                    raise ValueError("this demo can only process 16-bit WAV files")

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
        print('AccessKey has reached its processing limit.')
    finally:
        o.delete()


if __name__ == '__main__':
    main()
