//
//  Copyright 2022-2023 Picovoice Inc.
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
    let transcript: String = "Mr quilter is the apostle of the middle classes and we are glad to welcome his gospel"
    let transcriptWithPunctuation: String =
        "Mr. Quilter is the apostle of the middle classes and we are glad to welcome his gospel."

    let modelURL = Bundle(for: CheetahDemoUITests.self).url(forResource: "cheetah_params", withExtension: "pv")!

    override func setUpWithError() throws {
        continueAfterFailure = true
    }

    func processFile(cheetah: Cheetah, fileURL: URL) throws -> String {
        let data = try Data(contentsOf: fileURL)
        let frameLengthBytes = Int(Cheetah.frameLength) * 2

        var pcmBuffer = [Int16](repeating: 0, count: Int(Cheetah.frameLength))

        var index = 0
        var res = ""
        while index + frameLengthBytes < data.count {
            _ = pcmBuffer.withUnsafeMutableBytes { data.copyBytes(to: $0, from: index..<(index + frameLengthBytes)) }
            let (partial, _) = try cheetah.process(pcmBuffer)
            res += partial
            index += frameLengthBytes
        }

        let final = try cheetah.flush()
        res += final

        return res
    }

    func testTranscribe() throws {
        let cheetah = try Cheetah(accessKey: accessKey, modelURL: modelURL)

        let bundle = Bundle(for: type(of: self))
        let fileURL: URL = bundle.url(forResource: "test", withExtension: "wav")!
        let res: String = try processFile(cheetah: cheetah, fileURL: fileURL)
        cheetah.delete()

        XCTAssertEqual(transcript, res)
    }

    func testTranscribeCustomEndpointDuration() throws {
        let cheetah = try Cheetah(
                accessKey: accessKey,
                modelURL: modelURL,
                endpointDuration: 1.5)

        let bundle = Bundle(for: type(of: self))
        let fileURL: URL = bundle.url(forResource: "test", withExtension: "wav")!
        let res: String = try processFile(cheetah: cheetah, fileURL: fileURL)
        cheetah.delete()

        XCTAssertEqual(transcript, res)
    }

    func testTranscribeWithPunctuation() throws {
        let cheetah = try Cheetah(
                accessKey: accessKey,
                modelURL: modelURL,
                enableAutomaticPunctuation: true)

        let bundle = Bundle(for: type(of: self))
        let fileURL: URL = bundle.url(forResource: "test", withExtension: "wav")!
        let res: String = try processFile(cheetah: cheetah, fileURL: fileURL)
        cheetah.delete()

        XCTAssertEqual(transcriptWithPunctuation, res)
    }

    func testFrameLength() throws {
        XCTAssertGreaterThan(Cheetah.frameLength, 0)
    }

    func testSampleRate() throws {
        XCTAssertGreaterThan(Cheetah.sampleRate, 0)
    }

    func testVersion() throws {
        XCTAssertGreaterThan(Cheetah.version, "")
    }

    func testMessageStack() throws {
        var first_error: String = ""
        do {
            let cheetah = try Cheetah.init(accessKey: "invalid", modelURL: modelURL)
            XCTAssertNil(cheetah)
        } catch {
            first_error = "\(error.localizedDescription)"
            XCTAssert(first_error.count < 1024)
        }

        do {
            let cheetah = try Cheetah.init(accessKey: "invalid", modelURL: modelURL)
            XCTAssertNil(cheetah)
        } catch {
            XCTAssert("\(error.localizedDescription)".count == first_error.count)
        }
    }

    func testProcessMessageStack() throws {
        let cheetah = try Cheetah(accessKey: accessKey, modelURL: modelURL)
        cheetah.delete()

        var testPcm: [Int16] = []
        testPcm.reserveCapacity(Int(Cheetah.frameLength))

        do {
            let res = try cheetah.process(testPcm)
            XCTAssertNil(res)
        } catch {
            XCTAssert("\(error.localizedDescription)".count > 0)
        }
    }
}
