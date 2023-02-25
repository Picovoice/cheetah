#
#    Copyright 2022 Picovoice Inc.
#
#    You may not use this file except in compliance with the license. A copy of the license is located in the "LICENSE"
#    file accompanying this source.
#
#    Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on
#    an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the
#    specific language governing permissions and limitations under the License.
#

import os
import struct
import sys
import time
import unittest
import wave

from _cheetah import Cheetah
from _util import *


class CheetahPerformanceTestCase(unittest.TestCase):
    ACCESS_KEY = sys.argv[1]
    NUM_TEST_ITERATIONS = int(sys.argv[2])
    INIT_PERFORMANCE_THRESHOLD_SEC = float(sys.argv[3])
    PROC_PERFORMANCE_THRESHOLD_SEC = float(sys.argv[4])
    AUDIO_PATH = os.path.join(os.path.dirname(__file__), '../../resources/audio_samples/test.wav')

    def test_performance_init(self):

        perf_results = list()
        for i in range(self.NUM_TEST_ITERATIONS + 1):
            start = time.perf_counter()
            cheetah = Cheetah(
                access_key=self.ACCESS_KEY,
                library_path=default_library_path('../..'),
                model_path=default_model_path('../..')
            )
            init_time = time.perf_counter() - start

            if i > 0:
                perf_results.append(init_time)

            cheetah.delete()

        avg_perf = sum(perf_results) / self.NUM_TEST_ITERATIONS
        print("Average init performance: %s" % avg_perf)
        self.assertLess(avg_perf, self.INIT_PERFORMANCE_THRESHOLD_SEC)

    def test_performance_proc(self):
        with wave.open(self.AUDIO_PATH, 'rb') as f:
            buffer = f.readframes(f.getnframes())
            pcm = struct.unpack('%dh' % (len(buffer) / struct.calcsize('h')), buffer)

        cheetah = Cheetah(
            access_key=self.ACCESS_KEY,
            library_path=default_library_path('../..'),
            model_path=default_model_path('../..')
        )

        num_frames = len(pcm) // cheetah.frame_length

        perf_results = list()
        for i in range(self.NUM_TEST_ITERATIONS + 1):
            total_proc_time = 0
            for j in range(num_frames):
                frame = pcm[j * cheetah.frame_length:(j + 1) * cheetah.frame_length]
                start = time.perf_counter()
                cheetah.process(frame)
                total_proc_time += time.perf_counter() - start

            if i > 0:
                perf_results.append(total_proc_time)

        cheetah.delete()

        avg_perf = sum(perf_results) / self.NUM_TEST_ITERATIONS
        print("Average proc performance: %s" % avg_perf)
        self.assertLess(avg_perf, self.PROC_PERFORMANCE_THRESHOLD_SEC)


if __name__ == '__main__':
    unittest.main(argv=sys.argv[:1])
