//
//  Copyright 2022-2023 Picovoice Inc.
//  You may not use this file except in compliance with the license. A copy of the license is located in the "LICENSE"
//  file accompanying this source.
//  Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on
//  an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the
//  specific language governing permissions and limitations under the License.
//

import PvCheetah

/// iOS binding for Cheetah speech-to-text engine. Provides a Swift interface to the Cheetah library.
public class Cheetah {

    private var handle: OpaquePointer?

    /// The number of audio samples per frame.
    public static let frameLength = UInt32(pv_cheetah_frame_length())

    /// Audio sample rate accepted by Cheetah.
    public static let sampleRate = UInt32(pv_sample_rate())

    /// Current Cheetah version.
    public static let version = String(cString: pv_cheetah_version())

    private static var sdk = "ios"

    public static func setSdk(sdk: String) {
        self.sdk = sdk
    }

    /// Constructor.
    ///
    /// - Parameters:
    ///   - accessKey: The AccessKey obtained from Picovoice Console (https://console.picovoice.ai).
    ///   - modelPath: Absolute path to file containing model parameters.
    ///   - endpointDuration: Duration of endpoint in seconds. A speech endpoint is detected when there is a
    ///     chunk of audio (with a duration specified herein) after an utterance without any speech in it.
    ///     Set duration to 0 to disable this. Default is 1 second.
    ///   - enableAutomaticPunctuation: Set to `true` to enable automatic punctuation insertion.
    /// - Throws: CheetahError
    public init(
            accessKey: String,
            modelPath: String,
            endpointDuration: Float = 1.0,
            enableAutomaticPunctuation: Bool = false) throws {

        if accessKey.count == 0 {
            throw CheetahInvalidArgumentError("AccessKey is required for Cheetah initialization")
        }

        var modelPathArg = modelPath
        if !FileManager().fileExists(atPath: modelPathArg) {
            modelPathArg = try getResourcePath(modelPathArg)
        }

        if endpointDuration < 0 {
            throw CheetahInvalidArgumentError("EndpointDuration must be a non-negative number.")
        }

        pv_set_sdk(Cheetah.sdk)

        let status = pv_cheetah_init(
                accessKey,
                modelPathArg,
                endpointDuration,
                enableAutomaticPunctuation,
                &handle)
        if status != PV_STATUS_SUCCESS {
            let messageStack = try getMessageStack()
            throw pvStatusToCheetahError(status, "Cheetah init failed", messageStack)
        }
    }

    deinit {
        self.delete()
    }

    /// Constructor.
    ///
    /// - Parameters:
    ///   - accessKey: The AccessKey obtained from Picovoice Console (https://console.picovoice.ai).
    ///   - modelURL: URL to file containing model parameters.
    ///   - endpointDuration: Duration of endpoint in seconds. A speech endpoint is detected when there is a
    ///     chunk of audio (with a duration specified herein) after an utterance without any speech in it.
    ///     Set duration to 0 to disable this. Default is 1 second.
    ///   - enableAutomaticPunctuation: Set to `true` to enable automatic punctuation insertion.
    /// - Throws: CheetahError
    public convenience init(
            accessKey: String,
            modelURL: URL,
            endpointDuration: Float = 1.0,
            enableAutomaticPunctuation: Bool = false) throws {
        try self.init(
                accessKey: accessKey,
                modelPath: modelURL.path,
                endpointDuration: endpointDuration,
                enableAutomaticPunctuation: enableAutomaticPunctuation)
    }

    /// Releases native resources that were allocated to Cheetah
    public func delete() {
        if handle != nil {
            pv_cheetah_delete(handle)
            handle = nil
        }
    }

    /// Processes a frame of audio and returns newly-transcribed text and a flag indicating if an endpoint has been
    /// detected. Upon detection of an endpoint, the client may invoke `.flush()` to retrieve any remaining
    /// transcription.
    ///
    /// - Parameters:
    ///   - pcm: A frame of audio samples. The number of samples per frame can be attained by calling
    ///     `Cheetah.frame_length`. The incoming audio needs to have a sample rate equal to `Cheetah.sample_rate`
    ///      and be 16-bit linearly-encoded. Furthermore, Cheetah operates on single-channel audio.
    /// - Throws: CheetahError
    /// - Returns: Tuple of any newly-transcribed speech (if none is available then an empty string is returned) and a
    ///   flag indicating if an endpoint has been detected.
    public func process(_ pcm: [Int16]) throws -> (String, Bool) {
        if handle == nil {
            throw CheetahInvalidStateError("Cheetah must be initialized before processing")
        }

        if pcm.count != Cheetah.frameLength {
            throw CheetahInvalidArgumentError(
                "Frame of audio data must contain \(Cheetah.frameLength) samples" +
                " - given frame contained \(pcm.count)")
        }

        var cPartialTranscript: UnsafeMutablePointer<Int8>?
        var endPoint = false
        let status = pv_cheetah_process(self.handle, pcm, &cPartialTranscript, &endPoint)
        if status != PV_STATUS_SUCCESS {
            let messageStack = try getMessageStack()
            throw pvStatusToCheetahError(status, "Cheetah process failed", messageStack)
        }

        let transcript = String(cString: cPartialTranscript!)
        pv_cheetah_transcript_delete(cPartialTranscript!)

        return (transcript, endPoint)
    }

