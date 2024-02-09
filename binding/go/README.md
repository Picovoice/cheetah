# Cheetah Binding for Go

## Cheetah Speech-to-Text Engine

Made in Vancouver, Canada by [Picovoice](https://picovoice.ai)

Cheetah is an on-device streaming speech-to-text engine. Cheetah is:

- Private; All voice processing runs locally.
- Accurate [[1]](https://picovoice.ai/docs/benchmark/stt/#results)
- Compact and Computationally-Efficient [[2]](https://github.com/Picovoice/speech-to-text-benchmark#rtf)
- Cross-Platform:
  - Linux (x86_64), macOS (x86_64, arm64), and Windows (x86_64)
  - Android and iOS
  - Chrome, Safari, Firefox, and Edge
  - Raspberry Pi (3, 4, 5) and NVIDIA Jetson Nano

## Compatibility

- go 1.16+
- Runs on Linux (x86_64), macOS (x86_64, arm64), Windows (x86_64), Raspberry Pi (3, 4, 5), and NVIDIA Jetson Nano.
- **Windows**: The Go binding requires `cgo`, which means that you need to install a gcc compiler like [Mingw](http://mingw-w64.org/) to build it properly.
  - Go versions less than `1.20` requires `gcc` version `11` or lower.

## Installation

```console
go get github.com/Picovoice/cheetah/binding/go
```

## AccessKey

Cheetah requires a valid Picovoice `AccessKey` at initialization. `AccessKey` acts as your credentials when using Cheetah SDKs.
You can get your `AccessKey` for free. Make sure to keep your `AccessKey` secret.
Signup or Login to [Picovoice Console](https://console.picovoice.ai/) to get your `AccessKey`.

### Usage

Create an instance of the engine and transcribe audio:

```go
import . "github.com/Picovoice/cheetah/binding/go"

cheetah = NewCheetah{AccessKey: "${ACCESS_KEY}"}
err := cheetah.Init()
if err != nil {
    // handle err init
}
defer cheetah.Delete()

func getNextFrameAudio() []int16{
    // get audio frame
}

for {
  partialTranscript, isEndpoint, err = cheetah.Process(getNextFrameAudio())
  if isEndpoint {
    finalTranscript, err = cheetah.Flush()
  }
}
```

Replace `${ACCESS_KEY}` with yours obtained from [Picovoice Console](https://console.picovoice.ai/). When done be sure
to explicitly release the resources using `cheetah.Delete()`.

## Demos

Check out the Cheetah Go demos [here](https://github.com/Picovoice/cheetah/tree/master/demo/go).
