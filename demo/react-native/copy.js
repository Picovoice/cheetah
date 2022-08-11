//
// Copyright 2022 Picovoice Inc.
//
// You may not use this file except in compliance with the license. A copy of the license is located in the "LICENSE"
// file accompanying this source.
//
// Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on
// an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the
// specific language governing permissions and limitations under the License.
//

const mkdirp = require('mkdirp');
const ncp = require('ncp').ncp;

const androidAssetPath =
  './android/cheetah-rn-demo-app/src/main/assets/cheetah_params.pv';
const iosAssetPath = './ios/CheetahDemo/cheetah_params.pv';

mkdirp.sync('./android/cheetah-rn-demo-app/src/main/assets/');

ncp('../../lib/common/cheetah_params.pv', androidAssetPath, (error) => {
  if (error) {
    return console.error(error);
  }
  console.log('Copied Android params.');
});

ncp('../../lib/common/cheetah_params.pv', iosAssetPath, (error) => {
  if (error) {
    return console.error(error);
  }
  console.log('Copied iOS params.');
});
