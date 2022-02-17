# Cheetah Speech-to-Text Engine

Made in Vancouver, Canada by [Picovoice](https://picovoice.ai)

Cheetah is an on-device streaming speech-to-text engine. Cheetah is:

- Private; All voice processing runs locally.
- Accurate [[1]](https://github.com/Picovoice/speech-to-text-benchmark#results)
- Compact and Computationally-Efficient [[2]](https://github.com/Picovoice/speech-to-text-benchmark#results)
- Cross-Platform:
    - Linux (x86_64)
    - macOS (x86_64, arm64)
    - Windows (x86_64)
    - Android
    - iOS
    - Raspberry Pi (4, 3)
    - NVIDIA Jetson Nano

## Compatibility

- go 1.16+
- Runs on Linux (x86_64), macOS (x86_64, arm64), Windows (x86_64), Raspberry Pi (4, 3), and NVIDIA Jetson Nano.

## Installation

```console
go get github.com/Picovoice/cheetah/binding/go
```

## AccessKey

AccessKey is your authentication and authorization token for deploying Picovoice SDKs, including Cheetah. Anyone who is
using Picovoice needs to have a valid AccessKey. You must keep your AccessKey secret. You would need internet
connectivity to validate your AccessKey with Picovoice license servers even though the voice recognition is running 100%
offline.

AccessKey also verifies that your usage is within the limits of your account. Everyone who signs up for
[Picovoice Console](https://console.picovoice.ai/) receives the `Free Tier` usage rights described
[here](https://picovoice.ai/pricing/). If you wish to increase your limits, you can purchase a subscription plan.

### Usage

Create an instance of the engine and transcribe audio:

```go
import . "github.com/Picovoice/cheetah/binding/go"

cheetah = Cheetah{AccessKey: "${ACCESS_KEY}", EndpointDuration: 1.0}
err := cheetah.Init()
if err != nil {
    // handle err init
}

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

Replace `${ACCESS_KEY}` with yours obtained from [Picovoice Console]((https://console.picovoice.ai/)). When done be sure
to explicitly release the resources using `handle.delete()`.

## Demos

Check out the Cheetah Go demos [here](/demo/go).
