//
// Copyright 2024 Picovoice Inc.
//
// You may not use this file except in compliance with the license. A copy of the license is located in the "LICENSE"
// file accompanying this source.
//
// Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on
// an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the
// specific language governing permissions and limitations under the License.
//
import * as fs from 'fs';
import * as path from 'path';

const ROOT_DIR = path.join(__dirname, '../../..');
const TEST_DATA_JSON = require(path.join(
  ROOT_DIR,
  'resources/.test/test_data.json'
));
const MB_40 = 1024 * 1024 * 40;

function appendLanguage(s: string, language: string): string {
  if (language === 'en') {
    return s;
  }
  return s + '_' + language;
}

export function getModelPathByLanguage(language: string): string {
  return path.join(
    ROOT_DIR,
    `${appendLanguage('lib/common/cheetah_params', language)}.pv`
  );
}

export function getAudioFile(audioFile: string): string {
  return path.join(ROOT_DIR, 'resources/audio_samples', audioFile);
}

function getCpuPart(): string {
  if (!fs.existsSync('/proc/cpuinfo')) {
    return "";
  }
  const cpuInfo = fs.readFileSync('/proc/cpuinfo', 'ascii');
  for (const infoLine of cpuInfo.split('\n')) {
    if (infoLine.includes('CPU part')) {
      const infoLineSplit = infoLine.split(' ');
      return infoLineSplit[infoLineSplit.length - 1].toLowerCase();
    }
  }
  return "";
}

function getModelSize(language: string): number {
  const modelPath = getModelPathByLanguage(language);
  const stats = fs.statSync(modelPath);
  return stats.size;
}

export function getLanguageTestParameters(): [
  string,
  string,
  string,
  string[],
  number,
][] {
  const cpuPart = getCpuPart();
  let parametersJson = TEST_DATA_JSON.tests.language_tests;
  if (cpuPart === "0xd03") {
    parametersJson = parametersJson.filter((x: any) => (getModelSize(x.language) < MB_40));
  }
  return parametersJson.map((x: any) => [
    x.language,
    x.audio_file,
    x.transcript,
    x.punctuations,
    x.error_rate,
  ]);
}
