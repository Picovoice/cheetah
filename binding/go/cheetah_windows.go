// Copyright 2022 Picovoice Inc.
//
// You may not use this file except in compliance with the license. A copy of the license is
// located in the "LICENSE" file accompanying this source.
//
// Unless required by applicable law or agreed to in writing, software distributed under the
// License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either
// express or implied. See the License for the specific language governing permissions and
// limitations under the License.

// Go binding for Cheetah Speech-to-Text engine.

// +build windows

package cheetah

//#include <stdlib.h>
import "C"

import (
	"unsafe"

	"golang.org/x/sys/windows"
)

// private vars
var (
	lib               = windows.NewLazyDLL(libName)
	init_func         = lib.NewProc("pv_cheetah_init")
	process_func      = lib.NewProc("pv_cheetah_process")
	flush_func        = lib.NewProc("pv_cheetah_flush")
	frame_length_func = lib.NewProc("pv_cheetah_frame_length")
	sample_rate_func  = lib.NewProc("pv_sample_rate")
	version_func      = lib.NewProc("pv_cheetah_version")
	delete_func       = lib.NewProc("pv_cheetah_delete")
)

func (nc nativeCheetahType) nativeInit(cheetah *Cheetah) (status PvStatus) {
	var (
		accessKeyC  		= C.CString(cheetah.AccessKey)
		modelPathC  		= C.CString(cheetah.ModelPath)
		endpointDurationC 	= cheetah.EndpointDuration
	)
	defer C.free(unsafe.Pointer(accessKeyC))
	defer C.free(unsafe.Pointer(modelPathC))

	ret, _, _ := init_func.Call(
		uintptr(unsafe.Pointer(accessKeyC)),
		uintptr(unsafe.Pointer(modelPathC)),
		uintptr(endpointDurationC),
		uintptr(unsafe.Pointer(&cheetah.handle)))

	return PvStatus(ret)
}

func (nc nativeCheetahType) nativeDelete(cheetah *Cheetah) {
	delete_func.Call(cheetah.handle)
}

func (nc nativeCheetahType) nativeProcess(cheetah *Cheetah, pcm []int16) (status PvStatus, transcript string, isEndpoint bool) {
	var transcriptPtr uintptr

	ret, _, _ := process_func.Call(
		cheetah.handle,
		uintptr(unsafe.Pointer(&pcm[0])),
		uintptr(unsafe.Pointer(&transcriptPtr)),
		uintptr(unsafe.Pointer(&isEndpoint)))

	transcript = C.GoString((*C.char)(unsafe.Pointer(transcriptPtr)))
	C.free(unsafe.Pointer(transcriptPtr))

	return PvStatus(ret), transcript, isEndpoint
}

func (nc nativeCheetahType) nativeFlush(cheetah *Cheetah) (status PvStatus, transcript string) {
	var (
		transcriptPtr uintptr
	)

	ret, _, _ := flush_func.Call(
		cheetah.handle,
		uintptr(unsafe.Pointer(&transcriptPtr)))

	transcript = C.GoString((*C.char)(unsafe.Pointer(transcriptPtr)))
	C.free(unsafe.Pointer(transcriptPtr))

	return PvStatus(ret), transcript
}

func (nc nativeCheetahType) nativeSampleRate() (sampleRate int) {
	ret, _, _ := sample_rate_func.Call()
	return int(ret)
}

func (nc nativeCheetahType) nativeFrameLength() (frameLength int) {
	ret, _, _ := frame_length_func.Call()
	return int(ret)
}

func (nc nativeCheetahType) nativeVersion() (version string) {
	ret, _, _ := version_func.Call()
	return C.GoString((*C.char)(unsafe.Pointer(ret)))
}
