#include <dlfcn.h>
#include <stdio.h>
#include <stdlib.h>

#include "pv_cheetah.h"

static const char *pv_status_to_string(pv_status_t status) {
    static const char *const strings[] = {
            "SUCCESS",
            "OUT_OF_MEMORY",
            "IO_ERROR",
            "INVALID_ARGUMENT",
            "PV_STATUS_STOP_ITERATION",
            "PV_STATUS_KEY_ERROR",
    };

    return strings[status];
}

int main(int argc, char **argv) {
    if (argc < 6) {
        printf(
                "[ERROR] usage: cheetah_demo library_path acoustic_model_path language_model_path license_path "
                "audio_file_1 audio_file_2 ...\n");
        exit(1);
    }

    const char *library_path = argv[1];

    void *handle = dlopen(library_path, RTLD_NOW);
    if (!handle) {
        printf("[ERROR] Failed to load Cheetah's library at '%s'.\n", library_path);
        exit(1);
    }

    char *error;

    pv_status_t (*pv_cheetah_init)(const char*, const char*, const char*, pv_cheetah_object_t**);
    pv_cheetah_init = dlsym(handle, "pv_cheetah_init");
    if ((error = dlerror()) != NULL) {
        printf("[ERROR] Failed to load init symbol with '%s'.\n", error);
        exit(1);
    }

    void (*pv_cheetah_delete)(pv_cheetah_object_t*);
    pv_cheetah_delete = dlsym(handle, "pv_cheetah_delete");
    if ((error = dlerror()) != NULL) {
        printf("[ERROR] Failed to load delete symbol with '%s'.\n", error);
        exit(1);
    }

    pv_status_t (*pv_cheetah_process)(pv_cheetah_object_t*, const int16_t*);
    pv_cheetah_process = dlsym(handle, "pv_cheetah_process");
    if ((error = dlerror()) != NULL) {
        printf("[ERROR] Failed to load process symbol with '%s'.\n", error);
        exit(1);
    }

    pv_status_t (*pv_cheetah_transcribe)(pv_cheetah_object_t*, char**);
    pv_cheetah_transcribe = dlsym(handle, "pv_cheetah_transcribe");
    if ((error = dlerror()) != NULL) {
        printf("[ERROR] Failed to load transcribe symbol with '%s'.\n", error);
        exit(1);
    }

    pv_status_t (*pv_cheetah_frame_length)();
    pv_cheetah_frame_length = dlsym(handle, "pv_cheetah_frame_length");
    if ((error = dlerror()) != NULL) {
        printf("[ERROR] Failed to load frame length symbol with '%s'.\n", error);
        exit(1);
    }

    const char *acoustic_model_path = argv[2];
    const char *language_model_path = argv[3];
    const char *license_path = argv[4];

    pv_cheetah_object_t *cheetah;
    pv_status_t status = pv_cheetah_init(acoustic_model_path, language_model_path, license_path, &cheetah);
    if (status != PV_STATUS_SUCCESS) {
        printf("[ERROR] Failed to init with '%s'.", pv_status_to_string(status));
        exit(1);
    }

    const size_t frame_length = (size_t) pv_cheetah_frame_length();

    int16_t *pcm = malloc(sizeof(int16_t) * frame_length);
    if (!pcm) {
        printf("[ERROR] Failed to allocate memory for audio buffer.\n");
        exit(1);
    }

    for (int i = 5; i < argc; i++) {
        const char *wav_path = argv[i];
        FILE *wav = fopen(wav_path, "rb");
        if (!wav) {
            printf("[ERROR] Failed to open wav file located at '%s'.\n", wav_path);
            exit(1);
        }

        static const int WAV_HEADER_SIZE_BYTES = 44;

        if (fseek(wav, WAV_HEADER_SIZE_BYTES, SEEK_SET) != 0) {
            printf("[ERROR] Failed to skip the wav header.\n");
            exit(1);
        }

        while(fread(pcm, sizeof(int16_t), frame_length, wav) == frame_length) {
            status = pv_cheetah_process(cheetah, pcm);
            if (status != PV_STATUS_SUCCESS) {
                printf("[ERROR] Failed to process audio.\n");
                exit(1);
            }
        }

        char *transcript;
        status = pv_cheetah_transcribe(cheetah, &transcript);
        if (status != PV_STATUS_SUCCESS) {
            printf("[ERROR] Failed to transcribe audio\n");
            exit(1);
        }

        printf("%s\n", transcript);
        free(transcript);
    }

    free(pcm);
    pv_cheetah_delete(cheetah);

    return 0;
}
