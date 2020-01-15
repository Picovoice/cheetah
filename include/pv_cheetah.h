/*
    Copyright 2018 Picovoice Inc.

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

extern "C"
{

#endif

/**
 * Forward declaration for streaming Speech-to-Text class (Cheetah). It transcribes speech within audio data stream in
 * real-time. It processes incoming audio in consecutive frames and emits partial transcription results as they become
 * available. The number of samples per frame can be attained by calling 'pv_cheetah_frame_length()'. The incoming audio
 * needs to have a sample rate equal to 'pv_sample_rate()' and be 16-bit linearly-encoded. Cheetah operates on
 * single-channel audio.
 */
typedef struct pv_cheetah pv_cheetah_t;

/**
 * Constructor.
 *
 * @param acoustic_model_path Absolute path to file containing acoustic model parameters.
 * @param language_model_path Absolute path to file containing language model parameters.
 * @param license_path Absolute path to a license file.
 * @param endpoint_duration_sec Duration of endpoint in seconds. A speech endpoint is detected when there is a segment
 * of audio (with a duration specified herein) after an utterance without any speech in it. Set to '-1' to disable
 * endpoint detection.
 * @param[out] object Constructed Speech-to-Text object.
 * @return Status code. Returns 'PV_STATUS_INVALID_ARGUMENT', 'PV_STATUS_IO_ERROR', or 'PV_STATUS_OUT_OF_MEMORY' on
 * failure.
 */
PV_API pv_status_t pv_cheetah_init(
        const char *acoustic_model_path,
        const char *language_model_path,
        const char *license_path,
        int32_t endpoint_duration_sec,
        pv_cheetah_t **object);

/**
 * Destructor.
 *
 * @param object Speech-to-Text object.
 */
PV_API void pv_cheetah_delete(pv_cheetah_t *object);

/**
 * Processes a frame of audio and returns any newly-transcribed text and a flag indicating if an endpoint has been
 * detected. Upon detection of an endpoint, the client may invoke 'pv_cheetah_flush()' to retrieve any remaining
 * transcription. The caller is responsible for freeing the transcription buffer.
 *
 * @param object Speech-to-Text object.
 * @param pcm A frame of audio samples. The number of samples per frame can be attained by calling
 * 'pv_cheetah_frame_length()'. The incoming audio needs to have a sample rate equal to 'pv_sample_rate()' and be 16-bit
 * linearly-encoded. Cheetah operates on single-channel audio.
 * @param[out] partial_transcript Any newly-transcribed speech. If none is available then an empty string is returned.
 * @param[out] is_endpoint Flag indicating if an endpoint has been detected. If endpointing is disabled then set to NULL.
 * @return Status code. Returns 'PV_STATUS_INVALID_ARGUMENT', 'PV_STATUS_INVALID_STATE', or 'PV_STATUS_OUT_OF_MEMORY'
 * on failure.
 */
PV_API pv_status_t pv_cheetah_process(
        pv_cheetah_t *object,
        const int16_t *pcm,
        char **partial_transcript,
        bool *is_endpoint);

/**
 * Marks the end of the audio stream, flushes internal state of the object, and returns any remaining transcribed text.
 * The caller is responsible for freeing the transcription buffer.
 *
 * @param object Speech-to-Text object.
 * @param[out] remaining_transcript Any remaining transcribed text. If none is available then an empty string is returned.
 * @return Status code. Returns 'PV_STATUS_INVALID_ARGUMENT', 'PV_STATUS_INVALID_STATE', or 'PV_STATUS_OUT_OF_MEMORY'
 * on failure.
 */
PV_API pv_status_t pv_cheetah_flush(pv_cheetah_t *object, char **remaining_transcript);

/**
 * Getter for version.
 *
 * @return Version.
 */
PV_API const char *pv_cheetah_version(void);

/**
 * Getter for number of audio samples per frame.
 *
 * @return frame length.
 */
PV_API int32_t pv_cheetah_frame_length(void);

#ifdef __cplusplus

}

#endif

#endif // PV_CHEETAH_H
