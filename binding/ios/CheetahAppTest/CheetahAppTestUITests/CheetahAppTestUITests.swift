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

extension String {
    subscript(index: Int) -> Character {
        return self[self.index(self.startIndex, offsetBy: index)]
    }
}

extension String {
    public func levenshtein(_ other: String) -> Int {
        let sCount = self.count
        let oCount = other.count

        guard sCount != 0 else {
            return oCount
        }

        guard oCount != 0 else {
            return sCount
        }

        let line: [Int]  = Array(repeating: 0, count: oCount + 1)
        var mat: [[Int]] = Array(repeating: line, count: sCount + 1)

        for i in 0...sCount {
            mat[i][0] = i
        }

        for j in 0...oCount {
            mat[0][j] = j
        }

        for j in 1...oCount {
            for i in 1...sCount {
                if self[i - 1] == other[j - 1] {
                    mat[i][j] = mat[i - 1][j - 1]       // no operation
                } else {
                    let del = mat[i - 1][j] + 1         // deletion
                    let ins = mat[i][j - 1] + 1         // insertion
                    let sub = mat[i - 1][j - 1] + 1     // substitution
                    mat[i][j] = min(min(del, ins), sub)
                }
            }
        }

        return mat[sCount][oCount]
    }
}

struct TestData: Decodable {
    var tests: Tests
}

struct Tests: Decodable {
    var language_tests: [LanguageTest]
}

struct LanguageTest: Decodable {
    var language: String
    var audio_file: String
    var transcript: String
    var punctuations: [String]
    var error_rate: Float
}

class CheetahDemoUITests: XCTestCase {
    let accessKey: String = "{TESTING_ACCESS_KEY_HERE}"

    override func setUpWithError() throws {
        continueAfterFailure = true
    }

    func characterErrorRate(transcript: String, expectedTranscript: String) -> Float {
        return Float(transcript.levenshtein(expectedTranscript)) / Float(expectedTranscript.count)
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

    func runTestTranscribe(
            modelPath: String,
            testAudio: String,
            expectedTranscript: String,
            errorRate: Float,
            enableAutomaticPunctuation: Bool = false
        ) throws {
        let bundle = Bundle(for: type(of: self))
        let audioFileURL: URL = bundle.url(
                forResource: testAudio,
                withExtension: "",
                subdirectory: "test_resources/audio_samples")!

        let cheetah = try Cheetah(
                accessKey: accessKey,
                modelPath: modelPath,
                enableAutomaticPunctuation: enableAutomaticPunctuation)

        let res: String = try processFile(cheetah: cheetah, fileURL: audioFileURL)
        cheetah.delete()

        XCTAssert(characterErrorRate(
                transcript: res,
                expectedTranscript: expectedTranscript) < errorRate)
    }

    func testTranscribe() throws {
        let bundle = Bundle(for: type(of: self))
        let testDataJsonUrl = bundle.url(
            forResource: "test_data",
            withExtension: "json",
            subdirectory: "test_resources")!
        let testDataJsonData = try Data(contentsOf: testDataJsonUrl)
        let testData = try JSONDecoder().decode(TestData.self, from: testDataJsonData)

        for testCase in testData.tests.language_tests {
            let suffix = testCase.language == "en" ? "" : "_\(testCase.language)"
            let modelPath: String = bundle.path(
                forResource: "cheetah_params\(suffix)",
                ofType: "pv",
                inDirectory: "test_resources/model_files")!

            var expectedTranscript = testCase.transcript
            for p in testCase.punctuations {
                expectedTranscript = expectedTranscript.replacingOccurrences(of: p, with: "")
            }

            try XCTContext.runActivity(named: "(\(testCase.language))") { _ in
                try runTestTranscribe(
                        modelPath: modelPath,
                        testAudio: testCase.audio_file,
                        expectedTranscript: expectedTranscript,
                        errorRate: testCase.error_rate)
            }
        }
    }

    func testTranscribeWithPunctuation() throws {
        let bundle = Bundle(for: type(of: self))
        let testDataJsonUrl = bundle.url(
            forResource: "test_data",
            withExtension: "json",
            subdirectory: "test_resources")!
        let testDataJsonData = try Data(contentsOf: testDataJsonUrl)
        let testData = try JSONDecoder().decode(TestData.self, from: testDataJsonData)

        for testCase in testData.tests.language_tests {
            let suffix = testCase.language == "en" ? "" : "_\(testCase.language)"
            let modelPath: String = bundle.path(
                forResource: "cheetah_params\(suffix)",
                ofType: "pv",
                inDirectory: "test_resources/model_files")!

            try XCTContext.runActivity(named: "(\(testCase.language))") { _ in
                try runTestTranscribe(
                        modelPath: modelPath,
                        testAudio: testCase.audio_file,
                        expectedTranscript: testCase.transcript,
                        errorRate: testCase.error_rate,
                        enableAutomaticPunctuation: true)
            }
        }
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
        let bundle = Bundle(for: type(of: self))
        let modelURL: URL = bundle.url(
            forResource: "cheetah_params",
            withExtension: "pv",
            subdirectory: "test_resources/model_files")!

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
        let bundle = Bundle(for: type(of: self))
        let modelURL: URL = bundle.url(
            forResource: "cheetah_params",
            withExtension: "pv",
            subdirectory: "test_resources/model_files")!

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
