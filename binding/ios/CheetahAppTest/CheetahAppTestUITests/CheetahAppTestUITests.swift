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
    let initThresholdString: String = "{INIT_PERFORMANCE_THRESHOLD_SEC}"
    let procThresholdString: String = "{PROC_PERFORMANCE_THRESHOLD_SEC}"

    let transcript: String = "MR QUILTER IS THE APOSTLE OF THE MIDDLE CLASSES AND WE ARE GLAD TO WELCOME HIS GOSPEL"

    override func setUpWithError() throws {
        continueAfterFailure = true
    }

    func testTranscribe() throws {
        let bundle = Bundle(for: type(of: self))

        let modelURL = bundle.url(forResource: "cheetah_params", withExtension: "pv")!
        let cheetah = try? Cheetah(accessKey: accessKey, modelURL: modelURL)

        let fileURL: URL = bundle.url(forResource: "test", withExtension: "wav")!
        let data = try Data(contentsOf: fileURL)
        let frameLengthBytes = Int(Cheetah.frameLength) * 2

        var pcmBuffer = Array<Int16>(repeating: 0, count: Int(Cheetah.frameLength))

        var index = 0
        var res = ""
        while (index + frameLengthBytes < data.count) {
            _ = pcmBuffer.withUnsafeMutableBytes { data.copyBytes(to: $0, from: index..<(index + frameLengthBytes)) }
            let (partial, _) = try cheetah!.process(pcmBuffer)
            res += partial
            index += frameLengthBytes
        }

        let final = try cheetah!.flush()
        res += final

        cheetah?.delete()

        XCTAssertEqual(transcript, res)
    }

    func testVersion() throws {
        XCTAssertTrue(Cheetah.version is String)
        XCTAssertGreaterThan(Cheetah.version, "")
    }

    func testPerformance() throws {
        try XCTSkipIf(initThresholdString == "{INIT_PERFORMANCE_THRESHOLD_SEC}")
        try XCTSkipIf(procThresholdString == "{PROC_PERFORMANCE_THRESHOLD_SEC}")

        let initPerformanceThresholdSec = Double(initThresholdString)
        try XCTSkipIf(initPerformanceThresholdSec == nil)
        let procPerformanceThresholdSec = Double(procThresholdString)
        try XCTSkipIf(procPerformanceThresholdSec == nil)

        let bundle = Bundle(for: type(of: self))

        let modelURL = bundle.url(forResource: "cheetah_params", withExtension: "pv")!
        let beforeInit = CFAbsoluteTimeGetCurrent()
        let cheetah = try? Cheetah(accessKey: accessKey, modelURL: modelURL)
        let afterInit = CFAbsoluteTimeGetCurrent()

        let fileURL:URL = bundle.url(forResource: "multiple_keywords", withExtension: "wav")!

        let data = try Data(contentsOf: fileURL)
        let frameLengthBytes = Int(Cheetah.frameLength) * 2
        var pcmBuffer = Array<Int16>(repeating: 0, count: Int(Cheetah.frameLength))

        var totalNSecProc = 0.0
        var index = 44
        while(index + frameLengthBytes < data.count) {
            _ = pcmBuffer.withUnsafeMutableBytes { data.copyBytes(to: $0, from: index..<(index + frameLengthBytes)) }
            let beforeProc = CFAbsoluteTimeGetCurrent()
            let _ = try cheetah!.process(pcmBuffer)
            let afterProc = CFAbsoluteTimeGetCurrent()
            totalNSecProc += (afterProc - beforeProc)
            index += frameLengthBytes
        }

        cheetah?.delete()

        let totalSecInit = Double(round((afterInit - beforeInit) * 1000) / 1000)
        let totalSecProc = Double(round(totalNSecProc * 1000) / 1000)
        XCTAssertLessThanOrEqual(totalSecInit, initPerformanceThresholdSec!)
        XCTAssertLessThanOrEqual(totalSecProc, procPerformanceThresholdSec!)
    }
}
