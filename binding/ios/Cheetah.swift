//
//  Copyright 2022 Picovoice Inc.
//  You may not use this file except in compliance with the license. A copy of the license is located in the "LICENSE"
//  file accompanying this source.
//  Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on
//  an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the
//  specific language governing permissions and limitations under the License.
//

import PvCheetah

/// iOS binding for Cheetah wake word engine. Provides a Swift interface to the Cheetah library.
public class Cheetah {

    static let resourceBundle: Bundle = {
        let myBundle = Bundle(for: Cheetah.self)

        guard let resourceBundleURL = myBundle.url(
                forResource: "CheetahResources", withExtension: "bundle")
                else { fatalError("CheetahResources.bundle not found") }

        guard let resourceBundle = Bundle(url: resourceBundleURL)
                else { fatalError("Could not open CheetahResources.bundle") }

        return resourceBundle
    }()

    private var handle: OpaquePointer?
    public static let frameLength = UInt32(pv_cheetah_frame_length())
    public static let sampleRate = UInt32(pv_sample_rate())
    public static let version = String(cString: pv_cheetah_version())

    /// Constructor.
    ///
    /// - Parameters:
    ///   - accessKey: The AccessKey obtained from Picovoice Console (https://console.picovoice.ai).
    ///   - modelPath: Absolute path to file containing model parameters.
    ///   - endpointDuration: Duration of endpoint in seconds. A speech endpoint is detected when there is a
    ///     chunk of audio (with a duration specified herein) after an utterance without any speech in it.
    ///     Set duration to 0 to disable this. Default is 1 second.
    /// - Throws: CheetahError
    public init(accessKey: String, modelPath: String? = nil, endpointDuration: Float = 1.0) throws {

        var modelPathArg = modelPath
        if (modelPath == nil){
            modelPathArg  = Cheetah.resourceBundle.path(forResource: "cheetah_params", ofType: "pv")
            if modelPathArg == nil {
                throw CheetahIOError("Unable to find the default model path")
            }
        }

        if accessKey.count == 0 {
            throw CheetahInvalidArgumentError("AccessKey is required for Cheetah initialization")
        }

        if !FileManager().fileExists(atPath: modelPathArg!) {
            throw CheetahInvalidArgumentError("Model file at does not exist at '\(modelPathArg!)'")
        }

        if endpointDuration <= 0 {
            throw CheetahInvalidArgumentError("EndpointDuration must be a number greater than 0")
        }

        let status = pv_cheetah_init(
                accessKey,
                modelPathArg,
                endpointDuration,
                &handle)
        try checkStatus(status, "Cheetah init failed")
    }

    deinit {
        self.delete()
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
    public func process(_ pcm:[Int16]) throws -> (String, Bool) {
        if handle == nil {
            throw CheetahInvalidStateError("Cheetah must be initialized before processing")
        }

        if pcm.count == 0 {
            throw CheetahInvalidArgumentError("pcm must not be empty")
        }

        var cPartialTranscript: UnsafeMutablePointer<Int8>?
        var endPoint = false
        let status = pv_cheetah_process(self.handle, pcm, &cPartialTranscript, &endPoint)
        try checkStatus(status, "Cheetah process failed")

        let transcript = String(cString: cPartialTranscript!)
        cPartialTranscript?.deallocate()

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
        try checkStatus(status, "Cheetah flush failed")

        let transcript = String(cString: cFinalTranscript!)
        cFinalTranscript?.deallocate()

        return transcript
    }

    private func checkStatus(_ status: pv_status_t, _ message: String) throws {
        if status == PV_STATUS_SUCCESS {
            return
        }

        switch status {
        case PV_STATUS_OUT_OF_MEMORY:
            throw CheetahMemoryError(message)
        case PV_STATUS_IO_ERROR:
            throw CheetahIOError(message)
        case PV_STATUS_INVALID_ARGUMENT:
            throw CheetahInvalidArgumentError(message)
        case PV_STATUS_STOP_ITERATION:
            throw CheetahStopIterationError(message)
        case PV_STATUS_KEY_ERROR:
            throw CheetahKeyError(message)
        case PV_STATUS_INVALID_STATE:
            throw CheetahInvalidStateError(message)
        case PV_STATUS_RUNTIME_ERROR:
            throw CheetahRuntimeError(message)
        case PV_STATUS_ACTIVATION_ERROR:
            throw CheetahActivationError(message)
        case PV_STATUS_ACTIVATION_LIMIT_REACHED:
            throw CheetahActivationLimitError(message)
        case PV_STATUS_ACTIVATION_THROTTLED:
            throw CheetahActivationThrottledError(message)
        case PV_STATUS_ACTIVATION_REFUSED:
            throw CheetahActivationRefusedError(message)
        default:
            let pvStatusString = String(cString: pv_status_to_string(status))
            throw CheetahError("\(pvStatusString): \(message)")
        }
    }
}
