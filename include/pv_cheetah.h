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
 * Forward declaration for speech-to-text object (a.k.a Cheetah). The object transcribes speech within audio data. It
 * processes incoming audio in consecutive frames (chunks). The number of samples per frame can be attained by calling
 * 'pv_cheetah_frame_length()'. The incoming audio needs to have a sample rate equal to 'pv_sample_rate()' and be 16-bit
 * linearly-encoded. Furthermore, Cheetah operates on single-channel audio.
 */
typedef struct pv_cheetah_object pv_cheetah_object_t;

/**
 * Constructor.
 *
 * @param acoustic_model_path Absolute path to file containing acoustic model parameters.
 * @param language_model_path Absolute path to file containing language model parameters.
 * @param license_path Absolute path to license file.
 * @param endpoint_duration_sec Duration of endpoint in seconds. A speech endpoint is detected when there is a chunk of
 * audio (with a duration specified herein) after an utterance without any speech in it. Set to '-1' to disable endpoint
 * detection.
 * @param[out] object Constructed speech-to-text object.
 * @return Status code. Returns 'PV_STATUS_INVALID_ARGUMENT', 'PV_STATUS_IO_ERROR', or 'PV_STATUS_OUT_OF_MEMORY' on
 * failure.
 */
PV_API pv_status_t pv_cheetah_init(
        const char *acoustic_model_path,
        const char *language_model_path,
        const char *license_path,
        int32_t endpoint_duration_sec,
        pv_cheetah_object_t **object);

/**
 * Destructor.
 *
 * @param object speech-to-text object.
 */
PV_API void pv_cheetah_delete(pv_cheetah_object_t *object);

/**
 * Processes a frame of audio and returns newly-transcribed text (if any) and a flag indicating if an endpoint has been
 * detected. Upon detection of an endpoint, the client should invoke 'pv_cheetah_flush()' to retrieve any remaining
 * transcription. The caller is responsible for freeing the transcription buffer.
 *
 * @param object speech-to-text object.
 * @param pcm A frame of audio samples. The number of samples per frame can be attained by calling
 * 'pv_cheetah_frame_length()'. The incoming audio needs to have a sample rate equal to 'pv_sample_rate()' and be 16-bit
 * linearly-encoded. Furthermore, cheetah operates on single-channel audio.
 * @param[out] partial_transcript Any newly-transcribed speech. If none is available then an empty string is returned.
 * @param[out] is_endpoint Flag indicating if an endpoint has been detected.
 * @return Status code. Returns 'PV_STATUS_INVALID_ARGUMENT', 'PV_STATUS_INVALID_STATE', or 'PV_STATUS_OUT_OF_MEMORY'
 * on failure.
 */
PV_API pv_status_t pv_cheetah_process(
        pv_cheetah_object_t *object,
        const int16_t *pcm,
        char **partial_transcript,
        bool *is_endpoint);

/**
 * Marks the end of the audio stream, flushes internal state of the object, and returns any remaining transcribed text.
 * The caller is responsible for freeing the transcription buffer.
 *
 * @param object speech-to-text object.
 * @param[out] final_transcript Any remaining transcribed text. If none is available then an empty string is returned.
 * @return Status code. Returns 'PV_STATUS_INVALID_ARGUMENT', 'PV_STATUS_INVALID_STATE', or 'PV_STATUS_OUT_OF_MEMORY'
 * on failure.
 */
PV_API pv_status_t pv_cheetah_flush(pv_cheetah_object_t *object, char **final_transcript);

/**
 * Getter for version string.
 *
 * @return Version.
 */
PV_API const char *pv_cheetah_version(void);

/**
 * Getter for length (number of audio samples) per frame.
 *
 * @return frame length.
 */
PV_API int32_t pv_cheetah_frame_length(void);

#ifdef __cplusplus

}

#endif

#endif // PV_CHEETAH_H
