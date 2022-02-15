// Copyright 2022 Picovoice Inc.
//
// You may not use this file except in compliance with the license. A copy of the license is
// located in the "LICENSE" file accompanying this source.
//
// Uncess required by applicable law or agreed to in writing, software distributed under the
// License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either
// express or implied. See the License for the specific language governing permissions and
// limitations under the License.
//

// Go binding for Cheetah Speech-to-Text engine.

// +build linux darwin

package cheetah

/*
#cgo LDFLAGS: -ldl
#include <dlfcn.h>
#include <stdbool.h>
#include <stdint.h>
#include <stdlib.h>

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
	void **object);

int32_t pv_cheetah_init_wrapper(
	void *f,
	const char *access_key,
	const char *model_path,
    float endpoint_duration_sec,
	void **object) {
	return ((pv_cheetah_init_func) f)(
		access_key,
		model_path,
        endpoint_duration_sec,
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
*/
import "C"

import (
	"unsafe"
)

// private vars
var (
	lib = C.dlopen(C.CString(libName), C.RTLD_NOW)

	pv_cheetah_init_ptr         = C.dlsym(lib, C.CString("pv_cheetah_init"))
	pv_cheetah_process_ptr      = C.dlsym(lib, C.CString("pv_cheetah_process"))
	pv_cheetah_flush_ptr        = C.dlsym(lib, C.CString("pv_cheetah_flush"))
	pv_cheetah_delete_ptr       = C.dlsym(lib, C.CString("pv_cheetah_delete"))
	pv_cheetah_version_ptr      = C.dlsym(lib, C.CString("pv_cheetah_version"))
	pv_cheetah_frame_length_ptr = C.dlsym(lib, C.CString("pv_cheetah_frame_length"))
	pv_sample_rate_ptr          = C.dlsym(lib, C.CString("pv_sample_rate"))
)

func (nc nativeCheetahType) nativeInit(cheetah *Cheetah) (status PvStatus) {
	var (
		accessKeyC			= C.CString(cheetah.AccessKey)
		modelPathC 			= C.CString(cheetah.ModelPath)
		endpointDurationC 	= C.float(cheetah.EndpointDuration)
		ptrC       			= make([]unsafe.Pointer, 1)
	)
	defer C.free(unsafe.Pointer(accessKeyC))
	defer C.free(unsafe.Pointer(modelPathC))

	var ret = C.pv_cheetah_init_wrapper(
		pv_cheetah_init_ptr,
		accessKeyC,
		modelPathC,
		endpointDurationC,
		&ptrC[0])

	cheetah.handle = uintptr(ptrC[0])
	return PvStatus(ret)
}

func (nc nativeCheetahType) nativeDelete(cheetah *Cheetah) {
	C.pv_cheetah_delete_wrapper(pv_cheetah_delete_ptr,
		unsafe.Pointer(cheetah.handle))
}

func (nc nativeCheetahType) nativeProcess(cheetah *Cheetah, pcm []int16) (status PvStatus, transcript string, isEndpoint bool) {
	var transcriptPtr uintptr

	var ret = C.pv_cheetah_process_wrapper(pv_cheetah_process_ptr,
		unsafe.Pointer(cheetah.handle),
		(*C.int16_t)(unsafe.Pointer(&pcm[0])),
		(**C.char)(unsafe.Pointer(&transcriptPtr)),
		(*C.bool)(unsafe.Pointer(&isEndpoint)))

	transcript = C.GoString((*C.char)(unsafe.Pointer(transcriptPtr)))
	C.free(unsafe.Pointer(transcriptPtr))

	return PvStatus(ret), transcript, isEndpoint
}

func (nc nativeCheetahType) nativeFlush(cheetah *Cheetah) (status PvStatus, transcript string) {
	var (
		transcriptPtr uintptr
	)

	var ret = C.pv_cheetah_flush_wrapper(pv_cheetah_flush_ptr,
		unsafe.Pointer(cheetah.handle),
		(**C.char)(unsafe.Pointer(&transcriptPtr)))

	transcript = C.GoString((*C.char)(unsafe.Pointer(transcriptPtr)))
	C.free(unsafe.Pointer(transcriptPtr))

	return PvStatus(ret), transcript
}

func (nc nativeCheetahType) nativeSampleRate() (sampleRate int) {
	return int(C.pv_cheetah_sample_rate_wrapper(pv_sample_rate_ptr))
}

func (nc nativeCheetahType) nativeFrameLength() (frameLength int) {
	return int(C.pv_cheetah_frame_length_wrapper(pv_cheetah_frame_length_ptr))
}

func (nc nativeCheetahType) nativeVersion() (version string) {
	return C.GoString(C.pv_cheetah_version_wrapper(pv_cheetah_version_ptr))
}
