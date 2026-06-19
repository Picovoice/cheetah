//
//  Copyright 2026 Picovoice Inc.
//  You may not use this file except in compliance with the license. A copy of the license is located in the "LICENSE"
//  file accompanying this source.
//  Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on
//  an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the
//  specific language governing permissions and limitations under the License.
//

import AVFoundation
import XCTest
import Yams

import Cheetah

class CheetahTrainTests: XCTestCase {
    let accessKey: String = "{TESTING_ACCESS_KEY_HERE}"

    func testTrainModel() throws {
        let fileManager = FileManager.default
        let urls = fileManager.urls(for: .documentDirectory, in: .userDomainMask)
        guard let documentsDirectory = urls.first else {
            XCTFail("Could not access document directory")
            return
        }
        let outputPath = documentsDirectory.appendingPathComponent("custom_cheetah_params.pv").path

        let newWords: [String: [String]] = ["picovoice": ["t l k dʒ ɛ dʒ"]]
        let boostWords: [String] = ["computer"]

        try Cheetah.trainModelFromWords(
            accessKey: accessKey,
            outputPath: outputPath,
            language: "en",
            newWords: newWords,
            boostWords: boostWords
        )

        let r = try Cheetah(
            accessKey: accessKey,
            modelPath: outputPath
        )

        r.delete()
    }
}
