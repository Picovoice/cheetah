/*
    Copyright 2018-2022 Picovoice Inc.

    You may not use this file except in compliance with the license. A copy of the license is located in the "LICENSE"
    file accompanying this source.

    Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on
    an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the
    specific language governing permissions and limitations under the License.
*/


#if !(defined(_WIN32) || defined(_WIN64))

#include <dlfcn.h>

#endif

#include <getopt.h>
#include <stdio.h>
#include <stdlib.h>
#include <sys/time.h>

#if defined(_WIN32) || defined(_WIN64)

#include <windows.h>

#endif

#define DR_WAV_IMPLEMENTATION

#include "dr_wav.h"

#include "pv_cheetah.h"


static void *open_dl(const char *dl_path) {

#if defined(_WIN32) || defined(_WIN64)

    return LoadLibrary(dl_path);

#else

    return dlopen(dl_path, RTLD_NOW);

#endif

}

static void *load_symbol(void *handle, const char *symbol) {

#if defined(_WIN32) || defined(_WIN64)

    return GetProcAddress((HMODULE) handle, symbol);

#else

    return dlsym(handle, symbol);

#endif

}

static void close_dl(void *handle) {

#if defined(_WIN32) || defined(_WIN64)

    FreeLibrary((HMODULE) handle);

#else

    dlclose(handle);

#endif

}

static void print_dl_error(const char *message) {

#if defined(_WIN32) || defined(_WIN64)

    fprintf(stderr, "%s with code `%lu`.\n", message, GetLastError());

#else

    fprintf(stderr, "%s with `%s`.\n", message, dlerror());

#endif

}

