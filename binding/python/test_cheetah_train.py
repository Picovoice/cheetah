#
# Copyright 2026 Picovoice Inc.
#
# You may not use this file except in compliance with the license. A copy of the license is located in the "LICENSE"
# file accompanying this source.
#
# Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on
# an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the
# specific language governing permissions and limitations under the License.
#

import sys
import unittest
import uuid

from ._cheetah import Cheetah
from ._factory import train_model_from_words
from ._util import *
from .test_util import *


class CheetahTrainTestCase(unittest.TestCase):

    ACCESS_KEY = sys.argv[1]

    def test_train_model(self):
        relative_path = '../..'

        output_path = f'{str(uuid.uuid4())}.pv'
        train_model_from_words(
            access_key=self.ACCESS_KEY,
            output_path=output_path,
            language="en",
            new_words={'picovoice': ["t l k dʒ ɛ dʒ"]},
            boost_words=['computer'])

        self.assertTrue(os.path.exists(output_path))

        cheetah = Cheetah(
            access_key=self.ACCESS_KEY,
            model_path=output_path,
            device="cpu:1",
            library_path=default_library_path(relative_path))
        cheetah.delete()

        if os.path.exists(output_path):
            os.remove(output_path)

    def test_train_model_invalid_words(self):
        output_path = f'{str(uuid.uuid4())}.pv'
        with self.assertRaises(ValueError):
            train_model_from_words(
                access_key=self.ACCESS_KEY,
                output_path=output_path,
                language="en",
                new_words={'picovoice': [], 1234: []},
                boost_words=['computer', 1256])


if __name__ == '__main__':
    if len(sys.argv) != 2:
        print("usage: test_cheetah_train.py ${ACCESS_KEY}")
        exit(1)

    unittest.main(argv=sys.argv[:1])
