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
from threading import Thread

from pvcheetah import *
from pvrecorder import PvRecorder


class Demo(Thread):
    def __init__(
            self,
            access_key: str,
            model_path: Optional[str],
            library_path: Optional[str],
            endpoint_duration_sec: float,
            enable_automatic_punctuation: bool):
        super(Demo, self).__init__()

        self._access_key = access_key
        self._model_path = model_path
        self._library_path = library_path
        self._endpoint_duration_sec = endpoint_duration_sec
        self._enable_automatic_punctuation = enable_automatic_punctuation
        self._is_recording = False
        self._stop = False

    def run(self):
        self._is_recording = True

        o = None
        recorder = None

        try:
            o = create(
                access_key=self._access_key,
                library_path=self._library_path,
                model_path=self._model_path,
                endpoint_duration_sec=self._endpoint_duration_sec)
            recorder = PvRecorder(device_index=-1, frame_length=o.frame_length)
            recorder.start()

            print('Cheetah version : %s' % o.version)

            while True:
                partial_transcript, is_endpoint = o.process(recorder.read())
                print(partial_transcript, end='', flush=True)
                if is_endpoint:
                    print(o.flush())
        except KeyboardInterrupt:
            pass
        finally:
            if recorder is not None:
                recorder.stop()

            if o is not None:
                o.delete()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--access_key', required=True)
    parser.add_argument('--library_path', default=None)
    parser.add_argument('--model_path', default=None)
    parser.add_argument('--endpoint_duration_sec', type=float, default=1.)
    parser.add_argument('--disable_automatic_punctuation', action='store_true')
    args = parser.parse_args()

    Demo(
        access_key=args.access_key,
        library_path=args.library_path,
        model_path=args.model_path,
        endpoint_duration_sec=args.endpoint_duration_sec,
        enable_automatic_punctuation=not args.disable_automatic_punctuation).run()


if __name__ == '__main__':
    main()