int main(int argc, char **argv) {
    const char *access_key = NULL;
    const char *library_path = NULL;
    const char *model_path = NULL;

    int opt;
    while ((opt = getopt(argc, argv, "a:l:m:")) != -1) {
        switch (opt) {
            case 'a':
                access_key = optarg;
                break;
            case 'l':
                library_path = optarg;
                break;
            case 'm':
                model_path = optarg;
                break;
            default:
                break;
        }
    }

    if (!(access_key && library_path && model_path && (optind < argc))) {
        fprintf(stderr, "usage: -a ACCESS_KEY -l LIBRARY_PATH -m MODEL_PATH wav_path0 wav_path1 ...\n");
        exit(1);
    }

    void *dl_handle = open_dl(library_path);
    if (!dl_handle) {
        fprintf(stderr, "failed to load dynamic library at `%s`.\n", library_path);
        exit(1);
    }

    const char *(*pv_status_to_string_func)(pv_status_t) = load_symbol(dl_handle, "pv_status_to_string");
    if (!pv_status_to_string_func) {
        print_dl_error("failed to load `pv_status_to_string`");
        exit(1);
    }

    pv_status_t (*pv_cheetah_init_func)(const char *, const char *, float, pv_cheetah_t **) =
    load_symbol(dl_handle, "pv_cheetah_init");
    if (!pv_cheetah_init_func) {
        print_dl_error("failed to load `pv_cheetah_init`");
        exit(1);
    }

    void (*pv_cheetah_delete_func)(pv_cheetah_t *) = load_symbol(dl_handle, "pv_cheetah_delete");
    if (!pv_cheetah_delete_func) {
        print_dl_error("failed to load `pv_cheetah_delete`");
        exit(1);
    }

    pv_status_t (*pv_cheetah_process_func)(pv_cheetah_t *, const int16_t *, char **, bool *) =
    load_symbol(dl_handle, "pv_cheetah_process");
    if (!pv_cheetah_process_func) {
        print_dl_error("failed to load `pv_cheetah_process`");
        exit(1);
    }

    pv_status_t (*pv_cheetah_flush_func)(pv_cheetah_t *, char **) = load_symbol(dl_handle, "pv_cheetah_flush");
    if (!pv_cheetah_flush_func) {
        print_dl_error("failed to load `pv_cheetah_flush`");
        exit(1);
    }

    int32_t (*pv_cheetah_frame_length_func)() = load_symbol(dl_handle, "pv_cheetah_frame_length");
    if (!pv_cheetah_frame_length_func) {
        print_dl_error("failed to load `pv_cheetah_frame_length`");
        exit(1);
    }

    int32_t (*pv_sample_rate_func)() = load_symbol(dl_handle, "pv_sample_rate");
    if (!pv_sample_rate_func) {
        print_dl_error("failed to load `pv_sample_rate_func`");
        exit(1);
    }

    const char *(*pv_cheetah_version_func)() = load_symbol(dl_handle, "pv_cheetah_version");
    if (!pv_cheetah_version_func) {
        print_dl_error("failed to load `pv_cheetah_version_func`");
        exit(1);
    }

    struct timeval before;
    gettimeofday(&before, NULL);

    pv_cheetah_t *cheetah = NULL;
    pv_status_t status = pv_cheetah_init_func(access_key, model_path, -1.f, &cheetah);
    if (status != PV_STATUS_SUCCESS) {
        fprintf(stderr, "failed to init with `%s`.\n", pv_status_to_string_func(status));
        exit(1);
    }

    struct timeval after;
    gettimeofday(&after, NULL);

    double init_sec = ((double) (after.tv_sec - before.tv_sec) + ((double) (after.tv_usec - before.tv_usec)) * 1e-6);
    fprintf(stdout, "init took %.1f sec\n", init_sec);

    fprintf(stdout, "Cheetah V%s\n\n", pv_cheetah_version_func());

    const size_t frame_length = (size_t) pv_cheetah_frame_length_func();

    int16_t *pcm = malloc(sizeof(int16_t) * frame_length);
    if (!pcm) {
        fprintf(stderr, "failed to allocate memory for audio buffer.\n");
        exit(1);
    }

    double audio_sec = 0.;
    double proc_sec = 0.;

    for (int32_t i = optind; i < argc; i++) {
        drwav f;

        if (!drwav_init_file(&f, argv[i], NULL)) {
            fprintf(stderr, "failed to open wav file at `%s`.", argv[i]);
            exit(1);
        }

        if (f.sampleRate != (uint32_t) pv_sample_rate_func()) {
            fprintf(stderr, "audio sample rate should be %d. got %d.\n.", pv_sample_rate_func(), f.sampleRate);
            exit(1);
        }

        if (f.bitsPerSample != 16) {
            fprintf(stderr, "audio format should be 16-bit\n.");
            exit(1);
        }

        if (f.channels != 1) {
            fprintf(stderr, "audio should be single-channel.\n");
            exit(1);
        }

        while ((int32_t) drwav_read_pcm_frames_s16(&f, frame_length, pcm) == frame_length) {
            gettimeofday(&before, NULL);

            char *partial_transcript = NULL;
            bool _ = false;
            status = pv_cheetah_process_func(cheetah, pcm, &partial_transcript, &_);
            if (status != PV_STATUS_SUCCESS) {
                fprintf(stderr, "`pv_cheetah_process` failed with `%s`\n", pv_status_to_string_func(status));
                exit(1);
            }

            gettimeofday(&after, NULL);

            proc_sec +=
                    ((double) (after.tv_sec - before.tv_sec)) + (((double) (after.tv_usec - before.tv_usec)) * 1e-6);
            audio_sec += (double) frame_length / (double) pv_sample_rate_func();

            fprintf(stdout, "%s", partial_transcript);
            fflush(stdout);
            free(partial_transcript);
        }

        gettimeofday(&before, NULL);

        char *final_transcript = NULL;
        status = pv_cheetah_flush_func(cheetah, &final_transcript);
        if (status != PV_STATUS_SUCCESS) {
            fprintf(stderr, "`pv_cheetah_flush` failed with `%s`.\n", pv_status_to_string_func(status));
            exit(1);
        }

        gettimeofday(&after, NULL);

        proc_sec += ((double) (after.tv_sec - before.tv_sec)) + (((double) (after.tv_usec - before.tv_usec)) * 1e-6);

        fprintf(stdout, "%s\n", final_transcript);
        free(final_transcript);

        drwav_uninit(&f);
    }

    fprintf(stdout, "RTF: %.3f\n", proc_sec / audio_sec);

    free(pcm);
    pv_cheetah_delete_func(cheetah);
    close_dl(dl_handle);

    return 0;
}