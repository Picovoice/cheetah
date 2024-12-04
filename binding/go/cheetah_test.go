// Copyright 2022-2024 Picovoice Inc.
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
	"encoding/json"
	"flag"
	"io/ioutil"
	"log"
	"os"
	"path/filepath"
	"reflect"
	"strings"
	"testing"
)

type LanguageTests struct {
	language                   string
	testAudioFile              string
	transcript                 string
	punctuations               []string
	errorRate                  float32
}

var (
	testAccessKey         string
	cheetah               Cheetah
	languageTests		  []LanguageTests
)

func TestMain(m *testing.M) {

	flag.StringVar(&testAccessKey, "access_key", "", "AccessKey for testing")
	flag.Parse()

	languageTests = loadTestData()
	os.Exit(m.Run())
}

func appendLanguage(s string, language string) string {
	if language == "en" {
		return s
	} else {
		return s + "_" + language
	}
}

func loadTestData() []LanguageTests {
	content, err := ioutil.ReadFile("../../resources/.test/test_data.json")
	if err != nil {
		log.Fatalf("Could not read test data json: %v", err)
	}

	var testData struct {
		Tests struct {
			LanguageTests []struct {
				Language                  string  `json:"language"`
				AudioFile                 string  `json:"audio_file"`
				Transcript                string  `json:"transcript"`
				Punctuations 			  []string  `json:"punctuations"`
				ErrorRate                 float32 `json:"error_rate"`
			} `json:"language_tests"`
		} `json:"tests"`
	}
	err = json.Unmarshal(content, &testData)
	if err != nil {
		log.Fatalf("Could not decode test data json: %v", err)
	}

	for _, x := range testData.Tests.LanguageTests {
		languageTestParameters := LanguageTests{
			language:                  x.Language,
			testAudioFile:             x.AudioFile,
			transcript:                x.Transcript,
			punctuations: 			   x.Punctuations,
			errorRate:                 x.ErrorRate,
		}

		languageTests = append(languageTests, languageTestParameters)
	}

	return languageTests
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

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}

func levenshteinDistance(transcriptWords, referenceWords []string) int {
	m, n := len(transcriptWords), len(referenceWords)
	dp := make([][]int, m+1)
	for i := range dp {
		dp[i] = make([]int, n+1)
	}

	for i := 0; i <= m; i++ {
		dp[i][0] = i
	}
	for j := 0; j <= n; j++ {
		dp[0][j] = j
	}

	for i := 1; i <= m; i++ {
		for j := 1; j <= n; j++ {
			cost := 0
			if !strings.EqualFold(transcriptWords[i-1], referenceWords[j-1]) {
				cost = 1
			}
			dp[i][j] = min(dp[i-1][j]+1,
				min(dp[i][j-1]+1,
					dp[i-1][j-1]+cost))
		}
	}
	return dp[m][n]
}

func getWordErrorRate(transcript, reference string) float32 {
	transcriptWords := strings.Fields(transcript)
	referenceWords := strings.Fields(reference)

	dist := levenshteinDistance(transcriptWords, referenceWords)
	return float32(dist) / float32(len(referenceWords))
}

func runProcessTestCase(
	t *testing.T,
	language string,
	testAudioFile string,
	referenceTranscript string,
	punctuations []string,
	targetErrorRate float32,
	enableAutomaticPunctuation bool) {

	modelPath, _ := filepath.Abs(filepath.Join("../../lib/common", appendLanguage("cheetah_params", language)+".pv"))

	cheetah = NewCheetah(testAccessKey)
	cheetah.ModelPath = modelPath
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

	var normalizedTranscript = referenceTranscript
	if !enableAutomaticPunctuation {
		for _, punctuation := range punctuations {
			normalizedTranscript = strings.ReplaceAll(normalizedTranscript, punctuation, "")
		}
	}

	errorRate := getWordErrorRate(transcript, normalizedTranscript)
	if errorRate >= targetErrorRate {
		t.Fatalf("Expected '%f' got '%f'", targetErrorRate, errorRate)
	}
}

func TestProcess(t *testing.T) {
	for _, test := range languageTests {
		runProcessTestCase(t, test.language, test.testAudioFile, test.transcript, test.punctuations, test.errorRate, false)
	}
}

func TestProcessWithPunctuation(t *testing.T) {
	for _, test := range languageTests {
		runProcessTestCase(t, test.language, test.testAudioFile, test.transcript, test.punctuations, test.errorRate, true)
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
