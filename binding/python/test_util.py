#
# Copyright 2023 Picovoice Inc.
#
# You may not use this file except in compliance with the license. A copy of the license is located in the "LICENSE"
# file accompanying this source.
#
# Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on
# an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the
# specific language governing permissions and limitations under the License.
#

import struct
import wave
from typing import *


def load_test_data() -> List[Tuple[str, str, str, List[str], float]]:
    parameters = [
        (
            "en",
            "test.wav",
            "Mr. Quilter is the apostle of the middle classes and we are glad to welcome his gospel.",
            ["."],
            0.025
        )
    ]

    return parameters


def read_wav_file(file_name: str, sample_rate: int) -> Tuple:
    wav_file = wave.open(file_name, mode="rb")
    channels = wav_file.getnchannels()
    num_frames = wav_file.getnframes()

    if wav_file.getframerate() != sample_rate:
        raise ValueError(
            "Audio file should have a sample rate of %d, got %d" % (sample_rate, wav_file.getframerate()))

    samples = wav_file.readframes(num_frames)
    wav_file.close()

    frames = struct.unpack('h' * num_frames * channels, samples)

    if channels == 2:
        print("Picovoice processes single-channel audio but stereo file is provided. Processing left channel only.")

    return frames[::channels]


def get_word_error_rate(transcript: str, expected_transcript: str, use_cer: bool = False) -> float:
    transcript_split = list(transcript) if use_cer else transcript.split()
    expected_split = list(expected_transcript) if use_cer else expected_transcript.split()
    return _levenshtein_distance(transcript_split, expected_split) / len(transcript)


def _levenshtein_distance(words1: Sequence[str], words2: Sequence[str]) -> int:
    res = [[0] * (len(words1) + 2) for _ in range(len(words2) + 1)]
    for i in range(len(words1) + 1):
        res[i][0] = i
    for j in range(len(words2) + 1):
        res[0][j] = j

    for i in range(1, len(words1) + 1):
        for j in range(1, len(words2) + 1):
            res[i][j] = min(
                res[i - 1][j] + 1,
                res[i][j - 1] + 1,
                res[i - 1][j - 1] + (0 if words1[i - 1].upper() == words2[j - 1].upper() else 1)
            )

    return res[len(words1)][len(words2)]
