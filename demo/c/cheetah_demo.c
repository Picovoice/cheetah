#include <dlfcn.h>
#include <stdio.h>
#include <stdlib.h>

#include "pv_cheetah.h"

int main(int argc, char **argv) {
    if (argc < 6) {
        fprintf(
                stderr,
                "usage: %s dynamic_library_path acoustic_model_path language_model_path license_path "
                "audio_file_1 audio_file_2 ...\n",
                argv[0]);
        exit(1);
    }

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

    const char *acoustic_model_path = argv[2];
    const char *language_model_path = argv[3];
    const char *license_path = argv[4];

    pv_cheetah_object_t *cheetah;
    pv_status_t status = pv_cheetah_init(acoustic_model_path, language_model_path, license_path, -1, &cheetah);
    if (status != PV_STATUS_SUCCESS) {
        fprintf(stderr, "failed to init with '%s'.\n", pv_status_to_string(status));
        exit(1);
    }

    const size_t frame_length = (size_t) pv_cheetah_frame_length();

    int16_t *pcm = malloc(sizeof(int16_t) * frame_length);
    if (!pcm) {
        fprintf(stderr, "failed to allocate memory for audio buffer.\n");
        exit(1);
    }

    for (int i = 5; i < argc; i++) {
        const char *wav_path = argv[i];
        FILE *wav_handle = fopen(wav_path, "rb");
        if (!wav_handle) {
            fprintf(stderr, "failed to open wav file located at '%s'.\n", wav_path);
            exit(1);
        }

        static const int WAV_HEADER_LENGTH_BYTE = 44;

        if (fseek(wav_handle, WAV_HEADER_LENGTH_BYTE, SEEK_SET) != 0) {
            fprintf(stderr, "failed to skip the wav header.\n");
            exit(1);
        }

        while (fread(pcm, sizeof(int16_t), frame_length, wav_handle) == frame_length) {
            char *partial_transcript;
            status = pv_cheetah_process(cheetah, pcm, &partial_transcript, NULL);
            if (status != PV_STATUS_SUCCESS) {
                fprintf(stderr, "failed to process with '%s'.\n", pv_status_to_string(status));
                exit(1);
            }

            fprintf(stdout, "%s", partial_transcript);
            fflush(stdout);

            free(partial_transcript);
        }

        char *final_transcript;
        status = pv_cheetah_flush(cheetah, &final_transcript);
        if (status != PV_STATUS_SUCCESS) {
            fprintf(stderr, "failed to flush with '%s'.\n", pv_status_to_string(status));
            exit(1);
        }

        fprintf(stdout, "%s\n", final_transcript);
        fflush(stdout);

        free(final_transcript);
    }

    pv_cheetah_delete(cheetah);
    free(pcm);

    return 0;
}