    /// Marks the end of the audio stream, flushes internal state of the object, and returns
    /// any remaining transcribed text.
    ///
    /// - Returns: Any remaining transcribed text. If none is available then an empty string is returned.
    public func flush() throws -> String {
        if handle == nil {
            throw CheetahInvalidStateError("Cheetah must be initialized before flushing")
        }

        var cFinalTranscript: UnsafeMutablePointer<Int8>?
        let status = pv_cheetah_flush(self.handle, &cFinalTranscript)
        if status != PV_STATUS_SUCCESS {
            let messageStack = try getMessageStack()
            throw pvStatusToCheetahError(status, "Cheetah flush failed", messageStack)
        }

        let transcript = String(cString: cFinalTranscript!)
        pv_cheetah_transcript_delete(cFinalTranscript!)

        return transcript
    }

    /// Given a path, return the full path to the resource.
    ///
    /// - Parameters:
    ///   - filePath: relative path of a file in the bundle.
    /// - Throws: LeopardIOError
    /// - Returns: The full path of the resource.
    private func getResourcePath(_ filePath: String) throws -> String {
        if let resourcePath = Bundle(for: type(of: self)).resourceURL?.appendingPathComponent(filePath).path {
            if FileManager.default.fileExists(atPath: resourcePath) {
                return resourcePath
            }
        }

        throw CheetahIOError(
            "Could not find file at path '\(filePath)'. If this is a packaged asset, " +
            "ensure you have added it to your xcode project."
        )
    }

    private func pvStatusToCheetahError(
        _ status: pv_status_t,
        _ message: String,
        _ messageStack: [String] = []) -> CheetahError {
        switch status {
        case PV_STATUS_OUT_OF_MEMORY:
            return CheetahMemoryError(message, messageStack)
        case PV_STATUS_IO_ERROR:
            return CheetahIOError(message, messageStack)
        case PV_STATUS_INVALID_ARGUMENT:
            return CheetahInvalidArgumentError(message, messageStack)
        case PV_STATUS_STOP_ITERATION:
            return CheetahStopIterationError(message, messageStack)
        case PV_STATUS_KEY_ERROR:
            return CheetahKeyError(message, messageStack)
        case PV_STATUS_INVALID_STATE:
            return CheetahInvalidStateError(message, messageStack)
        case PV_STATUS_RUNTIME_ERROR:
            return CheetahRuntimeError(message, messageStack)
        case PV_STATUS_ACTIVATION_ERROR:
            return CheetahActivationError(message, messageStack)
        case PV_STATUS_ACTIVATION_LIMIT_REACHED:
            return CheetahActivationLimitError(message, messageStack)
        case PV_STATUS_ACTIVATION_THROTTLED:
            return CheetahActivationThrottledError(message, messageStack)
        case PV_STATUS_ACTIVATION_REFUSED:
            return CheetahActivationRefusedError(message, messageStack)
        default:
            let pvStatusString = String(cString: pv_status_to_string(status))
            return CheetahError("\(pvStatusString): \(message)", messageStack)
        }
    }

    private func getMessageStack() throws -> [String] {
        var messageStackRef: UnsafeMutablePointer<UnsafeMutablePointer<Int8>?>?
        var messageStackDepth: Int32 = 0
        let status = pv_get_error_stack(&messageStackRef, &messageStackDepth)
        if status != PV_STATUS_SUCCESS {
            throw pvStatusToCheetahError(status, "Unable to get Cheetah error state")
        }

        var messageStack: [String] = []
        for i in 0..<messageStackDepth {
            messageStack.append(String(cString: messageStackRef!.advanced(by: Int(i)).pointee!))
        }

        pv_free_error_stack(messageStackRef)

        return messageStack
    }
}
