#
# Copyright 2023-2026 Picovoice Inc.
#
# You may not use this file except in compliance with the license. A copy of the license is located in the "LICENSE"
# file accompanying this source.
#
# Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on
# an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the
# specific language governing permissions and limitations under the License.
#

import json
import os
from typing import List, Tuple


def get_lib_ext(platform: str) -> str:
    if platform == "windows":
        return "dll"
    elif platform == "mac":
        return "dylib"
    else:
        return "so"


def append_language(s: str, language: str) -> str:
    if language == 'en':
        return s
    return "%s_%s" % (s, language)


def separate_words(text: str, punctuation: set[str] = {"."}) -> list[str]:
    result = []
    for chunk in text.split():
        current = ""
        for char in chunk:
            if char in punctuation:
                if current:
                    result.append(current)
                    current = ""
                result.append(char)
            else:
                current += char
        if current:
            result.append(current)
    return result


def load_languages_test_data() -> List[Tuple[str, str, str, str, List[str], List[str], bool, float, int]]:
    data_file_path = os.path.join(os.path.dirname(__file__), "../../../resources/.test/test_data.json")
    with open(data_file_path, encoding="utf8") as data_file:
        json_test_data = data_file.read()
    test_data = json.loads(json_test_data)['tests']

    language_tests = list()
    for t in test_data['language_tests']:
        for model_file in t['models']:
            language_tests.append(
                (
                    t['language'],
                    model_file,
                    t['audio_file'],
                    t['transcript'],
                    separate_words(t['transcript']),
                    t['punctuations'],
                    t['normalization'],
                    t['error_rate'],
                    2
                )
            )

    return language_tests