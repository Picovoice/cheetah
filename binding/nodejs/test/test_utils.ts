//
// Copyright 2023 Picovoice Inc.
//
// You may not use this file except in compliance with the license. A copy of the license is located in the "LICENSE"
// file accompanying this source.
//
// Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on
// an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the
// specific language governing permissions and limitations under the License.
//
import * as path from 'path';

const ROOT_DIR = path.join(__dirname, '../../..');

export const TRANSCRIPT =
  'Mr quilter is the apostle of the middle classes and we are glad to welcome his gospel';
export const TRANSCRIPT_WITH_PUNCTUATION =
    'Mr. Quilter is the apostle of the middle classes and we are glad to welcome his gospel.';

export function getModelPath(): string {
  return path.join(
    ROOT_DIR,
    `lib/common/cheetah_params.pv`
  );
}

export function getAudioFile(audioFile: string): string {
  return path.join(ROOT_DIR, 'resources/audio_samples', audioFile);
}

export function getTestParameters(): [
  string,
  string,
  string,
  number,
  string
][] {
  return [
    ["en", TRANSCRIPT, TRANSCRIPT_WITH_PUNCTUATION, 0.025, "test.wav"]
  ];
}
