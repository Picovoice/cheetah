//
//  Copyright 2022-2026 Picovoice Inc.
//  You may not use this file except in compliance with the license. A copy of the license is located in the "LICENSE"
//  file accompanying this source.
//  Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on
//  an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the
//  specific language governing permissions and limitations under the License.
//

import Foundation

import PvCheetah
import Yams

/// iOS binding for Cheetah speech-to-text engine. Provides a Swift interface to the Cheetah library.
public class Cheetah {
    private static let PV_API_URL = "https://rest.picovoice.ai/"
    private static let VALID_LANGUAGES: Set<String> = ["en", "fr", "de", "es", "it", "pt"]

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
    ///   - device: String representation of the device (e.g., CPU or GPU) to use. If set to `best`, the most
    ///   suitable device is selected automatically. If set to `gpu`, the engine uses the first available GPU
    ///   device. To select a specific GPU device, set this argument to `gpu:${GPU_INDEX}`, where `${GPU_INDEX}`
    ///   is the index of the target GPU. If set to `cpu`, the engine will run on the CPU with the default
    ///   number of threads. To specify the number of threads, set this argument to `cpu:${NUM_THREADS}`,
    ///   where `${NUM_THREADS}` is the desired number of threads.
    ///   - endpointDuration: Duration of endpoint in seconds. A speech endpoint is detected when there is a
    ///     chunk of audio (with a duration specified herein) after an utterance without any speech in it.
    ///     Set duration to 0 to disable this. Default is 1 second.
    ///   - enableAutomaticPunctuation: Set to `true` to enable automatic punctuation insertion.
    ///   - enableTextNormalization: Set to `true` to enable text normalization. Enabling this feature improves the
    ///   readability and formatting of Cheetah's transcriptions (e.g. converts number words to digits) at the cost of
    ///   some additional latency.
    /// - Throws: CheetahError
    public init(
            accessKey: String,
            modelPath: String,
            device: String? = nil,
            endpointDuration: Float = 1.0,
            enableAutomaticPunctuation: Bool = false,
            enableTextNormalization: Bool = false) throws {

        if accessKey.count == 0 {
            throw CheetahInvalidArgumentError("AccessKey is required for Cheetah initialization")
        }

        var modelPathArg = modelPath
        if !FileManager().fileExists(atPath: modelPathArg) {
            modelPathArg = try getResourcePath(modelPathArg)
        }

        var deviceArg = device
        if device == nil {
            deviceArg = "best"
        }

        if endpointDuration < 0 {
            throw CheetahInvalidArgumentError("EndpointDuration must be a non-negative number.")
        }

        pv_set_sdk(Cheetah.sdk)

        let status = pv_cheetah_init(
                accessKey,
                modelPathArg,
                deviceArg,
                endpointDuration,
                enableAutomaticPunctuation,
                enableTextNormalization,
                &handle)
        if status != PV_STATUS_SUCCESS {
            let messageStack = try Cheetah.getMessageStack()
            throw Cheetah.pvStatusToCheetahError(status, "Cheetah init failed", messageStack)
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
    ///   - enableTextNormalization: Set to `true` to enable text normalization. Enabling this feature improves the
    ///   readability and formatting of Cheetah's transcriptions (e.g. converts number words to digits) at the cost of
    ///   some additional latency.
    /// - Throws: CheetahError
    public convenience init(
            accessKey: String,
            modelURL: URL,
            device: String? = nil,
            endpointDuration: Float = 1.0,
            enableAutomaticPunctuation: Bool = false,
            enableTextNormalization: Bool = false) throws {
        try self.init(
                accessKey: accessKey,
                modelPath: modelURL.path,
                device: device,
                endpointDuration: endpointDuration,
                enableAutomaticPunctuation: enableAutomaticPunctuation,
                enableTextNormalization: enableTextNormalization)
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
        var endPoint: Bool = false
        var cNumWords: Int32 = 0
        var cWords: UnsafeMutablePointer<pv_word_t>?
        let status = pv_cheetah_process(
                self.handle,
                pcm,
                &cPartialTranscript,
                &cNumWords,
                &cWords,
                &endPoint)
        if status != PV_STATUS_SUCCESS {
            let messageStack = try Cheetah.getMessageStack()
            throw Cheetah.pvStatusToCheetahError(status, "Cheetah process failed", messageStack)
        }

        let transcript = String(cString: cPartialTranscript!)
        pv_cheetah_transcript_delete(cPartialTranscript!)
        if cWords != nil {
            pv_cheetah_words_delete(cNumWords, cWords!)
        }

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
        var cNumWords: Int32 = 0
        var cWords: UnsafeMutablePointer<pv_word_t>?
        let status = pv_cheetah_flush(self.handle, &cFinalTranscript, &cNumWords, &cWords)
        if status != PV_STATUS_SUCCESS {
            let messageStack = try Cheetah.getMessageStack()
            throw Cheetah.pvStatusToCheetahError(status, "Cheetah flush failed", messageStack)
        }

        let transcript = String(cString: cFinalTranscript!)
        pv_cheetah_transcript_delete(cFinalTranscript!)
        if cWords != nil {
            pv_cheetah_words_delete(cNumWords, cWords!)
        }

        return transcript
    }

    /// Processes a frame of audio and returns newly-transcribed text and a flag indicating if an endpoint has been
    /// detected. Upon detection of an endpoint, the client may invoke `.flushAnnotated()` to retrieve any remaining
    /// transcription.
    ///
    /// - Parameters:
    ///   - pcm: A frame of audio samples. The number of samples per frame can be attained by calling
    ///     `Cheetah.frame_length`. The incoming audio needs to have a sample rate equal to `Cheetah.sample_rate`
    ///      and be 16-bit linearly-encoded. Furthermore, Cheetah operates on single-channel audio.
    /// - Throws: CheetahError
    /// - Returns: A CheetahTranscriptAnnotated object containing any newly-transcribed speech, a flag indicating if an
    ///   endpoint has been detected, and a list of transcribed words.
    public func processAnnotated(_ pcm: [Int16]) throws -> CheetahTranscriptAnnotated {
        if handle == nil {
            throw CheetahInvalidStateError("Cheetah must be initialized before processing")
        }

        if pcm.count != Cheetah.frameLength {
            throw CheetahInvalidArgumentError(
                "Frame of audio data must contain \(Cheetah.frameLength) samples" +
                " - given frame contained \(pcm.count)")
        }

        var cPartialTranscript: UnsafeMutablePointer<Int8>?
        var endPoint: Bool = false
        var cNumWords: Int32 = 0
        var cWords: UnsafeMutablePointer<pv_word_t>?
        let status = pv_cheetah_process(
                self.handle,
                pcm,
                &cPartialTranscript,
                &cNumWords,
                &cWords,
                &endPoint)
        if status != PV_STATUS_SUCCESS {
            let messageStack = try Cheetah.getMessageStack()
            throw Cheetah.pvStatusToCheetahError(status, "Cheetah process failed", messageStack)
        }

        let transcript = String(cString: cPartialTranscript!)
        pv_cheetah_transcript_delete(cPartialTranscript!)

        var words: [CheetahWord] = []
        if cWords != nil {
            for i in 0..<Int(cNumWords) {
                words.append(CheetahWord(
                    word: String(cString: cWords![i].word),
                    startSec: cWords![i].start_sec,
                    endSec: cWords![i].end_sec,
                    confidence: cWords![i].confidence))
            }
            pv_cheetah_words_delete(cNumWords, cWords!)
        }

        return CheetahTranscriptAnnotated(
            transcript: transcript,
            isEndpoint: endPoint,
            words: words)
    }

    /// Marks the end of the audio stream, flushes internal state of the object, and returns
    /// any remaining transcribed text.
    ///
    /// - Returns: Returns: A CheetahTranscriptAnnotated object containing any newly-transcribed speech, and a list of
    ///   transcribed words.
    public func flushAnnotated() throws -> CheetahTranscriptAnnotated {
        if handle == nil {
            throw CheetahInvalidStateError("Cheetah must be initialized before flushing")
        }

        var cFinalTranscript: UnsafeMutablePointer<Int8>?
        var cNumWords: Int32 = 0
        var cWords: UnsafeMutablePointer<pv_word_t>?
        let status = pv_cheetah_flush(self.handle, &cFinalTranscript, &cNumWords, &cWords)
        if status != PV_STATUS_SUCCESS {
            let messageStack = try Cheetah.getMessageStack()
            throw Cheetah.pvStatusToCheetahError(status, "Cheetah flush failed", messageStack)
        }

        let transcript = String(cString: cFinalTranscript!)
        pv_cheetah_transcript_delete(cFinalTranscript!)

        var words: [CheetahWord] = []
        if cWords != nil {
            for i in 0..<Int(cNumWords) {
                words.append(CheetahWord(
                    word: String(cString: cWords![i].word),
                    startSec: cWords![i].start_sec,
                    endSec: cWords![i].end_sec,
                    confidence: cWords![i].confidence))
            }
            pv_cheetah_words_delete(cNumWords, cWords!)
        }

        return CheetahTranscriptAnnotated(
            transcript: transcript,
            isEndpoint: false,
            words: words)
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

    /// Trains a new model using the specified `newWords` and `boostWords` arguments.
    ///
    /// - Parameters:
    ///   - accessKey: AccessKey obtained from Picovoice Console (https://console.picovoice.ai/).
    ///   - outputPath: Absolute path to file where the trained model will be saved.
    ///   - language: Two character language code for the model (e.g. "en", "fr").
    ///               See https://picovoice.ai/docs/model-api/cheetah/ for supported languages.
    ///   - newWords: A dictionary of words to pronunciations to add to the new model. Keys should be
    ///               the word string. Values are a Set of pronunciations for the given word, each pronunciation
    ///               is a string of space separated IPA phonemes. An empty Set will result in the training
    ///               generating a default pronunciation.
    ///   - boostWords: A Set of words to "boost". The engine will be more likely to select the boosted words.

    /// - Throws: `CheetahError` if model training fails.
    public static func trainModelFromWords(
        accessKey: String,
        outputPath: String,
        language: String,
        newWords: [String: Set<String>],
        boostWords: Set<String>
    ) throws {
        var newWordsContent: [String: [String]] = [:]
        for (key, value) in newWords {
            newWordsContent[key] = Array(value)
        }
        let boostWordsContent: [String] = Array(boostWords)
        
        let root: [String: Any] = [
            "new": newWords,
            "boost": boostWords
        ]

        let newYaml: String
        do {
            newYaml = try Yams.dump(object: root)
        } catch {
            throw CheetahRuntimeError("Failed to serialize yaml content")
        }

        try trainModelFromYaml(
            accessKey: accessKey,
            outputPath: outputPath,
            language: language,
            yamlContent: newYaml)
    }

    /// Trains a model using a YAML configuration string.
    ///
    /// - Parameters:
    ///   - accessKey: AccessKey obtained from Picovoice Console (https://console.picovoice.ai/).
    ///   - outputPath: Absolute path to file where the trained model will be saved.
    ///   - language: Two character language code for the model (e.g. "en", "fr").
    ///               See https://picovoice.ai/docs/model-api/cheetah/ for supported languages.
    ///   - yamlContent: YAML configuration string to be used for training.
    /// - Throws: `CheetahError` if model training fails.
    public static func trainModelFromYaml(
        accessKey: String,
        outputPath: String,
        language: String,
        yamlContent: String
    ) throws {

        guard VALID_LANGUAGES.contains(language) else {
            throw CheetahInvalidArgumentError("Invalid language ('\(language)')")
        }

        let payload: Data
        do {
            payload = try JSONSerialization.data(withJSONObject: [
                "engine": "cheetah",
                "model_type": "default",
                "yaml_content": yamlContent
            ])
        } catch {
            throw CheetahRuntimeError("Failed to create request payload \(error.localizedDescription)")
        }

        guard let url = URL(string: PV_API_URL + language + "/api/cat") else {
            throw CheetahRuntimeError("Invalid request URL")
        }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.httpBody = payload
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue(accessKey, forHTTPHeaderField: "x-api-key")

        var resultData: Data?
        var resultResponse: URLResponse?
        var resultError: Error?
        let semaphore = DispatchSemaphore(value: 0)

        URLSession.shared.dataTask(with: request) { data, response, error in
            resultData = data
            resultResponse = response
            resultError = error
            semaphore.signal()
        }.resume()
        semaphore.wait()

        if let error = resultError {
            throw CheetahRuntimeError("Request failed: \(error.localizedDescription)")
        }

        guard let http = resultResponse as? HTTPURLResponse else {
            throw CheetahRuntimeError("Invalid response")
        }

        guard (200...299).contains(http.statusCode) else {
            let errorBody = resultData.flatMap { String(data: $0, encoding: .utf8) } ?? ""
            throw CheetahRuntimeError("Failed to train model: \(errorBody)")
        }

        guard let data = resultData, !data.isEmpty else {
            throw CheetahRuntimeError("Empty response body")
        }

        do {
            try data.write(to: URL(fileURLWithPath: outputPath))
        } catch {
            throw CheetahRuntimeError("Failed to save Cheetah model file: \(error.localizedDescription)")
        }
    }

    /// Lists all available devices that Cheetah can use for inference.
    /// Entries in the list can be used as the `device` argument when initializing Cheetah.
    ///
    /// - Throws: CheetahError
    /// - Returns: Array of available devices that Cheetah can be used for inference.
    public static func getAvailableDevices() throws -> [String] {
        var cHardwareDevices: UnsafeMutablePointer<UnsafeMutablePointer<Int8>?>?
        var numHardwareDevices: Int32 = 0
        let status = pv_cheetah_list_hardware_devices(&cHardwareDevices, &numHardwareDevices)
        if status != PV_STATUS_SUCCESS {
            let messageStack = try Cheetah.getMessageStack()
            throw Cheetah.pvStatusToCheetahError(status, "Cheetah getAvailableDevices failed", messageStack)
        }

        var hardwareDevices: [String] = []
        for i in 0..<numHardwareDevices {
            hardwareDevices.append(String(cString: cHardwareDevices!.advanced(by: Int(i)).pointee!))
        }

        pv_cheetah_free_hardware_devices(cHardwareDevices, numHardwareDevices)

        return hardwareDevices
    }

    private static func pvStatusToCheetahError(
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

    private static func getMessageStack() throws -> [String] {
        var messageStackRef: UnsafeMutablePointer<UnsafeMutablePointer<Int8>?>?
        var messageStackDepth: Int32 = 0
        let status = pv_get_error_stack(&messageStackRef, &messageStackDepth)
        if status != PV_STATUS_SUCCESS {
            throw Cheetah.pvStatusToCheetahError(status, "Unable to get Cheetah error state")
        }

        var messageStack: [String] = []
        for i in 0..<messageStackDepth {
            messageStack.append(String(cString: messageStackRef!.advanced(by: Int(i)).pointee!))
        }

        pv_free_error_stack(messageStackRef)

        return messageStack
    }
}
