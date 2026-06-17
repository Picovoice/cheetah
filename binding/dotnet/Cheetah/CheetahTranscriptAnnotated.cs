/*
    Copyright 2022-2026 Picovoice Inc.

    You may not use this file except in compliance with the license. A copy of the license is located in the "LICENSE"
    file accompanying this source.

    Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on
    an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the
    specific language governing permissions and limitations under the License.
*/

namespace Pv
{
    public class CheetahWord {
        private string _word;
        private float _startSec;
        private float _endSec;
        private float _confidence;

        /// <summary>
        /// Constructor.
        /// </summary>
        /// <param name="word">
        ///  word Transcribed word.
        /// </param>
        /// <param name="startSec">
        /// startSec Start of word in seconds.
        /// </param>
        /// <param name="endSec">
        /// endSec End of word in seconds.
        /// </param>
        /// <param name="confidence">
        /// confidence Transcription confidence. It is a number in the range [0, 1].
        /// </param>

        public CheetahWord(string word, float startSec, float endSec, float confidence) {
            _word = word;
            _startSec = startSec;
            _endSec = endSec;
            _confidence = confidence;
        }

        /// <summary>
        /// Getter for Word.
        /// </summary>
        /// <returns>Transcribed word.</returns>
        public string Word
        {
            get { return _word; }
            set { _word = value; }
        }

        /// <summary>
        /// Getter for StartSec.
        /// </summary>
        /// <returns>Start of word in seconds.</returns>
        public float StartSec
        {
            get { return _startSec; }
            set { _startSec = value; }
        }

        /// <summary>
        /// Getter for EndSec.
        /// </summary>
        /// <returns>End of word in seconds.</returns>
        public float EndSec
        {
            get { return _endSec; }
            set { _endSec = value; }
        }

        /// <summary>
        /// Getter for Confidence.
        /// </summary>
        /// <returns>Transcription confidence. It is a number in the range [0, 1].</returns>
        public float Confidence
        {
            get { return _confidence; }
            set { _confidence = value; }
        }
    };

    public class CheetahTranscriptAnnotated
    {
        private string _transcript = "";
        private bool _isEndpoint = false;
        private CheetahWord[] _words;

        /// <summary>
        /// Constructor.
        /// </summary>
        /// <param name="transcript">
        /// transcript String transcript returned from Cheetah.
        /// </param>
        /// <param name="isEndpoint">
        /// isEndpoint Whether the transcript has an endpoint.
        /// </param>

        public CheetahTranscriptAnnotated(string transcript, bool isEndpoint, CheetahWord[] words)
        {
            _transcript = transcript;
            _isEndpoint = isEndpoint;
            _words = words;
        }

        /// <summary>
        /// Getter for transcript.
        /// </summary>
        /// <returns>Transcript string</returns>
        public string Transcript
        {
            get { return _transcript; }
            set { _transcript = value; }
        }

        /// <summary>
        /// Getter for isEndpoint.
        /// </summary>
        /// <returns>Whether the transcript has an endpoint.</returns>
        public bool IsEndpoint
        {
            get { return _isEndpoint; }
            set { _isEndpoint = value; }
        }

        /// <summary>
        /// Getter for Words.
        /// </summary>
        /// <returns>The list of transcribed words with their associated metadata.</returns>
        public CheetahWord[] Words
        {
            get { return _words; }
            set { _words = value; }
        }
    }
}