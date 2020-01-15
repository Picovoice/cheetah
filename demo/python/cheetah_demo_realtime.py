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
import struct
import sys
from threading import Thread

import numpy as np
import pyaudio
import soundfile

sys.path.append(os.path.join(os.path.dirname(__file__), '../../binding/python'))

from cheetah import Cheetah


class CheetahRealtimeDemo(Thread):
    def __init__(
            self,
            library_path,
            acoustic_model_path,
            language_model_path,
            license_path,
            input_device_index=None,
            output_path=None):

        super(CheetahRealtimeDemo, self).__init__()

        self._library_path = library_path
        self._acoustic_model_path = acoustic_model_path
        self._language_model_path = language_model_path
        self._license_path = license_path
        self._input_device_index = input_device_index

        self._output_path = output_path
        if self._output_path is not None:
            self._recorded_frames = []

    def run(self):
        cheetah = None
        pa = None
        audio_stream = None
        try:
            cheetah = Cheetah(
                library_path=self._library_path,
                acoustic_model_path=self._acoustic_model_path,
                language_model_path=self._language_model_path,
                license_path=self._license_path,
                endpoint_duration_sec=1)

            pa = pyaudio.PyAudio()
            audio_stream = pa.open(
                rate=cheetah.sample_rate,
                channels=1,
                format=pyaudio.paInt16,
                input=True,
                frames_per_buffer=cheetah.frame_length,
                input_device_index=self._input_device_index)

            while True:
                pcm = audio_stream.read(cheetah.frame_length)
                pcm = struct.unpack_from("h" * cheetah.frame_length, pcm)

                if self._output_path is not None:
                    self._recorded_frames.append(pcm)

                partial_transcript, is_endpoint = cheetah.process(pcm)
                print(partial_transcript, end='', flush=True)
                if is_endpoint:
                    print(cheetah.flush())
        except Exception as e:
            print(e)
        finally:
            if cheetah is not None:
                print(cheetah.flush())
                cheetah.delete()

            if audio_stream is not None:
                audio_stream.close()

            if pa is not None:
                pa.terminate()

            if self._output_path is not None and len(self._recorded_frames) > 0:
                recorded_audio = np.concatenate(self._recorded_frames, axis=0).astype(np.int16)
                soundfile.write(self._output_path, recorded_audio, samplerate=cheetah.sample_rate, subtype='PCM_16')

    _AUDIO_DEVICE_INFO_KEYS = ['index', 'name', 'defaultSampleRate', 'maxInputChannels']

    @classmethod
    def show_audio_devices_info(cls):
        pa = pyaudio.PyAudio()

        for i in range(pa.get_device_count()):
            info = pa.get_device_info_by_index(i)
            print(', '.join("'%s': '%s'" % (k, str(info[k])) for k in cls._AUDIO_DEVICE_INFO_KEYS))

        pa.terminate()


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

    args = parser.parse_args()

    CheetahRealtimeDemo(
        library_path=args.library_path,
        acoustic_model_path=args.acoustic_model_path,
        language_model_path=args.language_model_path,
        license_path=args.license_path).run()
