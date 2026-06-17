//
// Copyright 2022-2026 Picovoice Inc.
//
// You may not use this file except in compliance with the license. A copy of the license is located in the "LICENSE"
// file accompanying this source.
//
// Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on
// an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the
// specific language governing permissions and limitations under the License.
//

import Cheetah

@objc(PvCheetah)
class PvCheetah: NSObject {
    private var cheetahPool: [String: Cheetah] = [:]

    override init() {
        super.init()
        Cheetah.setSdk(sdk: "react-native")
    }

    @objc(getAvailableDevices:rejecter:)
    func fromBuiltInKeywords(
        resolver resolve: RCTPromiseResolveBlock,
        rejecter reject: RCTPromiseRejectBlock
    ) {
        do {
            var result: [String] = try Cheetah.getAvailableDevices()
            resolve(result)
        } catch let error as CheetahError {
            let (code, message) = errorToCodeAndMessage(error)
            reject(code, message, nil)
        } catch {
            let (code, message) = errorToCodeAndMessage(CheetahError(error.localizedDescription))
            reject(code, message, nil)
        }
    }

    // swiftlint:disable:next line_length
    @objc(create:modelPath:device:endpointDuration:enableAutomaticPunctuation:enableTextNormalization:resolver:rejecter:)
    func create(
            accessKey: String,
            modelPath: String,
            device: String,
            endpointDuration: Float32,
            enableAutomaticPunctuation: Bool,
            enableTextNormalization: Bool,
            resolver resolve: RCTPromiseResolveBlock,
            rejecter reject: RCTPromiseRejectBlock) {

        do {
            let cheetah = try Cheetah(
                    accessKey: accessKey,
                    modelPath: modelPath,
                    device: device.isEmpty ? nil : device,
                    endpointDuration: endpointDuration,
                    enableAutomaticPunctuation: enableAutomaticPunctuation,
                    enableTextNormalization: enableTextNormalization)

            let handle: String = String(describing: cheetah)
            cheetahPool[handle] = cheetah

            var param: [String: Any] = [:]
            param["handle"] = handle
            param["frameLength"] = Cheetah.frameLength
            param["sampleRate"] = Cheetah.sampleRate
            param["version"] = Cheetah.version

            resolve(param)
        } catch let error as CheetahError {
            let (code, message) = errorToCodeAndMessage(error)
            reject(code, message, nil)
        } catch {
            let (code, message) = errorToCodeAndMessage(CheetahError(error.localizedDescription))
            reject(code, message, nil)
        }
    }

    @objc(delete:)
    func delete(handle: String) {
        if let cheetah = cheetahPool.removeValue(forKey: handle) {
            cheetah.delete()
        }
    }

    @objc(process:pcm:resolver:rejecter:)
    func process(
            handle: String,
            pcm: [Int16],
            resolver resolve: RCTPromiseResolveBlock,
            rejecter reject: RCTPromiseRejectBlock) {
        do {
            if let cheetah = cheetahPool[handle] {
                let (transcript, isEndpoint) = try cheetah.process(pcm)

                var param: [String: Any] = [
                    "transcript": transcript,
                    "isEndpoint": isEndpoint
                ]
                resolve(param)
            } else {
                let (code, message) = errorToCodeAndMessage(
                    CheetahRuntimeError("Invalid handle provided to Cheetah 'process'"))
                reject(code, message, nil)
            }
        } catch let error as CheetahError {
            let (code, message) = errorToCodeAndMessage(error)
            reject(code, message, nil)
        } catch {
            let (code, message) = errorToCodeAndMessage(CheetahError(error.localizedDescription))
            reject(code, message, nil)
        }
    }

    @objc(flush:resolver:rejecter:)
    func flush(
            handle: String,
            resolver resolve: RCTPromiseResolveBlock,
            rejecter reject: RCTPromiseRejectBlock) {
        do {
            if let cheetah = cheetahPool[handle] {
                let transcript = try cheetah.flush()
                var result: [String: Any] = [
                    "transcript": transcript
                ]
                resolve(result)
            } else {
                let (code, message) = errorToCodeAndMessage(
                    CheetahRuntimeError("Invalid handle provided to Cheetah 'process'"))
                reject(code, message, nil)
            }
        } catch let error as CheetahError {
            let (code, message) = errorToCodeAndMessage(error)
            reject(code, message, nil)
        } catch {
            let (code, message) = errorToCodeAndMessage(CheetahError(error.localizedDescription))
            reject(code, message, nil)
        }
    }

    @objc(process:pcm:resolver:rejecter:)
    func processAnnotated(
            handle: String,
            pcm: [Int16],
            resolver resolve: RCTPromiseResolveBlock,
            rejecter reject: RCTPromiseRejectBlock) {
        do {
            if let cheetah = cheetahPool[handle] {
                let transcript = try cheetah.processAnnotated(pcm)

                var words: [[String: Any]] = []
                for word in transcript.words {
                    words.append([
                        "word": word.word,
                        "startSec": word.startSec,
                        "endSec": word.endSec,
                        "confidence": word.confidence
                    ])
                }
                var param: [String: Any] = [
                    "transcript": transcript.transcript,
                    "isEndpoint": transcript.isEndpoint,
                    "words": words
                ]
                resolve(param)
            } else {
                let (code, message) = errorToCodeAndMessage(
                    CheetahRuntimeError("Invalid handle provided to Cheetah 'process'"))
                reject(code, message, nil)
            }
        } catch let error as CheetahError {
            let (code, message) = errorToCodeAndMessage(error)
            reject(code, message, nil)
        } catch {
            let (code, message) = errorToCodeAndMessage(CheetahError(error.localizedDescription))
            reject(code, message, nil)
        }
    }

    @objc(flush:resolver:rejecter:)
    func flushAnnotated(
            handle: String,
            resolver resolve: RCTPromiseResolveBlock,
            rejecter reject: RCTPromiseRejectBlock) {
        do {
            if let cheetah = cheetahPool[handle] {
                let transcript = try cheetah.flushAnnotated()

                var words: [[String: Any]] = []
                for word in transcript.words {
                    words.append([
                        "word": word.word,
                        "startSec": word.startSec,
                        "endSec": word.endSec,
                        "confidence": word.confidence
                    ])
                }
                var result: [String: Any] = [
                    "transcript": transcript.transcript,
                    "words": words
                ]
                resolve(result)
            } else {
                let (code, message) = errorToCodeAndMessage(
                    CheetahRuntimeError("Invalid handle provided to Cheetah 'process'"))
                reject(code, message, nil)
            }
        } catch let error as CheetahError {
            let (code, message) = errorToCodeAndMessage(error)
            reject(code, message, nil)
        } catch {
            let (code, message) = errorToCodeAndMessage(CheetahError(error.localizedDescription))
            reject(code, message, nil)
        }
    }

    private func errorToCodeAndMessage(_ error: CheetahError) -> (String, String) {
        return (error.name.replacingOccurrences(of: "Error", with: "Exception"), error.localizedDescription)
    }
}
