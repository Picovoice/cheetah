// Copyright 2022 Picovoice Inc.
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

import (
	"C"
	"embed"
	"fmt"
	"io/ioutil"
	"log"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"
)

//go:embed embedded
var embeddedFS embed.FS

// PvStatus type
type PvStatus int

// Possible status return codes from the Cheetah library
const (
	SUCCESS                  PvStatus = 0
	OUT_OF_MEMORY            PvStatus = 1
	IO_ERROR                 PvStatus = 2
	INVALID_ARGUMENT         PvStatus = 3
	STOP_ITERATION           PvStatus = 4
	KEY_ERROR                PvStatus = 5
	INVALID_STATE            PvStatus = 6
	RUNTIME_ERROR            PvStatus = 7
	ACTIVATION_ERROR         PvStatus = 8
	ACTIVATION_LIMIT_REACHED PvStatus = 9
	ACTIVATION_THROTTLED     PvStatus = 10
	ACTIVATION_REFUSED       PvStatus = 11
)

type CheetahError struct {
	StatusCode PvStatus
	Message    string
}

func (e *CheetahError) Error() string {
	return fmt.Sprintf("%s: %s", pvStatusToString(e.StatusCode), e.Message)
}

// Cheetah struct
type Cheetah struct {
	// handle for cheetah instance in C
	handle uintptr

	// AccessKey obtained from Picovoice Console (https://console.picovoice.ai/).
	AccessKey string

	// Absolute path to the file containing model parameters.
	ModelPath string

	// Duration of endpoint in seconds. A speech endpoint is detected when there is a
	// chunk of audio (with a duration specified herein) after an utterance without any speech in it. Set to 0
	// to disable endpoint detection.
	EndpointDuration float32
}

type nativeCheetahInterface interface {
	nativeInit(*Cheetah)
	nativeProcess(*Cheetah, []int)
	nativeFlush(*Cheetah, string)
	nativeDelete(*Cheetah)
	nativeSampleRate()
	nativeVersion()
}
type nativeCheetahType struct{}

// private vars
var (
	osName, cpu   = getOS()
	extractionDir = filepath.Join(os.TempDir(), "cheetah")

	defaultModelFile = extractDefaultModel()
	libName          = extractLib()
	nativeCheetah    = nativeCheetahType{}
)

var (
	// Number of audio samples per frame.
	FrameLength = nativeCheetah.nativeFrameLength()

	// Audio sample rate accepted by Picovoice.
	SampleRate = nativeCheetah.nativeSampleRate()

	// Cheetah version
	Version = nativeCheetah.nativeVersion()
)

// Init function for Cheetah. Must be called before attempting process
func (cheetah *Cheetah) Init() error {
	if cheetah.AccessKey == "" {
		return &CheetahError{
			INVALID_ARGUMENT,
			"No AccessKey provided to Cheetah"}
	}

	if cheetah.ModelPath == "" {
		cheetah.ModelPath = defaultModelFile
	}

	if _, err := os.Stat(cheetah.ModelPath); os.IsNotExist(err) {
		return &CheetahError{
			INVALID_ARGUMENT,
			fmt.Sprintf("Specified model file could not be found at %s", cheetah.ModelPath)}
	}

	if cheetah.EndpointDuration < 0 {
		return &CheetahError{
			INVALID_ARGUMENT,
			"Endpoint duration must be non-negative"}
	}

	ret := nativeCheetah.nativeInit(cheetah)
	if PvStatus(ret) != SUCCESS {
		return &CheetahError{
			PvStatus(ret),
			"Cheetah init failed."}
	}

	return nil
}

// Releases resources acquired by Cheetah.
func (cheetah *Cheetah) Delete() error {
	if cheetah.handle == 0 {
		return &CheetahError{
			INVALID_STATE,
			"Cheetah has not been initialized or has already been deleted"}
	}

	nativeCheetah.nativeDelete(cheetah)
	return nil
}

// Processes a frame of audio and returns newly-transcribed text and a flag indicating if an endpoint has been
// detected. Upon detection of an endpoint, the client may invoke `.Flush()` to retrieve any remaining transcription. 
// Returns Any newly-transcribed speech (if none is available then an empty string is returned) and a 
// flag indicating if an endpoint has been detected.
func (cheetah *Cheetah) Process(pcm []int16) (string, bool, error) {
	if cheetah.handle == 0 {
		return "", false, &CheetahError{
			INVALID_STATE,
			"Cheetah has not been initialized or has already been deleted"}
	}

	if len(pcm) != FrameLength {
		return "", false, &CheetahError{
			INVALID_ARGUMENT,
			fmt.Sprintf("Input data frame size (%d) does not match required size of %d", len(pcm), FrameLength)}
	}

	ret, transcript, isEndpoint := nativeCheetah.nativeProcess(cheetah, pcm)
	if PvStatus(ret) != SUCCESS {
		return "", false, &CheetahError{
			PvStatus(ret),
			"Cheetah process failed."}
	}

	return transcript, isEndpoint, nil
}

