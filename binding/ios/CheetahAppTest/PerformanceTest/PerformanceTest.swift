//
//  Copyright 2022 Picovoice Inc.
//  You may not use this file except in compliance with the license. A copy of the license is located in the "LICENSE"
//  file accompanying this source.
//  Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on
//  an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the
//  specific language governing permissions and limitations under the License.
//

import Foundation
import XCTest

import Cheetah

class PerformanceTest: XCTestCase {
    let accessKey: String = "{TESTING_ACCESS_KEY_HERE}"
    let iterationString: String = "{NUM_TEST_ITERATIONS}"
    let initThresholdString: String = "{INIT_PERFORMANCE_THRESHOLD_SEC}"
    let procThresholdString: String = "{PROC_PERFORMANCE_THRESHOLD_SEC}"

    override func setUp() {
        super.setUp()
        continueAfterFailure = false
    }

    func testInitPerformance() throws {
        try XCTSkipIf(initThresholdString == "{INIT_PERFORMANCE_THRESHOLD_SEC}")

        let numTestIterations = Int(iterationString) ?? 30
        let initPerformanceThresholdSec = Double(initThresholdString)
        try XCTSkipIf(initPerformanceThresholdSec == nil)

        let bundle = Bundle(for: type(of: self))
        let modelURL = bundle.url(forResource: "cheetah_params", withExtension: "pv")!

        var results: [Double] = []
        for i in 0...numTestIterations {
            var totalNSec = 0.0

            let before = CFAbsoluteTimeGetCurrent()
            let cheetah = try? Cheetah(accessKey: accessKey, modelURL: modelURL)
            let after = CFAbsoluteTimeGetCurrent()
            totalNSec += (after - before)

            // throw away first run to account for cold start
            if i > 0 {
                results.append(totalNSec)
            }
            cheetah?.delete()
        }

        let avgNSec = results.reduce(0.0, +) / Double(numTestIterations)
        let avgSec = Double(round(avgNSec * 1000) / 1000)
        XCTAssertLessThanOrEqual(avgSec, initPerformanceThresholdSec!)
    }

    func testProcessPerformance() throws {
        try XCTSkipIf(procThresholdString == "{PROC_PERFORMANCE_THRESHOLD_SEC}")

        let numTestIterations = Int(iterationString) ?? 30
        let procPerformanceThresholdSec = Double(procThresholdString)
        try XCTSkipIf(procPerformanceThresholdSec == nil)

        let bundle = Bundle(for: type(of: self))

        let modelURL = bundle.url(forResource: "cheetah_params", withExtension: "pv")!
        let cheetah = try? Cheetah(accessKey: accessKey, modelURL: modelURL)

        let fileURL: URL = bundle.url(forResource: "test", withExtension: "wav")!

        let data = try Data(contentsOf: fileURL)
        let frameLengthBytes = Int(Cheetah.frameLength) * 2
        var pcmBuffer = [Int16](repeating: 0, count: Int(Cheetah.frameLength))

        var results: [Double] = []
        for i in 0...numTestIterations {
            var totalNSec = 0.0

            var index = 44
            while index + frameLengthBytes < data.count {
                _ = pcmBuffer.withUnsafeMutableBytes {
                    data.copyBytes(to: $0, from: index..<(index + frameLengthBytes))
                }
                let before = CFAbsoluteTimeGetCurrent()
                _ = try cheetah!.process(pcmBuffer)
                let after = CFAbsoluteTimeGetCurrent()
                totalNSec += (after - before)
                index += frameLengthBytes
            }
            // throw away first run to account for cold start
            if i > 0 {
                results.append(totalNSec)
            }
        }
        cheetah?.delete()

        let avgNSec = results.reduce(0.0, +) / Double(numTestIterations)
        let avgSec = Double(round(avgNSec * 1000) / 1000)
        XCTAssertLessThanOrEqual(avgSec, procPerformanceThresholdSec!)
    }
}
