/*
    Copyright 2022-2023 Picovoice Inc.

    You may not use this file except in compliance with the license. A copy of the license is located in the "LICENSE"
    file accompanying this source.

    Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on
    an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the
    specific language governing permissions and limitations under the License.
*/

namespace Pv
{
    public class CheetahTranscript
    {
        private string _transcript = "";
        private bool _isEndpoint = false;

        /// <summary>
        /// Constructor.
        /// </summary>
        /// <param name="transcript">
        ///  transcript String transcript returned from Cheetah.
        /// </param>
        /// <param name="isEndpoint">
        /// isEndpoint Whether the transcript has an endpoint.
        /// </param>
        /// <returns>transcript string</returns>

        public CheetahTranscript(string transcript, bool isEndpoint)
        {
            _transcript = transcript;
            _isEndpoint = isEndpoint;
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

    }
}