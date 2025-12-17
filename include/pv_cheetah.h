/*
    Copyright 2018-2025 Picovoice Inc.

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
 * @param device String representation of the device (e.g., CPU or GPU) to use. If set to `best`, the most
 * suitable device is selected automatically. If set to `gpu`, the engine uses the first available GPU device. To select a specific
 * GPU device, set this argument to `gpu:${GPU_INDEX}`, where `${GPU_INDEX}` is the index of the target GPU. If set to
 * `cpu`, the engine will run on the CPU with the default number of threads. To specify the number of threads, set this
 * argument to `cpu:${NUM_THREADS}`, where `${NUM_THREADS}` is the desired number of threads.
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
        const char *device,
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

/**
 * Gets a list of hardware devices that can be specified when calling `pv_cheetah_init`
 *
 * @param[out] hardware_devices Array of available hardware devices. Devices are NULL terminated strings.
 *                              The array must be freed using `pv_cheetah_free_hardware_devices`.
 * @param[out] num_hardware_devices The number of devices in the `hardware_devices` array.
 * @return Status code. Returns `PV_STATUS_OUT_OF_MEMORY`, `PV_STATUS_INVALID_ARGUMENT`, `PV_STATUS_INVALID_STATE`,
 * `PV_STATUS_RUNTIME_ERROR`, `PV_STATUS_ACTIVATION_ERROR`, `PV_STATUS_ACTIVATION_LIMIT_REACHED`,
 * `PV_STATUS_ACTIVATION_THROTTLED`, or `PV_STATUS_ACTIVATION_REFUSED` on failure.
 */
PV_API pv_status_t pv_cheetah_list_hardware_devices(
        char ***hardware_devices,
        int32_t *num_hardware_devices);

/**
 * Frees memory allocated by `pv_cheetah_list_hardware_devices`.
 *
 * @param[out] hardware_devices Array of available hardware devices allocated by `pv_cheetah_list_hardware_devices`.
 * @param[out] num_hardware_devices The number of devices in the `hardware_devices` array.
 */
PV_API void pv_cheetah_free_hardware_devices(
        char **hardware_devices,
        int32_t num_hardware_devices);

#ifdef __cplusplus

}

#endif

#endif // PV_CHEETAH_H