// Marks the end of the audio stream, flushes internal state of the object, and returns any remaining transcribed text.
// Return any remaining transcribed text. If none is available then an empty string is returned.
func (cheetah *Cheetah) Flush() (string, error) {
	if cheetah.handle == 0 {
		return "", &CheetahError{
			INVALID_STATE,
			"Cheetah has not been initialized or has already been deleted"}
	}

	ret, transcript := nativeCheetah.nativeFlush(cheetah)
	if PvStatus(ret) != SUCCESS {
		return "", &CheetahError{
			PvStatus(ret),
			"Cheetah flush failed."}
	}

	return transcript, nil
}

func pvStatusToString(status PvStatus) string {
	switch status {
	case SUCCESS:
		return "SUCCESS"
	case OUT_OF_MEMORY:
		return "OUT_OF_MEMORY"
	case IO_ERROR:
		return "IO_ERROR"
	case INVALID_ARGUMENT:
		return "INVALID_ARGUMENT"
	case STOP_ITERATION:
		return "STOP_ITERATION"
	case KEY_ERROR:
		return "KEY_ERROR"
	case INVALID_STATE:
		return "INVALID_STATE"
	case RUNTIME_ERROR:
		return "RUNTIME_ERROR"
	case ACTIVATION_ERROR:
		return "ACTIVATION_ERROR"
	case ACTIVATION_LIMIT_REACHED:
		return "ACTIVATION_LIMIT_REACHED"
	case ACTIVATION_THROTTLED:
		return "ACTIVATION_THROTTLED"
	case ACTIVATION_REFUSED:
		return "ACTIVATION_REFUSED"
	default:
		return fmt.Sprintf("Unknown error code: %d", status)
	}
}

func getOS() (string, string) {
	switch os := runtime.GOOS; os {
	case "darwin":
		return "mac", getMacArch()
	case "linux":
		osName, cpu := getLinuxDetails()
		return osName, cpu
	case "windows":
		return "windows", "amd64"
	default:
		log.Fatalf("%s is not a supported OS", os)
		return "", ""
	}
}

func getMacArch() string {
	if runtime.GOARCH == "arm64" {
		return "arm64"
	} else {
		return "x86_64"
	}
}

func getLinuxDetails() (string, string) {
	var archInfo = ""

	if runtime.GOARCH == "amd64" {
		return "linux", "x86_64"
	} else if runtime.GOARCH == "arm64" {
		archInfo = "-aarch64"
	}

	cmd := exec.Command("cat", "/proc/cpuinfo")
	cpuInfo, err := cmd.Output()

	if err != nil {
		log.Fatalf("Failed to get CPU details: %s", err.Error())
	}

	var cpuPart = ""
	for _, line := range strings.Split(string(cpuInfo), "\n") {
		if strings.Contains(line, "CPU part") {
			split := strings.Split(line, " ")
			cpuPart = strings.ToLower(split[len(split)-1])
			break
		}
	}

	switch cpuPart {
	case "0xd03":
		return "raspberry-pi", "cortex-a53" + archInfo
	case "0xd07":
		return "jetson", "cortex-a57" + archInfo
	case "0xd08":
		return "raspberry-pi", "cortex-a72" + archInfo
	default:
		log.Fatalf("Unsupported CPU:\n%s", cpuPart)
		return "", ""
	}
}

func extractDefaultModel() string {
	modelPath := "embedded/lib/common/cheetah_params.pv"
	return extractFile(modelPath, extractionDir)
}

func extractLib() string {
	var libPath string
	switch os := runtime.GOOS; os {
	case "darwin":
		libPath = fmt.Sprintf("embedded/lib/%s/%s/libpv_cheetah.dylib", osName, cpu)
	case "linux":
		if cpu == "" {
			libPath = fmt.Sprintf("embedded/lib/%s/libpv_cheetah.so", osName)
		} else {
			libPath = fmt.Sprintf("embedded/lib/%s/%s/libpv_cheetah.so", osName, cpu)
		}
	case "windows":
		libPath = fmt.Sprintf("embedded/lib/%s/amd64/libpv_cheetah.dll", osName)
	default:
		log.Fatalf("%s is not a supported OS", os)
	}

	return extractFile(libPath, extractionDir)
}

func extractFile(srcFile string, dstDir string) string {
	bytes, readErr := embeddedFS.ReadFile(srcFile)
	if readErr != nil {
		log.Fatalf("%v", readErr)
	}

	extractedFilepath := filepath.Join(dstDir, srcFile)
	mkErr := os.MkdirAll(filepath.Dir(extractedFilepath), 0764)
	if mkErr != nil {
		log.Fatalf("%v", mkErr)
	}

	writeErr := ioutil.WriteFile(extractedFilepath, bytes, 0764)
	if writeErr != nil {
		log.Fatalf("%v", writeErr)
	}
	return extractedFilepath
}
