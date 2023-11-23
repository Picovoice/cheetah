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

import (
	"encoding/binary"
	"flag"
	"io/ioutil"
	"log"
	"os"
	"path/filepath"
	"reflect"
	"strings"
	"testing"

	"github.com/agnivade/levenshtein"
)

type TestParameters struct {
	language                   string
	testAudioFile              string
	transcript                 string
	errorRate                  float32
	enableAutomaticPunctuation bool
}

var (
	testAccessKey         string
	cheetah               Cheetah
	processTestParameters []TestParameters
)

func TestMain(m *testing.M) {

	flag.StringVar(&testAccessKey, "access_key", "", "AccessKey for testing")
	flag.Parse()

	processTestParameters = loadTestData()
	os.Exit(m.Run())
}

func loadTestData() []TestParameters {
	punctuations := []string{"."}
	transcript := "Mr. Quilter is the apostle of the middle classes and we are glad to welcome his gospel."

	testCaseWithPunctuation := TestParameters{
		language:                   "en",
		testAudioFile:              "test.wav",
		transcript:                 transcript,
		enableAutomaticPunctuation: true,
		errorRate:                  0.025,
	}
	processTestParameters = append(processTestParameters, testCaseWithPunctuation)

	transcriptWithoutPunctuation := transcript
	for _, p := range punctuations {
		transcriptWithoutPunctuation = strings.ReplaceAll(transcriptWithoutPunctuation, p, "")
	}

	testCaseWithoutPunctuation := TestParameters{
		language:                   "en",
		testAudioFile:              "test.wav",
		transcript:                 transcriptWithoutPunctuation,
		enableAutomaticPunctuation: false,
		errorRate:                  0.025,
	}
	processTestParameters = append(processTestParameters, testCaseWithoutPunctuation)

	return processTestParameters
}

func TestVersion(t *testing.T) {
	cheetah = NewCheetah(testAccessKey)
	err := cheetah.Init()
	if err != nil {
		log.Fatalf("Failed to init cheetah with: %v", err)
	}

	defer func() {
		err := cheetah.Delete()
		if err != nil {
			log.Fatalf("Failed to release resources: %s", err)
		}
	}()

	if reflect.TypeOf(Version).Name() != "string" {
		t.Fatal("Unexpected version format.")
	}
	if Version == "" {
		t.Fatal("Failed to get version.")
	}
}

func runProcessTestCase(
	t *testing.T,
	_ string,
	testAudioFile string,
	referenceTranscript string,
	targetErrorRate float32,
	enableAutomaticPunctuation bool) {

	cheetah = NewCheetah(testAccessKey)
	cheetah.EnableAutomaticPunctuation = enableAutomaticPunctuation
	err := cheetah.Init()
	if err != nil {
		log.Fatalf("Failed to init cheetah with: %v", err)
	}

	defer func() {
		err := cheetah.Delete()
		if err != nil {
			log.Fatalf("Failed to release resources: %s", err)
		}
	}()

	testAudioPath, _ := filepath.Abs(filepath.Join("../../resources/audio_samples", testAudioFile))

	data, err := ioutil.ReadFile(testAudioPath)
	if err != nil {
		t.Fatalf("Could not read test file: %v", err)
	}
	data = data[44:]

	var transcript string

	frameLengthInBytes := FrameLength * 2
	numFrames := len(data) / frameLengthInBytes
	pcm := make([]int16, FrameLength)
	for i := 0; i < numFrames; i++ {
		for j := 0; j < FrameLength; j++ {
			offset := (i * frameLengthInBytes) + (j * 2)
			pcm[j] = int16(binary.LittleEndian.Uint16(data[offset : offset+2]))
		}

		partial, _, err := cheetah.Process(pcm)
		if err != nil {
			t.Fatalf("Failed to process pcm buffer: %v", err)
		}

		transcript += partial
	}

	final, err := cheetah.Flush()
	if err != nil {
		t.Fatalf("Failed to flush: %v", err)
	}
	transcript += final

	errorRate := float32(levenshtein.ComputeDistance(transcript, referenceTranscript)) / float32(len(referenceTranscript))
	if errorRate >= targetErrorRate {
		t.Fatalf("Expected '%f' got '%f'", targetErrorRate, errorRate)
	}
}

func TestProcess(t *testing.T) {
	for _, test := range processTestParameters {
		runProcessTestCase(t, test.language, test.testAudioFile, test.transcript, test.errorRate, test.enableAutomaticPunctuation)
	}
}

func TestMessageStack(t *testing.T) {
	cheetah = NewCheetah("invalid")
	cheetah.EnableAutomaticPunctuation = true
	err := cheetah.Init()
	if err == nil {
		log.Fatalf("Expected Cheetah init failure")
	}

	err = cheetah.Init()
	err2 := cheetah.Init()

	if len(err.Error()) > 1024 {
		t.Fatalf("length of error is full: '%d'", len(err.Error()))
	}

	if len(err2.Error()) != len(err.Error()) {
		t.Fatalf("length of 1st init '%d' does not match 2nd init '%d'", len(err.Error()), len(err2.Error()))
	}
}

func TestProcessFlushMessageStack(t *testing.T) {
	cheetah = NewCheetah(testAccessKey)
	cheetah.EnableAutomaticPunctuation = true
	err := cheetah.Init()
	if err != nil {
		log.Fatalf("Failed to init cheetah with: %v", err)
	}

	address := cheetah.handle
	cheetah.handle = nil

	testPcm := make([]int16, FrameLength)

	_, _, err = cheetah.Process(testPcm)
	if err == nil {
		t.Fatalf("Expected cheetah process to fail")
	}

	_, err = cheetah.Flush()
	if err == nil {
		t.Fatalf("Expected cheetah flush to fail")
	}

	cheetah.handle = address
	delErr := cheetah.Delete()
	if delErr != nil {
		t.Fatalf("%v", delErr)
	}
}
