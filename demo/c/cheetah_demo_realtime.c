#include <alsa/asoundlib.h>
#include <dlfcn.h>
#include <signal.h>
#include <stdio.h>

#include "pv_cheetah.h"

static volatile bool is_interrupted = false;

void interrupt_handler(int _) {
    (void) _;
    is_interrupted = true;
}

int main(int argc, char *argv[]) {
    if (argc != 6) {
        fprintf(
                stderr,
                "usage: %s dynamic_library_path audio_input_device_name acoustic_model_path language_model_path license_path\n",
                argv[0]);
        exit(1);
    }

    signal(SIGINT, interrupt_handler);

    const char *library_path = argv[1];

    void *dl_handle = dlopen(library_path, RTLD_NOW);
    if (!dl_handle) {
        fprintf(stderr, "failed to load dynamic library at '%s'.\n", library_path);
        exit(1);
    }

    char *error;

    const char *(*pv_status_to_string)(pv_status_t) = dlsym(dl_handle, "pv_status_to_string");
    if ((error = dlerror()) != NULL) {
        fprintf(stderr, "failed to load 'pv_status_to_string' with '%s'.\n", error);
        exit(1);
    }

    int32_t (*pv_sample_rate)() = dlsym(dl_handle, "pv_sample_rate");
    if ((error = dlerror()) != NULL) {
        fprintf(stderr, "failed to load 'pv_sample_rate' with '%s'.\n", error);
        exit(1);
    }

    pv_status_t (*pv_cheetah_init)(const char *, const char *, const char *, int32_t, pv_cheetah_object_t **) =
    dlsym(dl_handle, "pv_cheetah_init");
    if ((error = dlerror()) != NULL) {
        fprintf(stderr, "failed to load 'pv_cheetah_init' with '%s'.\n", error);
        exit(1);
    }

    void (*pv_cheetah_delete)(pv_cheetah_object_t *) = dlsym(dl_handle, "pv_cheetah_delete");
    if ((error = dlerror()) != NULL) {
        fprintf(stderr, "failed to load 'pv_cheetah_delete' with '%s'.\n", error);
        exit(1);
    }

    pv_status_t (*pv_cheetah_process)(pv_cheetah_object_t *, const int16_t *, char **, bool *) =
    dlsym(dl_handle, "pv_cheetah_process");
    if ((error = dlerror()) != NULL) {
        fprintf(stderr, "failed to load 'pv_cheetah_process' with '%s'.\n", error);
        exit(1);
    }

    pv_status_t (*pv_cheetah_flush)(pv_cheetah_object_t *, char **) = dlsym(dl_handle, "pv_cheetah_flush");
    if ((error = dlerror()) != NULL) {
        fprintf(stderr, "failed to load 'pv_cheetah_flush' with '%s'.\n", error);
        exit(1);
    }

    int32_t (*pv_cheetah_frame_length)() = dlsym(dl_handle, "pv_cheetah_frame_length");
    if ((error = dlerror()) != NULL) {
        fprintf(stderr, "failed to load 'pv_cheetah_frame_length' with '%s'.\n", error);
        exit(1);
    }

    const char *audio_input_device_name = argv[2];

    snd_pcm_t *alsa_handle;
    int error_code = snd_pcm_open(&alsa_handle, audio_input_device_name, SND_PCM_STREAM_CAPTURE, 0);
    if (error_code != 0) {
        fprintf(stderr, "'snd_pcm_open' failed with '%s'\n", snd_strerror(error_code));
        exit(1);
    }

    snd_pcm_hw_params_t *hardware_params;
    error_code = snd_pcm_hw_params_malloc(&hardware_params);
    if (error_code != 0) {
        fprintf(stderr, "'snd_pcm_hw_params_malloc' failed with '%s'\n", snd_strerror(error_code));
        exit(1);
    }

    error_code = snd_pcm_hw_params_any(alsa_handle, hardware_params);
    if (error_code != 0) {
        fprintf(stderr, "'snd_pcm_hw_params_any' failed with '%s'\n", snd_strerror(error_code));
        exit(1);
    }

    error_code = snd_pcm_hw_params_set_access(alsa_handle, hardware_params, SND_PCM_ACCESS_RW_INTERLEAVED);
    if (error_code != 0) {
        fprintf(stderr, "'snd_pcm_hw_params_set_access' failed with '%s'\n", snd_strerror(error_code));
        exit(1);
    }

    error_code = snd_pcm_hw_params_set_format(alsa_handle, hardware_params, SND_PCM_FORMAT_S16_LE);
    if (error_code != 0) {
        fprintf(stderr, "'snd_pcm_hw_params_set_format' failed with '%s'\n", snd_strerror(error_code));
        exit(1);
    }

    error_code = snd_pcm_hw_params_set_rate(alsa_handle, hardware_params, pv_sample_rate(), 0);
    if (error_code != 0) {
        fprintf(stderr, "'snd_pcm_hw_params_set_rate' failed with '%s'\n", snd_strerror(error_code));
        exit(1);
    }

    error_code = snd_pcm_hw_params_set_channels(alsa_handle, hardware_params, 1);
    if (error_code != 0) {
        fprintf(stderr, "'snd_pcm_hw_params_set_channels' failed with '%s'\n", snd_strerror(error_code));
        exit(1);
    }

    error_code = snd_pcm_hw_params(alsa_handle, hardware_params);
    if (error_code != 0) {
        fprintf(stderr, "'snd_pcm_hw_params' failed with '%s'\n", snd_strerror(error_code));
        exit(1);
    }

    snd_pcm_hw_params_free(hardware_params);

    error_code = snd_pcm_prepare(alsa_handle);
    if (error_code != 0) {
        fprintf(stderr, "'snd_pcm_prepare' failed with '%s'\n", snd_strerror(error_code));
        exit(1);
    }

    const char *acoustic_model_path = argv[3];
    const char *language_model_path = argv[4];
    const char *license_path = argv[5];

    pv_cheetah_object_t *cheetah;
    pv_status_t status = pv_cheetah_init(acoustic_model_path, language_model_path, license_path, 1, &cheetah);
    if (status != PV_STATUS_SUCCESS) {
        fprintf(stderr, "failed to init with '%s'.\n", pv_status_to_string(status));
        exit(1);
    }

    int16_t *pcm = malloc(pv_cheetah_frame_length() * sizeof(int16_t));
    if (!pcm) {
        fprintf(stderr, "failed to allocate memory for audio buffer\n");
        exit(1);
    }

    while (!is_interrupted) {
        const int count = snd_pcm_readi(alsa_handle, pcm, pv_cheetah_frame_length());
        if (count < 0) {
            fprintf(stderr, "'snd_pcm_readi' failed with '%s'\n", snd_strerror(count));
            exit(1);
        } else if (count != pv_cheetah_frame_length()) {
            fprintf(stderr, "read %d frames instead of %d\n", count, pv_cheetah_frame_length());
            exit(1);
        }

        char *partial_transcript;
        bool is_endpoint;
        status = pv_cheetah_process(cheetah, pcm, &partial_transcript, &is_endpoint);
        if (status != PV_STATUS_SUCCESS) {
            fprintf(stderr, "failed to process with '%s'.\n", pv_status_to_string(status));
            exit(1);
        }

        fprintf(stdout, "%s", partial_transcript);
        fflush(stdout);

        free(partial_transcript);

        if (is_endpoint) {
            char *final_transcript;
            status = pv_cheetah_flush(cheetah, &final_transcript);
            if (status != PV_STATUS_SUCCESS) {
                fprintf(stdout, "failed to flush with '%s'.\n", pv_status_to_string(status));
                exit(1);
            }

            fprintf(stdout, "%s\n", final_transcript);

            free(final_transcript);
        }
    }

    pv_cheetah_delete(cheetah);
    free(pcm);

    return 0;
}
