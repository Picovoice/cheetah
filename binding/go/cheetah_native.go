// Copyright 2022-2023 Picovoice Inc.
//
// You may not use this file except in compliance with the license. A copy of the license is
// located in the "LICENSE" file accompanying this source.
//
// Unless required by applicable law or agreed to in writing, software distributed under the
// License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either
// express or implied. See the License for the specific language governing permissions and
// limitations under the License.
//

// Go binding for Cheetah Speech-to-Text engine.

package cheetah

/*
#cgo linux LDFLAGS: -ldl
#cgo darwin LDFLAGS: -ldl

#include <stdbool.h>
#include <stdint.h>
#include <stdlib.h>

#if defined(_WIN32) || defined(_WIN64)

	#include <windows.h>

#else

	#include <dlfcn.h>

#endif

static void *open_dl(const char *dl_path) {

#if defined(_WIN32) || defined(_WIN64)

    return LoadLibrary((LPCSTR) dl_path);

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

typedef int32_t (*pv_cheetah_sample_rate_func)();

int32_t pv_cheetah_sample_rate_wrapper(void *f) {
     return ((pv_cheetah_sample_rate_func) f)();
}

typedef int32_t (*pv_cheetah_frame_length_func)();
int32_t pv_cheetah_frame_length_wrapper(void* f) {
     return ((pv_cheetah_frame_length_func) f)();
}

typedef char* (*pv_cheetah_version_func)();

char* pv_cheetah_version_wrapper(void* f) {
     return ((pv_cheetah_version_func) f)();
}

typedef int32_t (*pv_cheetah_init_func)(
	const char *access_key,
	const char *model_path,
    float endpoint_duration_sec,
	bool enable_automatic_punctuation,
	void **object);

int32_t pv_cheetah_init_wrapper(
	void *f,
	const char *access_key,
	const char *model_path,
    float endpoint_duration_sec,
	bool enable_automatic_punctuation,
	void **object) {
	return ((pv_cheetah_init_func) f)(
		access_key,
		model_path,
        endpoint_duration_sec,
		enable_automatic_punctuation,
		object);
}

typedef int32_t (*pv_cheetah_process_func)(
	void *object,
	const int16_t *pcm,
	char **transcript,
	bool *is_endpoint);

int32_t pv_cheetah_process_wrapper(
	void *f,
	void *object,
	const int16_t *pcm,
	char **transcript,
	bool *is_endpoint) {
	return ((pv_cheetah_process_func) f)(
		object,
		pcm,
		transcript,
		is_endpoint);
}

typedef int32_t (*pv_cheetah_flush_func)(
	void *object,
	char **transcript);

int32_t pv_cheetah_flush_wrapper(
	void *f,
	void *object,
	char **transcript) {
	return ((pv_cheetah_flush_func) f)(
		object,
		transcript);
}

typedef void (*pv_cheetah_delete_func)(void *);

void pv_cheetah_delete_wrapper(void *f, void *object) {
	return ((pv_cheetah_delete_func) f)(object);
}

typedef void (*pv_set_sdk_func)(const char *);

void pv_set_sdk_wrapper(void *f, const char *sdk) {
	return ((pv_set_sdk_func) f)(sdk);
}

typedef int32_t (*pv_get_error_stack_func)(char ***, int32_t *);

int32_t pv_get_error_stack_wrapper(
	void *f,
	char ***message_stack,
	int32_t *message_stack_depth) {
	return ((pv_get_error_stack_func) f)(message_stack, message_stack_depth);
}

typedef void (*pv_free_error_stack_func)(char **);

void pv_free_error_stack_wrapper(
	void *f,
	char **message_stack) {
	return ((pv_free_error_stack_func) f)(message_stack);
}

typedef void (*pv_cheetah_transcript_delete_func)(void *);

void pv_cheetah_transcript_delete_wrapper(void* f, char *transcript) {
	((pv_cheetah_transcript_delete_func) f)(transcript);
}
*/
import "C"

import (
	"unsafe"
)

type nativeCheetahInterface interface {
	nativeInit(*Cheetah)
	nativeProcess(*Cheetah, []int)
	nativeFlush(*Cheetah, string)
	nativeDelete(*Cheetah)
	nativeSampleRate()
	nativeVersion()
	nativeGetErrorStack()
}

type nativeCheetahType struct {
	libraryPath unsafe.Pointer

	pv_cheetah_init_ptr              unsafe.Pointer
	pv_cheetah_process_ptr           unsafe.Pointer
	pv_cheetah_flush_ptr             unsafe.Pointer
	pv_cheetah_delete_ptr            unsafe.Pointer
	pv_cheetah_version_ptr           unsafe.Pointer
	pv_cheetah_frame_length_ptr      unsafe.Pointer
	pv_sample_rate_ptr               unsafe.Pointer
	pv_set_sdk_ptr                   unsafe.Pointer
	pv_get_error_stack_ptr           unsafe.Pointer
	pv_free_error_stack_ptr          unsafe.Pointer
	pv_cheetah_transcript_delete_ptr unsafe.Pointer
}

