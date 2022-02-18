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
import Cheetah

@objc(PvCheetah)
class PvCheetah: NSObject {
    private var cheetahPool:Dictionary<String, Cheetah> = [:]

    @objc(create:modelPath:endpointDuration,resolver:rejecter:)
    func create(accessKey: String, modelPath: String, endpointDuration: float,
        resolver resolve:RCTPromiseResolveBlock, rejecter reject:RCTPromiseRejectBlock) -> Void {

        do {
            let cheetah = try Cheetah(
                accessKey: accessKey,
                modelPath: try getResourcePath(modelPath)
                endpointDuration: endpointDuration)

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
    func delete(handle:String) -> Void {
        if let cheetah = cheetahPool.removeValue(forKey: handle) {
            cheetah.delete()
        }
    }

    @objc(process:pcm:resolver:rejecter:)
    func process(handle:String, pcm:[Int16],
        resolver resolve:RCTPromiseResolveBlock, rejecter reject:RCTPromiseRejectBlock) -> Void {
        do {
            if let cheetah = cheetahPool[handle] {
                let transcript, isEndpoint = try cheetah.process(pcm)

                var param: [String: Any] = [:]
                param["transcript"] = transcript
                param["isEndpoint"] = isEndpoint

                resolve(param)
            } else {
                let (code, message) = errorToCodeAndMessage(CheetahRuntimeError("Invalid handle provided to Cheetah 'process'"))
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
        func flush(handle:String, resolver resolve:RCTPromiseResolveBlock, rejecter reject:RCTPromiseRejectBlock) -> Void {
            do {
                if let cheetah = cheetahPool[handle] {
                    let result = try cheetah.flush(pcm)
                    resolve(result)
                } else {
                    let (code, message) = errorToCodeAndMessage(CheetahRuntimeError("Invalid handle provided to Cheetah 'process'"))
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

    private func getResourcePath(_ filePath: String) throws -> String {
        if (!FileManager.default.fileExists(atPath: filePath)) {
            if let resourcePath = Bundle(for: type(of: self)).resourceURL?.appendingPathComponent(filePath).path {
                if (FileManager.default.fileExists(atPath: resourcePath)) {
                    return resourcePath
                }
            }

            throw CheetahIOError("Could not find file at path '\(filePath)'. If this is a packaged asset, ensure you have added it to your xcode project.")
        }

        return filePath
    }

    private func errorToCodeAndMessage(_ error: CheetahError) -> (String, String) {
        return (error.name.replacingOccurrences(of: "Error", with: "Exception"), error.localizedDescription)
    }
}
