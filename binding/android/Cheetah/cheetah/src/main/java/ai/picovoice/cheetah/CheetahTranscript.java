/*
    Copyright 2022-2023 Picovoice Inc.

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
    private final boolean isEndpoint;

    /**
     * Constructor.
     *
     * @param transcript String transcript returned from Cheetah
     * @param isEndpoint Whether the transcript has an endpoint
     */
    public CheetahTranscript(String transcript, boolean isEndpoint) {
        this.transcript = transcript;
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
     * Getter for isEndpoint.
     *
     * @return Whether the transcript has an endpoint.
     */
    public boolean getIsEndpoint() {
        return isEndpoint;
    }
}
