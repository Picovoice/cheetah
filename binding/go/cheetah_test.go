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
	"encoding/binary"
	"flag"
	"io/ioutil"
	"log"
	"os"
	"path/filepath"
	"reflect"
	"runtime"
	"testing"
)

var (
	testAccessKey string
	cheetah       pvCheetah
	testAudioPath string
	transcript    string
)

var processTestParameters = []struct {
	enableAutomaticPunctuation bool
	transcript                 string
}{
	{false, "Mr quilter is the apostle of the middle classes and we are glad to welcome his gospel"},
	{true, "Mr. Quilter is the apostle of the middle classes and we are glad to welcome his gospel."},
}

func TestMain(m *testing.M) {

	flag.StringVar(&testAccessKey, "access_key", "", "AccessKey for testing")
	flag.Parse()

	_, filename, _, _ := runtime.Caller(0)
	dir := filepath.Dir(filename)

	testAudioPath, _ = filepath.Abs(filepath.Join(dir, "../../resources/audio_samples/test.wav"))

	os.Exit(m.Run())
}

func TestVersion(t *testing.T) {
	cheetah = NewCheetah(testAccessKey)
	err := cheetah.Init()
	if err != nil {
		log.Fatalf("Failed to init cheetah with: %v", err)
	}
	defer cheetah.Delete()

	if reflect.TypeOf(Version).Name() != "string" {
		t.Fatal("Unexpected version format.")
	}
	if Version == "" {
		t.Fatal("Failed to get version.")
	}
}

func runProcessTestCase(
	t *testing.T,
	enableAutomaticPunctuation bool,
	expectedTranscript string) {

	cheetah = NewCheetah(testAccessKey)
	cheetah.EnableAutomaticPunctuation = enableAutomaticPunctuation
	err := cheetah.Init()
	if err != nil {
		log.Fatalf("Failed to init cheetah with: %v", err)
	}
	defer cheetah.Delete()

	data, err := ioutil.ReadFile(testAudioPath)
	if err != nil {
		t.Fatalf("Could not read test file: %v", err)
	}
	data = data[44:]

	var res string

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

		res += partial
	}

	final, err := cheetah.Flush()
	if err != nil {
		t.Fatalf("Failed to flush: %v", err)
	}
	res += final

	if res != expectedTranscript {
		t.Fatalf("Expected '%s' got '%s'", expectedTranscript, res)
	}
}

func TestProcess(t *testing.T) {
	for _, test := range processTestParameters {
		runProcessTestCase(t, test.enableAutomaticPunctuation, test.transcript)
	}
}
