/*
  Copyright 2022 Picovoice Inc.
  You may not use this file except in compliance with the license. A copy of the license is located in the "LICENSE"
  file accompanying this source.
  Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on
  an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the
  specific language governing permissions and limitations under the License.
*/

export type CheetahTranscript = {
  /** Any newly-transcribed speech. If none is available then an empty string is returned. */
  transcript: string;
  /** Flag indicating if an endpoint has been detected. */
  isEndpoint?: boolean;
};

export type CheetahOptions = {
  /** Duration of endpoint in seconds. A speech endpoint is detected when there is a segment
   * of audio (with a duration specified herein) after an utterance without any speech in it. Set to `0` to disable
   * endpoint detection.*/
  endpointDuration?: number;
  /** Set to `true` to enable automatic punctuation insertion. */
  enableAutomaticPunctuation?: boolean;
};
