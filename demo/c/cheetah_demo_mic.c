/*
    Copyright 2018-2023 Picovoice Inc.

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
#include <signal.h>
#include <stdbool.h>
#include <stdio.h>
#include <stdlib.h>

#if defined(_WIN32) || defined(_WIN64)

#include <windows.h>

#endif

#include "pv_cheetah.h"
#include "pv_recorder.h"

static volatile bool is_interrupted = false;

void interrupt_handler(int _) {
    (void) _;
    is_interrupted = true;
}

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

    fprintf(stderr, "%s with code '%lu'.\n", message, GetLastError());

#else

    fprintf(stderr, "%s with `%s`.\n", message, dlerror());

#endif
}

void print_error_message(char **message_stack, int32_t message_stack_depth) {
    for (int32_t i = 0; i < message_stack_depth; i++) {
        fprintf(stderr, "  [%d] %s\n", i, message_stack[i]);
    }
}

static void show_audio_devices(void) {
    char **devices = NULL;
    int32_t count = 0;

    pv_recorder_status_t status = pv_recorder_get_audio_devices(&count, &devices);
    if (status != PV_RECORDER_STATUS_SUCCESS) {
        fprintf(stderr, "failed to get audio devices with `%s`.\n", pv_recorder_status_to_string(status));
        exit(1);
    }

    for (int32_t i = 0; i < count; i++) {
        fprintf(stdout, "[%d] %s\n", i, devices[i]);
    }

    pv_recorder_free_device_list(count, devices);
}

int picovoice_main(int argc, char *argv[]) {
    signal(SIGINT, interrupt_handler);

    const char *access_key = NULL;
    const char *model_path = NULL;
    const char *library_path = NULL;
    float endpoint_duration_sec = 0.f;
    bool enable_automatic_punctuation = true;
    int32_t device_index = -1;

    int opt;
    while ((opt = getopt(argc, argv, "a:m:l:e:di:s")) != -1) {
        switch (opt) {
            case 'a':
                access_key = optarg;
                break;
            case 'm':
                model_path = optarg;
                break;
            case 'l':
                library_path = optarg;
                break;
            case 'e':
                endpoint_duration_sec = (float) strtod(optarg, NULL);
                if (endpoint_duration_sec < 0.f) {
                    fprintf(
                            stderr,
                            "endpoint duration should be either a positive floating-point number or `0` to disable endpointing\n");
                    exit(1);
                }
                break;
            case 'd':
                enable_automatic_punctuation = false;
                break;
            case 'i':
                device_index = (int32_t) strtol(optarg, NULL, 10);
                if (device_index < -1) {
                    fprintf(stderr, "device index should be either `-1` (default) or a non-negative valid index\n");
                    exit(1);
                }
                break;
            case 's':
                show_audio_devices();
                exit(0);
            default:
                break;
        }
    }

    if (!(access_key && library_path && model_path)) {
        fprintf(stderr,
                "usage: -a ACCESS_KEY -m MODEL_PATH -l LIBRARY_PATH [-e ENDPOINT_DURATION] [-d] [-i DEVICE_INDEX]\n-s (show audio device indices)\n");
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

    int32_t (*pv_sample_rate_func)() = load_symbol(dl_handle, "pv_sample_rate");
    if (!pv_sample_rate_func) {
        print_dl_error("failed to load `pv_sample_rate`");
        exit(1);
    }

    pv_status_t (*pv_cheetah_init_func)(const char *, const char *, float, bool, pv_cheetah_t **) =
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

    const char *(*pv_cheetah_version_func)() = load_symbol(dl_handle, "pv_cheetah_version");
    if (!pv_cheetah_version_func) {
        print_dl_error("failed to load `pv_cheetah_version_func`");
        exit(1);
    }

    pv_status_t (*pv_cheetah_transcript_delete_func)(char *) =
            load_symbol(dl_handle, "pv_cheetah_transcript_delete");
    if (!pv_cheetah_transcript_delete_func) {
        print_dl_error("failed to load `pv_cheetah_transcript_delete`");
        exit(1);
    }

    pv_status_t (*pv_get_error_stack_func)(char ***, int32_t *) = load_symbol(dl_handle, "pv_get_error_stack");
    if (!pv_get_error_stack_func) {
        print_dl_error("failed to load 'pv_get_error_stack_func'");
        exit(1);
    }

    void (*pv_free_error_stack_func)(char **) = load_symbol(dl_handle, "pv_free_error_stack");
    if (!pv_free_error_stack_func) {
        print_dl_error("failed to load 'pv_free_error_stack_func'");
        exit(1);
    }

    char **message_stack = NULL;
    int32_t message_stack_depth = 0;
    pv_status_t error_status = PV_STATUS_RUNTIME_ERROR;

    pv_cheetah_t *cheetah = NULL;
    pv_status_t status = pv_cheetah_init_func(
        access_key,
        model_path,
        endpoint_duration_sec,
        enable_automatic_punctuation,
        &cheetah);
    if (status != PV_STATUS_SUCCESS) {
        fprintf(
            stderr,
            "Failed to init with `%s`",
            pv_status_to_string_func(status));
        error_status = pv_get_error_stack_func(&message_stack, &message_stack_depth);
        if (error_status != PV_STATUS_SUCCESS) {
            fprintf(
                    stderr,
                    ".\nUnable to get Cheetah error state with '%s'.\n",
                    pv_status_to_string_func(error_status));
            exit(1);
        }

        if (message_stack_depth > 0) {
            fprintf(stderr, ":\n");
            print_error_message(message_stack, message_stack_depth);
        } else {
            fprintf(stderr, ".\n");
        }

        pv_free_error_stack_func(message_stack);
        exit(1);
    }

    fprintf(stdout, "Cheetah V%s\n", pv_cheetah_version_func());

    const int32_t frame_length = pv_cheetah_frame_length_func();
    pv_recorder_t *recorder = NULL;
    pv_recorder_status_t recorder_status = pv_recorder_init(device_index, frame_length, 1000, true, true, &recorder);
    if (recorder_status != PV_RECORDER_STATUS_SUCCESS) {
        fprintf(stderr, "Failed to initialize audio device with `%s`.\n", pv_recorder_status_to_string(recorder_status));
        exit(1);
    }

    int16_t *pcm = malloc(frame_length * sizeof(int16_t));
    if (!pcm) {
        fprintf(stderr, "Failed to allocate pcm memory.\n");
        exit(1);
    }

    const char *selected_device = pv_recorder_get_selected_device(recorder);
    fprintf(stdout, "selected device: %s.\n", selected_device);

    fprintf(stdout, "start recording...\n");
    recorder_status = pv_recorder_start(recorder);
    if (recorder_status != PV_RECORDER_STATUS_SUCCESS) {
        fprintf(stderr, "Failed to start device with %s.\n", pv_recorder_status_to_string(recorder_status));
        exit(1);
    }

    while (!is_interrupted) {
        recorder_status = pv_recorder_read(recorder, pcm);
        if (recorder_status != PV_RECORDER_STATUS_SUCCESS) {
            fprintf(stderr, "Failed to read with `%s`.\n", pv_recorder_status_to_string(recorder_status));
            exit(1);
        }

        char *partial_transcript = NULL;
        bool is_endpoint = false;
        status = pv_cheetah_process_func(cheetah, pcm, &partial_transcript, &is_endpoint);
        if (status != PV_STATUS_SUCCESS) {
            fprintf(
                stderr,
                "Failed to process with `%s`",
                pv_status_to_string_func(status));
            error_status = pv_get_error_stack_func(&message_stack, &message_stack_depth);
            if (error_status != PV_STATUS_SUCCESS) {
                fprintf(
                        stderr,
                        ".\nUnable to get Cheetah error state with '%s'.\n",
                        pv_status_to_string_func(error_status));
                exit(1);
            }

            if (message_stack_depth > 0) {
                fprintf(stderr, ":\n");
                print_error_message(message_stack, message_stack_depth);
            } else {
                fprintf(stderr, ".\n");
            }

            pv_free_error_stack_func(message_stack);
            exit(1);
        }
        fprintf(stdout, "%s", partial_transcript);
        fflush(stdout);
        pv_cheetah_transcript_delete_func(partial_transcript);
        if (is_endpoint) {
            char *final_transcript = NULL;
            status = pv_cheetah_flush_func(cheetah, &final_transcript);
            if (status != PV_STATUS_SUCCESS) {
                fprintf(
                    stderr,
                    "Failed to flush with `%s`",
                    pv_status_to_string_func(status));
                error_status = pv_get_error_stack_func(&message_stack, &message_stack_depth);
                if (error_status != PV_STATUS_SUCCESS) {
                    fprintf(
                            stderr,
                            ".\nUnable to get Cheetah error state with '%s'.\n",
                            pv_status_to_string_func(error_status));
                    exit(1);
                }

                if (message_stack_depth > 0) {
                    fprintf(stderr, ":\n");
                    print_error_message(message_stack, message_stack_depth);
                } else {
                    fprintf(stderr, ".\n");
                }

                pv_free_error_stack_func(message_stack);
                exit(1);
            }
            fprintf(stdout, "%s\n", final_transcript);
            pv_cheetah_transcript_delete_func(final_transcript);
        }
    }
    fprintf(stdout, "\n");

    recorder_status = pv_recorder_stop(recorder);
    if (recorder_status != PV_RECORDER_STATUS_SUCCESS) {
        fprintf(stderr, "Failed to stop device with `%s`.\n", pv_recorder_status_to_string(recorder_status));
        exit(1);
    }

    free(pcm);
    pv_recorder_delete(recorder);
    pv_cheetah_delete_func(cheetah);
    close_dl(dl_handle);

    return 0;
}

int main(int argc, char *argv[]) {

#if defined(_WIN32) || defined(_WIN64)

#define UTF8_COMPOSITION_FLAG (0)
#define NULL_TERMINATED       (-1)

    LPWSTR *wargv = CommandLineToArgvW(GetCommandLineW(), &argc);
    if (wargv == NULL) {
        fprintf(stderr, "CommandLineToArgvW failed\n");
        exit(1);
    }

    char *utf8_argv[argc];

    for (int i = 0; i < argc; ++i) {
        // WideCharToMultiByte: https://docs.microsoft.com/en-us/windows/win32/api/stringapiset/nf-stringapiset-widechartomultibyte
        int arg_chars_num = WideCharToMultiByte(CP_UTF8, UTF8_COMPOSITION_FLAG, wargv[i], NULL_TERMINATED, NULL, 0, NULL, NULL);
        utf8_argv[i] = (char *) malloc(arg_chars_num * sizeof(char));
        if (!utf8_argv[i]) {
            fprintf(stderr, "failed to to allocate memory for converting args");
        }
        WideCharToMultiByte(CP_UTF8, UTF8_COMPOSITION_FLAG, wargv[i], NULL_TERMINATED, utf8_argv[i], arg_chars_num, NULL, NULL);
    }

    LocalFree(wargv);
    argv = utf8_argv;

#endif

    int result = picovoice_main(argc, argv);

#if defined(_WIN32) || defined(_WIN64)

    for (int i = 0; i < argc; ++i) {
        free(utf8_argv[i]);
    }

#endif

    return result;
}