func (nc *nativeCheetahType) nativeInit(cheetah *Cheetah) (status PvStatus) {
	var (
		accessKeyC                  = C.CString(cheetah.AccessKey)
		modelPathC                  = C.CString(cheetah.ModelPath)
		libraryPathC                = C.CString(cheetah.LibraryPath)
		endpointDurationC           = C.float(cheetah.EndpointDuration)
		enableAutomaticPunctuationC = C.bool(cheetah.EnableAutomaticPunctuation)
	)

	defer C.free(unsafe.Pointer(accessKeyC))
	defer C.free(unsafe.Pointer(modelPathC))
	defer C.free(unsafe.Pointer(libraryPathC))

	nc.libraryPath = C.open_dl(libraryPathC)
	nc.pv_cheetah_init_ptr = C.load_symbol(nc.libraryPath, C.CString("pv_cheetah_init"))
	nc.pv_cheetah_process_ptr = C.load_symbol(nc.libraryPath, C.CString("pv_cheetah_process"))
	nc.pv_cheetah_flush_ptr = C.load_symbol(nc.libraryPath, C.CString("pv_cheetah_flush"))
	nc.pv_cheetah_delete_ptr = C.load_symbol(nc.libraryPath, C.CString("pv_cheetah_delete"))
	nc.pv_cheetah_version_ptr = C.load_symbol(nc.libraryPath, C.CString("pv_cheetah_version"))
	nc.pv_cheetah_frame_length_ptr = C.load_symbol(nc.libraryPath, C.CString("pv_cheetah_frame_length"))
	nc.pv_sample_rate_ptr = C.load_symbol(nc.libraryPath, C.CString("pv_sample_rate"))
	nc.pv_set_sdk_ptr = C.load_symbol(nc.libraryPath, C.CString("pv_set_sdk"))
	nc.pv_get_error_stack_ptr = C.load_symbol(nc.libraryPath, C.CString("pv_get_error_stack"))
	nc.pv_free_error_stack_ptr = C.load_symbol(nc.libraryPath, C.CString("pv_free_error_stack"))
	nc.pv_cheetah_transcript_delete_ptr = C.load_symbol(nc.libraryPath, C.CString("pv_cheetah_transcript_delete"))

	C.pv_set_sdk_wrapper(
		nc.pv_set_sdk_ptr,
		C.CString("go"))

	var ret = C.pv_cheetah_init_wrapper(
		nc.pv_cheetah_init_ptr,
		accessKeyC,
		modelPathC,
		endpointDurationC,
		enableAutomaticPunctuationC,
		&cheetah.handle)

	return PvStatus(ret)
}

func (nc *nativeCheetahType) nativeDelete(cheetah *Cheetah) {
	C.pv_cheetah_delete_wrapper(
		nc.pv_cheetah_delete_ptr,
		cheetah.handle)
}

func (nc *nativeCheetahType) nativeProcess(cheetah *Cheetah, pcm []int16) (status PvStatus, transcript string, isEndpoint bool) {
	var transcriptPtr unsafe.Pointer

	var ret = C.pv_cheetah_process_wrapper(nc.pv_cheetah_process_ptr,
		cheetah.handle,
		(*C.int16_t)(unsafe.Pointer(&pcm[0])),
		(**C.char)(unsafe.Pointer(&transcriptPtr)),
		(*C.bool)(unsafe.Pointer(&isEndpoint)))
	if PvStatus(ret) != SUCCESS {
		return PvStatus(ret), "", false
	}

	transcript = C.GoString((*C.char)(transcriptPtr))
	C.pv_cheetah_transcript_delete_wrapper(nc.pv_cheetah_transcript_delete_ptr, (*C.char)(transcriptPtr))

	return PvStatus(ret), transcript, isEndpoint
}

func (nc *nativeCheetahType) nativeFlush(cheetah *Cheetah) (status PvStatus, transcript string) {

	var transcriptPtr unsafe.Pointer

	var ret = C.pv_cheetah_flush_wrapper(nc.pv_cheetah_flush_ptr,
		cheetah.handle,
		(**C.char)(unsafe.Pointer(&transcriptPtr)))
	if PvStatus(ret) != SUCCESS {
		return PvStatus(ret), ""
	}

	transcript = C.GoString((*C.char)(transcriptPtr))
	C.pv_cheetah_transcript_delete_wrapper(nc.pv_cheetah_transcript_delete_ptr, (*C.char)(transcriptPtr))

	return PvStatus(ret), transcript
}

func (nc nativeCheetahType) nativeSampleRate() (sampleRate int) {
	return int(C.pv_cheetah_sample_rate_wrapper(nc.pv_sample_rate_ptr))
}

func (nc nativeCheetahType) nativeFrameLength() (frameLength int) {
	return int(C.pv_cheetah_frame_length_wrapper(nc.pv_cheetah_frame_length_ptr))
}

func (nc nativeCheetahType) nativeVersion() (version string) {
	return C.GoString(C.pv_cheetah_version_wrapper(nc.pv_cheetah_version_ptr))
}

func (nc *nativeCheetahType) nativeGetErrorStack() (status PvStatus, messageStack []string) {
	var messageStackDepthRef C.int32_t
	var messageStackRef **C.char

	var ret = C.pv_get_error_stack_wrapper(nc.pv_get_error_stack_ptr,
		&messageStackRef,
		&messageStackDepthRef)

	if PvStatus(ret) != SUCCESS {
		return PvStatus(ret), []string{}
	}

	defer C.pv_free_error_stack_wrapper(
		nc.pv_free_error_stack_ptr,
		messageStackRef)

	messageStackDepth := int(messageStackDepthRef)
	messageStackSlice := (*[1 << 28]*C.char)(unsafe.Pointer(messageStackRef))[:messageStackDepth:messageStackDepth]

	messageStack = make([]string, messageStackDepth)

	for i := 0; i < messageStackDepth; i++ {
		messageStack[i] = C.GoString(messageStackSlice[i])
	}

	return PvStatus(ret), messageStack
}
