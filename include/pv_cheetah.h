#ifndef PV_CHEETAH_H
#define PV_CHEETAH_H

#include <stdint.h>

#include "picovoice.h"

#ifdef __cplusplus
extern "C"
{
#endif

/**
 * Forward declaration for Speech to Text object (a.k.a Cheetah). The object transcribes speech within audio data. It
 * processes incoming audio in consecutive frames (chunks). The number of samples per frame can be attained by calling
 * 'pv_cheetah_frame_length()'. The incoming audio needs to have a sample rate equal to 'pv_sample_rate()' and be 16-bit
 * linearly-encoded. Furthermore, Cheetah operates on single channel audio.
 */
typedef struct pv_cheetah_object pv_cheetah_object_t;

/**
 * Constructor.
 *
 * @param acoustic_model_file_path Absolute path to file containing acoustic model parameters.
 * @param language_model_file_path Absolute path to file containing language model parameters.
 * @param license_file_path Absolute path to license file.
 * @param[out] object Constructed Speech to Text object.
 * @return Status code. Returns 'PV_STATUS_INVALID_ARGUMENT', 'PV_STATUS_OUT_OF_MEMORY', or 'PV_STATUS_IO_ERROR' on
 * failure.
 */
PV_API pv_status_t pv_cheetah_init(
        const char *acoustic_model_file_path,
        const char *language_model_file_path,
        const char *license_file_path,
        pv_cheetah_object_t **object);

/**
 * Destructor.
 *
 * @param object Speech to Text object.
 */
PV_API void pv_cheetah_delete(pv_cheetah_object_t *object);

/**
 * Processes a frame of audio.
 *
 * @param object Speech to Text object.
 * @param pcm A frame of audio samples. The number of samples per frame can be attained by calling
 * 'pv_cheetah_frame_length()'. The incoming audio needs to have a sample rate equal to 'pv_sample_rate()' and be 16-bit
 * linearly-encoded. Furthermore, cheetah operates on single channel audio.
 * @return Status code. Returns 'PV_STATUS_INVALID_ARGUMENT' or 'PV_STATUS_OUT_OF_MEMORY' on failure.
 */
PV_API pv_status_t pv_cheetah_process(pv_cheetah_object_t *object, const int16_t *pcm);

/**
 * Marks the end of audio stream, flushes internal state of object, and returns transcribed text. The callee is
 * responsible for freeing the transcription buffer.
 *
 * @param object Speech to Text object.
 * @param[out] transcription transcribed text.
 * @return Status code. Returns 'PV_STATUS_INVALID_ARGUMENT' or 'PV_STATUS_OUT_OF_MEMORY' on failure.
 */
PV_API pv_status_t pv_cheetah_transcribe(pv_cheetah_object_t *object, char **transcription);

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
PV_API int pv_cheetah_frame_length(void);

#ifdef __cplusplus
}
#endif

#endif // PV_CHEETAH_H
