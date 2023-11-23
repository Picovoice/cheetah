// Copyright 2022-2023 Picovoice Inc.
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
	"os/signal"
	"path/filepath"

	cheetah "github.com/Picovoice/cheetah/binding/go/v2"
	pvrecorder "github.com/Picovoice/pvrecorder/binding/go"
	"github.com/go-audio/wav"
)

func main() {
	accessKeyArg := flag.String("access_key", "", "AccessKey obtained from Picovoice Console (https://console.picovoice.ai/)")
	libraryPathArg := flag.String("library_path", "", "Path to Cheetah's dynamic library file")
	modelPathArg := flag.String("model_path", "", "Path to Cheetah model file")
	endpointDurationArg := flag.Float64("endpoint_duration", 1, "Duration of endpoint in seconds")
	disableAutomaticPunctuationArg := flag.Bool("disable_automatic_punctuation", true, "Disable automatic punctuation")
	audioDeviceIndex := flag.Int("audio_device_index", -1, "Index of capture device to use.")
	outputPathArg := flag.String("output_path", "", "Path to recorded audio (for debugging)")
	showAudioDevices := flag.Bool("show_audio_devices", false, "Display all available capture devices")
	flag.Parse()

	if *showAudioDevices {
		printAudioDevices()
		return
	}

	c := cheetah.NewCheetah(*accessKeyArg)
	c.EndpointDuration = float32(*endpointDurationArg)
	c.EnableAutomaticPunctuation = !*disableAutomaticPunctuationArg

	// validate library path
	if *libraryPathArg != "" {
		libraryPath, _ := filepath.Abs(*libraryPathArg)
		if _, err := os.Stat(libraryPath); os.IsNotExist(err) {
			log.Fatalf("Could not find library file at %s", libraryPath)
		}

		c.LibraryPath = libraryPath
	}

	// validate model
	if *modelPathArg != "" {
		modelPath, _ := filepath.Abs(*modelPathArg)
		if _, err := os.Stat(modelPath); os.IsNotExist(err) {
			log.Fatalf("Could not find model file at %s", modelPath)
		}

		c.ModelPath = modelPath
	}

	err := c.Init()
	if err != nil {
		log.Fatal(err)
	}

	defer func() {
		err := c.Delete()
		if err != nil {
			log.Fatalf("Failed to release resources: %s", err)
		}
	}()

	var outputWav *wav.Encoder
	if *outputPathArg != "" {
		outputFilePath, _ := filepath.Abs(*outputPathArg)
		outputFile, err := os.Create(outputFilePath)
		if err != nil {
			log.Fatalf("Failed to create output audio at path %s", outputFilePath)
		}
		defer outputFile.Close()

		outputWav = wav.NewEncoder(outputFile, cheetah.SampleRate, 16, 1, 1)
		defer outputWav.Close()
	}

	recorder := pvrecorder.NewPvRecorder(cheetah.FrameLength)
	recorder.DeviceIndex = *audioDeviceIndex

	if err := recorder.Init(); err != nil {
		log.Fatalf("Error: %s.\n", err.Error())
	}
	defer recorder.Delete()

	log.Printf("Using device: %s", recorder.GetSelectedDevice())

	if err := recorder.Start(); err != nil {
		log.Fatalf("Error: %s.\n", err.Error())
	}

	log.Printf("Listening...")

	signalCh := make(chan os.Signal, 1)
	waitCh := make(chan struct{})
	signal.Notify(signalCh, os.Interrupt)

	go func() {
		<-signalCh
		close(waitCh)
	}()

waitLoop:
	for {
		select {
		case <-waitCh:
			log.Println("Stopping...")
			break waitLoop
		default:
			pcm, err := recorder.Read()
			if err != nil {
				log.Fatalf("Error: %v.\n", err)
			}

			partial, isEndpoint, err := c.Process(pcm)
			if err != nil {
				log.Fatalf("Process error: %v\n", err)
			}
			fmt.Print(partial)

			if isEndpoint {
				final, err := c.Flush()
				if err != nil {
					log.Fatalf("Flush error: %v\n", err)
				}
				if len(final) > 0 {
					fmt.Println(final)
				}
			}

			// write to debug file
			if outputWav != nil {
				for outputBufIndex := range pcm {
					err := outputWav.WriteFrame(pcm[outputBufIndex])
					if err != nil {
						log.Fatal(err)
					}
				}
			}
		}
	}
}

func printAudioDevices() {
	if devices, err := pvrecorder.GetAvailableDevices(); err != nil {
		log.Fatalf("Error: %s.\n", err.Error())
	} else {
		for i, device := range devices {
			log.Printf("index: %d, device name: %s\n", i, device)
		}
	}
}
