/*
    Copyright 2022-2026 Picovoice Inc.

    You may not use this file except in compliance with the license. A copy of the license is
    located in the "LICENSE" file accompanying this source.

    Unless required by applicable law or agreed to in writing, software distributed under the
    License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either
    express or implied. See the License for the specific language governing permissions and
    limitations under the License.
*/


package ai.picovoice.cheetah;

/**
 * Cheetah Speech-to-Text engine Transcript Object.
 */
public class CheetahTranscript {

    private final String transcript;
    private final Word[] wordArray;
    private final boolean isEndpoint;

    /**
     * Constructor.
     *
     * @param transcript String transcript returned from Cheetah
     * @param wordArray  Transcribed words and their associated metadata.
     * @param isEndpoint Whether the transcript has an endpoint
     */
    public CheetahTranscript(String transcript, Word[] wordArray, boolean isEndpoint) {
        this.transcript = transcript;
        this.wordArray = wordArray;
        this.isEndpoint = isEndpoint;
    }

    /**
     * Getter for transcript.
     *
     * @return Transcript string.
     */
    public String getTranscript() {
        return transcript;
    }

    /**
     * Getter for transcribed words and their associated metadata.
     *
     * @return Transcribed words and their associated metadata.
     */
    public Word[] getWordArray() {
        return wordArray;
    }

    /**
     * Getter for isEndpoint.
     *
     * @return Whether the transcript has an endpoint.
     */
    public boolean getIsEndpoint() {
        return isEndpoint;
    }

    /**
     * Cheetah Speech-to-Text engine Word Object.
     */
    public static class Word {
        private final String word;
        private final float confidence;
        private final float startSec;
        private final float endSec;

        /**
         * Constructor.
         *
         * @param word       Transcribed word.
         * @param confidence Transcription confidence. It is a number within [0, 1].
         * @param startSec   Start of word in seconds.
         * @param endSec     End of word in seconds.
         */
        public Word(String word, float confidence, float startSec, float endSec) {
            this.word = word;
            this.confidence = confidence;
            this.startSec = startSec;
            this.endSec = endSec;
        }

        /**
         * Getter for the transcribed word.
         *
         * @return Transcribed word.
         */
        public String getWord() {
            return word;
        }

        /**
         * Getter for the transcription confidence.
         *
         * @return Transcription confidence. It is a number within [0, 1].
         */
        public float getConfidence() {
            return confidence;
        }

        /**
         * Getter for the start of word in seconds.
         *
         * @return Start of word in seconds.
         */
        public float getStartSec() {
            return startSec;
        }

        /**
         * Getter for the end of word in seconds.
         *
         * @return End of word in seconds.
         */
        public float getEndSec() {
            return endSec;
        }
    }
}
