//
// Copyright 2022-2024 Picovoice Inc.
//
// You may not use this file except in compliance with the license. A copy of the license is located in the "LICENSE"
// file accompanying this source.
//
// Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on
// an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the
// specific language governing permissions and limitations under the License.
//

import Flutter
import UIKit
import Cheetah

enum Method: String {
    case CREATE
    case PROCESS
    case FLUSH
    case DELETE
}

public class SwiftCheetahPlugin: NSObject, FlutterPlugin {
    private var cheetahPool: [String: Cheetah] = [:]

    public static func register(with registrar: FlutterPluginRegistrar) {
        let instance = SwiftCheetahPlugin()

        let methodChannel = FlutterMethodChannel(name: "cheetah", binaryMessenger: registrar.messenger())
        registrar.addMethodCallDelegate(instance, channel: methodChannel)

        Cheetah.setSdk(sdk: "flutter")
    }

    public func handle(_ call: FlutterMethodCall, result: @escaping FlutterResult) {
        guard let method = Method(rawValue: call.method) else {
            result(errorToFlutterError(CheetahRuntimeError("Cheetah method '\(call.method)' is not a valid function")))
            return
        }
        let args = call.arguments as! [String: Any]

        switch method {
        case .CREATE:
            do {
                if let accessKey = args["accessKey"] as? String,
                   let modelPath = args["modelPath"] as? String {
                    let endpointDuration = args["endpointDuration"] as? Float
                    let enableAutomaticPunctuation = args["enableAutomaticPunctuation"] as? Bool

                    let cheetah = try Cheetah(
                            accessKey: accessKey,
                            modelPath: modelPath,
                            endpointDuration: endpointDuration ?? 1.0,
                            enableAutomaticPunctuation: enableAutomaticPunctuation ?? false
                    )

                    let handle: String = String(describing: cheetah)
                    cheetahPool[handle] = cheetah

                    let param: [String: Any] = [
                        "handle": handle,
                        "frameLength": Cheetah.frameLength,
                        "sampleRate": Cheetah.sampleRate,
                        "version": Cheetah.version
                    ]
                    result(param)
                } else {
                    result(errorToFlutterError(
                        CheetahInvalidArgumentError("missing required arguments 'accessKey' and 'modelPath'")))
                }
            } catch let error as CheetahError {
                result(errorToFlutterError(error))
            } catch {
                result(errorToFlutterError(CheetahError(error.localizedDescription)))
            }
        case .PROCESS:
            do {
                if let handle = args["handle"] as? String,
                   let frame = args["frame"] as? [Int16] {
                    if let cheetah = cheetahPool[handle] {

                        let (transcript, isEndpoint) = try cheetah.process(frame)
                        let results: [String: Any] = [
                            "transcript": transcript,
                            "isEndpoint": isEndpoint
                        ]
                        result(results)
                    } else {
                        result(errorToFlutterError(
                            CheetahInvalidStateError("Invalid handle provided to Cheetah 'process'")))
                    }
                } else {
                    result(errorToFlutterError(
                        CheetahInvalidArgumentError("missing required arguments 'handle' and 'frame'")))
                }
            } catch let error as CheetahError {
                result(errorToFlutterError(error))
            } catch {
                result(errorToFlutterError(CheetahError(error.localizedDescription)))
            }
        case .FLUSH:
            do {
                if let handle = args["handle"] as? String {
                    if let cheetah = cheetahPool[handle] {
                        let transcript = try cheetah.flush()
                        let results: [String: Any] = [
                            "transcript": transcript
                        ]
                        result(results)
                    } else {
                        result(errorToFlutterError(
                            CheetahInvalidStateError("Invalid handle provided to Cheetah 'process'")))
                    }
                } else {
                    result(errorToFlutterError(CheetahInvalidArgumentError("missing required arguments 'handle'")))
                }
            } catch let error as CheetahError {
                result(errorToFlutterError(error))
            } catch {
                result(errorToFlutterError(CheetahError(error.localizedDescription)))
            }
        case .DELETE:
            if let handle = args["handle"] as? String {
                if let cheetah = cheetahPool.removeValue(forKey: handle) {
                    cheetah.delete()
                }
            }
        }
    }

    private func errorToFlutterError(_ error: CheetahError) -> FlutterError {
        return FlutterError(
            code: error.name.replacingOccurrences(of: "Error", with: "Exception"),
            message: error.localizedDescription, details: nil)
    }
}
