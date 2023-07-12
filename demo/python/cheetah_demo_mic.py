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

import argparse

from pvcheetah import CheetahActivationLimitError, create
from pvrecorder import PvRecorder


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
        '--endpoint_duration_sec',
        type=float,
        default=1.,
        help='Duration in seconds for speechless audio to be considered an endpoint')
    parser.add_argument(
        '--disable_automatic_punctuation',
        action='store_true',
        help='Disable insertion of automatic punctuation')
    parser.add_argument('--audio_device_index', type=int, default=-1, help='Index of input audio device')
    parser.add_argument('--show_audio_devices', action='store_true', help='Only list available devices and exit')
    args = parser.parse_args()

    if args.show_audio_devices:
        for index, name in enumerate(PvRecorder.get_available_devices()):
            print('Device #%d: %s' % (index, name))
        return

    if not args.access_key:
        print('--access_key is required.')
        return

    cheetah = create(
        access_key=args.access_key,
        library_path=args.library_path,
        model_path=args.model_path,
        endpoint_duration_sec=args.endpoint_duration_sec,
        enable_automatic_punctuation=not args.disable_automatic_punctuation)

    try:
        print('Cheetah version : %s' % cheetah.version)

        recorder = PvRecorder(frame_length=cheetah.frame_length, device_index=args.audio_device_index)
        recorder.start()
        print('Listening... (press Ctrl+C to stop)')

        try:
            while True:
                partial_transcript, is_endpoint = cheetah.process(recorder.read())
                print(partial_transcript, end='', flush=True)
                if is_endpoint:
                    print(cheetah.flush())
        finally:
            print()
            recorder.stop()

    except KeyboardInterrupt:
        pass
    except CheetahActivationLimitError:
        print('AccessKey has reached its processing limit.')
    finally:
        cheetah.delete()


if __name__ == '__main__':
    main()
