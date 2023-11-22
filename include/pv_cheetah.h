/*
    Copyright 2018-2022 Picovoice Inc.

    You may not use this file except in compliance with the license. A copy of the license is located in the "LICENSE"
    file accompanying this source.

    Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on
    an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the
    specific language governing permissions and limitations under the License.
*/

#ifndef PV_CHEETAH_H
#define PV_CHEETAH_H

#include <stdbool.h>
#include <stdint.h>

#include "picovoice.h"

#ifdef __cplusplus

extern "C" {

#endif

/**
 * Forward declaration for Cheetah speech-to-text engine. It transcribes speech within an incoming stream of audio in
 * real-time. Cheetah processes incoming audio in consecutive frames and for each frame emits partial transcription
 * results as they become available. The number of samples per frame can be attained by calling
 * `pv_cheetah_frame_length()`. The incoming audio needs to have a sample rate equal to `pv_sample_rate()` and be 16-bit
 * linearly-encoded. Cheetah operates on single-channel audio.
 */
typedef struct pv_cheetah pv_cheetah_t;

/**
 * Constructor.
 *
 * @param access_key AccessKey obtained from Picovoice Console (https://picovoice.ai/console/)
 * @param model_path Absolute path to the file containing model parameters.
 * @param endpoint_duration_sec Duration of endpoint in seconds. A speech endpoint is detected when there is a segment
 * of audio (with a duration specified herein) after an utterance without any speech in it. Set to `0` to disable
 * endpoint detection.
 * @param enable_automatic_punctuation Set to `true` to enable automatic punctuation insertion.
 * @param[out] object Constructed instance of Cheetah.
 * @return Status code. Returns `PV_STATUS_INVALID_ARGUMENT`, `PV_STATUS_IO_ERROR`, `PV_STATUS_OUT_OF_MEMORY`,
 * `PV_STATUS_RUNTIME_ERROR`, `PV_STATUS_ACTIVATION_ERROR`, `PV_STATUS_ACTIVATION_LIMIT_REACHED`,
 * `PV_STATUS_ACTIVATION_THROTTLED`, or `PV_STATUS_ACTIVATION_REFUSED` on failure
 */
PV_API pv_status_t pv_cheetah_init(
        const char *access_key,
        const char *model_path,
        float endpoint_duration_sec,
        bool enable_automatic_punctuation,
        pv_cheetah_t **object);

/**
 * Destructor.
 *
 * @param object Cheetah object.
 */
PV_API void pv_cheetah_delete(pv_cheetah_t *object);

/**
 * Processes a frame of audio and returns newly-transcribed text and a flag indicating if an endpoint has been detected.
 * Upon detection of an endpoint, the client may invoke `pv_cheetah_flush()` to retrieve any remaining transcription.
 * The caller is responsible for freeing the transcription buffer.
 *
 * @param object Cheetah object.
 * @param pcm A frame of audio samples. The number of samples per frame can be attained by calling
 * `pv_cheetah_frame_length()`. The incoming audio needs to have a sample rate equal to `pv_sample_rate()` and be 16-bit
 * linearly-encoded. Cheetah operates on single-channel audio.
 * @param[out] transcript Any newly-transcribed speech. If none is available then an empty string is returned.
 * @param[out] is_endpoint Flag indicating if an endpoint has been detected. If endpointing is disabled then set to
 * `NULL`.
 * @return Status code. Returns `PV_STATUS_INVALID_ARGUMENT` or `PV_STATUS_OUT_OF_MEMORY`,
 * `PV_STATUS_RUNTIME_ERROR`, `PV_STATUS_ACTIVATION_ERROR`, `PV_STATUS_ACTIVATION_LIMIT_REACHED`,
 * `PV_STATUS_ACTIVATION_THROTTLED`, or `PV_STATUS_ACTIVATION_REFUSED` on failure
 */
PV_API pv_status_t pv_cheetah_process(pv_cheetah_t *object, const int16_t *pcm, char **transcript, bool *is_endpoint);

/**
 * Marks the end of the audio stream, flushes internal state of the object, and returns any remaining transcript. The
 * caller is responsible for freeing the transcription buffer.
 *
 * @param object Cheetah object.
 * @param[out] transcript Any remaining transcribed text. If none is available then an empty string is returned.
 * @return Status code. Returns `PV_STATUS_INVALID_ARGUMENT` or `PV_STATUS_OUT_OF_MEMORY`,
 * `PV_STATUS_RUNTIME_ERROR`, `PV_STATUS_ACTIVATION_ERROR`, `PV_STATUS_ACTIVATION_LIMIT_REACHED`,
 * `PV_STATUS_ACTIVATION_THROTTLED`, or `PV_STATUS_ACTIVATION_REFUSED` on failure
 */
PV_API pv_status_t pv_cheetah_flush(pv_cheetah_t *object, char **transcript);

/**
 * Deletes transcript returned from `pv_cheetah_process()` or `pv_cheetah_flush()`
 *
 * @param transcript transcription string returned from `pv_cheetah_process()` or `pv_cheetah_flush()`
 */
PV_API void pv_cheetah_transcript_delete(char *transcript);

/**
 * Getter for version.
 *
 * @return Version.
 */
PV_API const char *pv_cheetah_version(void);

/**
 * Getter for number of audio samples per frame.
 *
 * @return Frame length.
 */
PV_API int32_t pv_cheetah_frame_length(void);

#ifdef __cplusplus
}

#endif

#endif // PV_CHEETAH_H
