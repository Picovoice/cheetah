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

import json
import os


def get_lib_ext(platform):
    if platform == "windows":
        return "dll"
    elif platform == "mac":
        return "dylib"
    else:
        return "so"


def append_language(s, language):
    if language == 'en':
        return s
    return "%s_%s" % (s, language)
