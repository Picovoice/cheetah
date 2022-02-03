//
//  Copyright 2022 Picovoice Inc.
//  You may not use this file except in compliance with the license. A copy of the license is located in the "LICENSE"
//  file accompanying this source.
//  Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on
//  an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the
//  specific language governing permissions and limitations under the License.
//

import ios_voice_processor

/// High-level iOS binding for Cheetah speech-to-text engine. It handles recording audio from microphone, processes it
/// in real-time using Cheetah, and notifies the client with transcriptions made from audio.
public class CheetahManager {
    private var onTranscription: ((String) -> Void)?
    private var errorCallback: ((CheetahError) -> Void)?

    private var cheetah: Cheetah?
    private var isListening = false

    /// Private constructor.
    private init(cheetah: Cheetah, onTranscription: ((String) -> Void)?, errorCallback: ((CheetahError) -> Void)?) throws {
        self.onTranscription = onTranscription
        self.errorCallback = errorCallback
        self.cheetah = cheetah
    }

    /// Constructor.
    ///
    /// - Parameters:
    ///   - accessKey: The AccessKey obtained from Picovoice console.
    ///   - modelPath: Absolute path to file containing model parameters.
    ///   - endpointDuration: Duration of endpoint in seconds. A speech endpoint is detected when there is a
    ///         chunk of audio (with a duration specified herein) after an utterance without any speech in it. Default
    ///         is 1 second.
    ///   - onTranscription: It is invoked if a non empty transcription is return from Cheetah.
    ///   - errorCallback: Invoked if an error occurs while processing frames. If missing, error will be printed to console.
    /// - Throws: CheetahError
    public convenience init(
        accessKey: String,
        modelPath: String? = nil,
        endpointDuration: Flaot = 1.0,
        onTranscription: ((Int32) -> Void)?,
        errorCallback: ((Error) -> Void)? = nil) throws {

        try self.init(
                cheetah: Cheetah(accessKey: accessKey, modelPath: modelPath, endpointDuration: endpointDuration),
                onTranscription: onTranscription,
                errorCallback: errorCallback)
    }

    deinit {
        self.delete()
    }

    /// Stops recording and releases Cheetah resources
    public func delete() {
        if isListening {
            stop()
        }

        if self.cheetah != nil {
            self.cheetah!.delete()
            self.cheetah = nil
        }
    }

    ///  Starts recording audio from the microphone and processes frames through Cheetah.
    ///
    /// - Throws: CheetahError if microphone permission is not granted or Cheetah has been disposed.
    public func start() throws {

        guard !isListening else {
            return
        }

        if cheetah == nil {
            throw CheetahInvalidStateError("Cheetah must be initialized before processing")
        }

        // Only check if it's denied, permission will be automatically asked.
        guard try VoiceProcessor.shared.hasPermissions() else {
            throw CheetahRuntimeError("Microphone permissions denied")
        }

        try VoiceProcessor.shared.start(
                frameLength: Cheetah.frameLength,
                sampleRate: Cheetah.sampleRate,
                audioCallback: self.audioCallback
        )

        isListening = true
    }

    /// Stops recording from microphone
    public func stop() {
        guard isListening else {
            return
        }

        VoiceProcessor.shared.stop()

        isListening = false
    }

    /// Callback to run after after voice processor processes frames.
    private func audioCallback(pcm: [Int16]) {
        guard self.cheetah != nil else {
            return
        }

        do{
            var (transcription, endpoint) = try self.cheetah!.process(pcm: pcm)
            if endpoint {
                transcription += try self.cheetah!.flush()
            }
            if transcription.count > 0 {
                DispatchQueue.main.async {
                    self.onTranscription?(transcription)
                }
            }
        } catch {
            if self.errorCallback != nil {
                self.errorCallback!(error)
            } else {
                print("\(error)")
            }
        }
    }
}