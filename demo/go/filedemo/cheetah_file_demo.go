// Copyright 2022 Picovoice Inc.
//
// You may not use this file except in compliance with the license. A copy of the license is
// located in the "LICENSE" file accompanying this source.
//
// Unless required by applicable law or agreed to in writing, software distributed under the
// License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either
// express or implied. See the License for the specific language governing permissions and
// limitations under the License.

package main

import (
	"flag"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"time"

	cheetah "github.com/Picovoice/cheetah/binding/go"
	"github.com/go-audio/audio"
	"github.com/go-audio/wav"
)

func main() {
	inputAudioPathArg := flag.String("input_audio_path", "", "Path to input audio file (mono, WAV, 16-bit, 16kHz)")
	accessKeyArg := flag.String("access_key", "", "AccessKey obtained from Picovoice Console (https://console.picovoice.ai/)")
	modelPathArg := flag.String("model_path", "", "Path to Cheetah model file")
	endpointDurationArg := flag.Float64("endpoint_duration", 1, "Duration of endpoint in seconds")
	flag.Parse()

	// validate input audio
	if *inputAudioPathArg == "" {
		log.Fatalln("No input audio file provided.")
	}
	inputAudioPath, _ := filepath.Abs(*inputAudioPathArg)
	f, err := os.Open(inputAudioPath)
	if err != nil {
		log.Fatalf("Unable to find or open input audio at %s\n", inputAudioPath)
	}
	defer f.Close()

	c := cheetah.Cheetah{
		AccessKey: *accessKeyArg,
		ModelPath: *modelPathArg,
		EndpointDuration: float32(*endpointDurationArg),
	}
	defer c.Delete()

	err = c.Init()
	if err != nil {
		log.Fatalf("Failed to initialize: %v\n", err)
	}

	log.Println("Processing audio file...")

	buf := &audio.IntBuffer{
		Format: &audio.Format{
			NumChannels: 1,
			SampleRate:  16000,
		},
		Data:           make([]int, cheetah.FrameLength),
		SourceBitDepth: 16,
	}

	wavFile := wav.NewDecoder(f)
	if !wavFile.IsValidFile() || wavFile.BitDepth != 16 || wavFile.SampleRate != 16000 || wavFile.NumChans != 1 {
		log.Fatal("Invalid WAV file. File must contain mono, 16-bit, 16kHz linearly encoded PCM.")
	}

	shortBuf := make([]int16, cheetah.FrameLength)
	totalRead := 0
	start := time.Now()
	var transcript string

	for err == nil {
		n, err := wavFile.PCMBuffer(buf)
		if err != nil {
			log.Fatal("Failed to read from WAV file.", err)
		}

		if n == 0 {
			break
		}

		for i := range buf.Data {
			shortBuf[i] = int16(buf.Data[i])
		}

		partial, _, err := c.Process(shortBuf)
		if err != nil {
			log.Fatalf("Failed to process: %v\n", err)
		}

		transcript += partial
	}

	final, err := c.Flush()
	if err != nil {
		log.Fatalf("Failed to flush: %v\n", err)
	}
	transcript += final

	log.Println(transcript)

	audioLen := float64(totalRead) / float64(cheetah.SampleRate)
	elapsed := time.Since(start)
	realtimeFactor := audioLen / elapsed.Seconds()
	fmt.Printf("Realtime factor: %fx\n", realtimeFactor)
}