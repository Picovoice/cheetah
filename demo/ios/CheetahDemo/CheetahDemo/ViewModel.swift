//
//  Copyright 2022-2023 Picovoice Inc.
//  You may not use this file except in compliance with the license. A copy of the license is located in the "LICENSE"
//  file accompanying this source.
//  Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on
//  an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the
//  specific language governing permissions and limitations under the License.
//

import AVFoundation
import Foundation

import Cheetah
import ios_voice_processor

enum UIState {
    case INIT
    case READY
    case RECORDING
    case FINALIZED
    case ERROR
}

class ViewModel: ObservableObject {
    private let ACCESS_KEY = "${YOUR_ACCESS_KEY_HERE}" // Obtained from Picovoice Console (https://console.picovoice.ai)

    private var cheetah: Cheetah!

    private var isListening = false
    private var autoScroll = true

    @Published var errorMessage = ""
    @Published var state = UIState.INIT
    @Published var result: String = ""

    init() {
        initialize()
    }

    public func initialize() {
        state = UIState.INIT
        do {
            let modelPath = Bundle(for: type(of: self)).path(forResource: "cheetah_params", ofType: "pv")!
            try cheetah = Cheetah(
                    accessKey: ACCESS_KEY,
                    modelPath: modelPath,
                    enableAutomaticPunctuation: true)

            VoiceProcessor.instance.addFrameListener(VoiceProcessorFrameListener(audioCallback))
            VoiceProcessor.instance.addErrorListener(VoiceProcessorErrorListener(errorCallback))

            state = UIState.READY
        } catch let error as CheetahInvalidArgumentError {
            errorMessage = "\(error.localizedDescription)"
        } catch is CheetahActivationError {
            errorMessage = "ACCESS_KEY activation error"
        } catch is CheetahActivationRefusedError {
            errorMessage = "ACCESS_KEY activation refused"
        } catch is CheetahActivationLimitError {
            errorMessage = "ACCESS_KEY reached its limit"
        } catch is CheetahActivationThrottledError {
            errorMessage = "ACCESS_KEY is throttled"
        } catch {
            errorMessage = "\(error)"
        }
    }

    public func destroy() {
        if isListening {
            toggleRecordingOff()
        }
        cheetah.delete()
    }

    public func toggleRecording() {
        if isListening {
            toggleRecordingOff()
        } else {
            toggleRecordingOn()
        }
    }

    public func toggleRecordingOff() {
        do {
            try VoiceProcessor.instance.stop()
            state = UIState.FINALIZED
            isListening = false
        } catch {
            errorMessage = "\(error.localizedDescription)"
        }
    }

    public func toggleRecordingOn() {
        do {
            guard VoiceProcessor.hasRecordAudioPermission else {
                VoiceProcessor.requestRecordAudioPermission { isGranted in
                    guard isGranted else {
                        DispatchQueue.main.async {
                            self.errorMessage = "Demo requires microphone permission"
                        }
                        return
                    }

                    DispatchQueue.main.async {
                        self.toggleRecordingOn()
                    }
                }
                return
            }

            try VoiceProcessor.instance.start(
                    frameLength: Cheetah.frameLength,
                    sampleRate: Cheetah.sampleRate
            )

            result = ""
            state = UIState.RECORDING
            isListening = true
        } catch {
            errorMessage = "\(error.localizedDescription)"
        }
    }

    public func shouldAutoScroll() -> Bool {
        autoScroll
    }

    public func setAutoScroll(_ value: Bool) {
        autoScroll = value
    }

    private func audioCallback(frame: [Int16]) {
        guard let cheetah = self.cheetah else {
            return
        }

        do {
            var (transcription, endpoint) = try cheetah.process(frame)
            if endpoint {
                transcription += "\(try cheetah.flush()) "
            }
            if transcription.count > 0 {
                DispatchQueue.main.async {
                    self.result += transcription
                }
            }
        } catch {
            DispatchQueue.main.async {
                self.errorMessage = "\(error)"
            }
        }
    }

    private func errorCallback(error: VoiceProcessorError) {
        DispatchQueue.main.async {
            self.errorMessage = "\(error)"
        }
    }
}
