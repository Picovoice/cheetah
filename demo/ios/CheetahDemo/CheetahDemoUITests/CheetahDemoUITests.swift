//
//  Copyright 2022 Picovoice Inc.
//  You may not use this file except in compliance with the license. A copy of the license is located in the "LICENSE"
//  file accompanying this source.
//  Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on
//  an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the
//  specific language governing permissions and limitations under the License.
//

import AVFoundation
import XCTest
import Cheetah

class CheetahDemoUITests: XCTestCase {
    let accessKey: String = "{TESTING_ACCESS_KEY_HERE}"
    let transcript: String = "MR QUILTER IS THE APOSTLE OF THE MIDDLE CLASSES AND WE ARE GLAD TO WELCOME HIS GOSPEL"

    var cheetah: Cheetah?

    override func setUp() {
        super.setUp()
        cheetah = try? Cheetah(accessKey: accessKey)
    }

    override func tearDown() {
        super.tearDown()
        cheetah?.delete()
    }

    override func setUpWithError() throws {
        continueAfterFailure = true
    }

    func testTranscribe() throws {
        let bundle = Bundle(for: type(of: self))
        let fileURL: URL = bundle.url(forResource: "test", withExtension: "wav")!
        let data = try Data(contentsOf: fileURL)
        let frameLengthBytes = Int(Cheetah.frameLength) * 2

        var pcmBuffer = Array<Int16>(repeating: 0, count: (data.count / MemoryLayout<Int16>.size))

        var index = 0
        var res = ""
        while (index + frameLengthBytes < data.count) {
            _ = pcmBuffer.withUnsafeMutableBytes { data.copyBytes(to: $0, from: index..<(index + frameLengthBytes)) }
            var (partial, _) = try cheetah!.process(pcmBuffer)
            res += partial
            index += frameLengthBytes
        }

        let final = try cheetah!.flush()
        res += final

        XCTAssertEqual(transcript, res)
    }

    func testVersion() throws {
        XCTAssertTrue(Cheetah.version is String)
        XCTAssertGreaterThan(Cheetah.version, "")
    }
}
