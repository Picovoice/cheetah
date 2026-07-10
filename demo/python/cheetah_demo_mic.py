#
#    Copyright 2018-2026 Picovoice Inc.
#
#    You may not use this file except in compliance with the license. A copy of the license is located in the "LICENSE"
#    file accompanying this source.
#
#    Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on
#    an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the
#    specific language governing permissions and limitations under the License.
#

import argparse

import pvcheetah
from pvcheetah import (
    CheetahActivationLimitError,
    create
)
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
        '--verbose',
        action='store_true',
        help='Print word-level metadata of the transcription')
    parser.add_argument(
        '--device',
        help='Device to run inference on (`best`, `cpu:{num_threads}` or `gpu:{gpu_index}`). '
             'Default: automatically selects best device')
    parser.add_argument(
        '--endpoint_duration_sec',
        type=float,
        default=1.,
        help='Duration in seconds for speechless audio to be considered an endpoint')
    parser.add_argument(
        '--disable_automatic_punctuation',
        action='store_true',
        help='Disable insertion of automatic punctuation')
    parser.add_argument(
        '--disable_text_normalization',
        action='store_true',
        help='Disable text normalization')
    parser.add_argument('--audio_device_index', type=int, default=-1, help='Index of input audio device')
    parser.add_argument('--show_audio_devices', action='store_true', help='Only list available devices and exit')
    parser.add_argument(
        '--show_inference_devices',
        action='store_true',
        help='Print devices that are available to run Cheetah inference')

    args = parser.parse_args()

    if args.show_inference_devices:
        print('\n'.join(pvcheetah.available_devices(library_path=args.library_path)))
        return

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
        device=args.device,
        endpoint_duration_sec=args.endpoint_duration_sec,
        enable_automatic_punctuation=not args.disable_automatic_punctuation,
        enable_text_normalization=not args.disable_text_normalization)

    try:
        print('Cheetah version : %s' % cheetah.version)

        recorder = PvRecorder(frame_length=cheetah.frame_length, device_index=args.audio_device_index)
        recorder.start()
        print('Listening... (press Ctrl+C to stop)')

        show = True

        try:
            while True:
                partial_output = cheetah.process_annotated(recorder.read())
                if args.verbose:
                    for word in partial_output.words:
                        if args.verbose and show:
                            print(f"{'word':<15} {'start_sec':>10} {'end_sec':>10} {'confidence':>12}", flush=True)
                            print(f"{'-' * 15} {'-' * 10} {'-' * 10} {'-' * 12}", flush=True)
                            show = False
                        print(
                            f"{word.word:<15} "
                            f"{word.start_sec:>10.2f} "
                            f"{word.end_sec:>10.2f} "
                            f"{word.confidence:>12.2f}",
                            flush=True,
                        )
                else:
                    print(partial_output.transcript, end='', flush=True)

                if partial_output.is_endpoint:
                    final_output = cheetah.flush_annotated()
                    if args.verbose:
                        for word in final_output.words:
                            if args.verbose and show:
                                print(f"{'word':<15} {'start_sec':>10} {'end_sec':>10} {'confidence':>12}", flush=True)
                                print(f"{'-' * 15} {'-' * 10} {'-' * 10} {'-' * 12}", flush=True)
                                show = False
                            print(
                                f"{word.word:<15} "
                                f"{word.start_sec:>10.2f} "
                                f"{word.end_sec:>10.2f} "
                                f"{word.confidence:>12.2f}",
                                flush=True,
                            )
                    else:
                        print(final_output.transcript, flush=True)

        finally:
            recorder.stop()

    except KeyboardInterrupt:
        pass
    except CheetahActivationLimitError:
        print('AccessKey has reached its processing limit.')
    finally:
        cheetah.delete()


if __name__ == '__main__':
    main()
