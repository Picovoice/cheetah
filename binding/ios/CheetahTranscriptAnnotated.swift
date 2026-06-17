//
//  Copyright 2022-2026 Picovoice Inc.
//  You may not use this file except in compliance with the license. A copy of the license is located in the "LICENSE"
//  file accompanying this source.
//  Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on
//  an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the
//  specific language governing permissions and limitations under the License.
//

public struct CheetahWord {
    public let word: String
    public let startSec: Float
    public let endSec: Float
    public let confidence: Float

    init(word: String, startSec: Float, endSec: Float, confidence: Float) {
        self.word = word
        self.startSec = startSec
        self.endSec = endSec
        self.confidence = confidence
    }
}

public struct CheetahTranscriptAnnotated {
    public let transcript: String
    public let isEndpoint: Bool
    public let words: [CheetahWord]

    public init(transcript: String, isEndpoint: Bool, words: [CheetahWord]) {
        self.transcript = transcript
        self.isEndpoint = isEndpoint
        self.words = words
    }
}
