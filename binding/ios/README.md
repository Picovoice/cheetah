# Cheetah Binding for iOS

## Cheetah Speech-to-Text Engine

Made in Vancouver, Canada by [Picovoice](https://picovoice.ai)

Cheetah is a streaming on-device speech-to-text engine. Cheetah is:

- Private, All voice processing runs locally.
- Accurate [[1]](https://github.com/Picovoice/speech-to-text-benchmark#results)
- Compact and Computationally-Efficient [[1]](https://github.com/Picovoice/speech-to-text-benchmark#results)
- Cross-Platform:
    - Linux (x86_64)
    - macOS (x86_64, arm64)
    - Windows (x86_64)
    - Raspberry Pi (4, 3)
    - NVIDIA Jetson Nano
    - Android and iOS

## Installation

The Cheetah iOS binding is available via [Cocoapods](https://cocoapods.org/pods/Cheetah-iOS). To import it into your iOS project, add the following line to your Podfile: 

```ruby
pod 'Cheetah-iOS'
```

## AccessKey

The Cheetah SDK requires a valid `AccessKey` at initialization. `AccessKey`s act as your credentials when using Cheetah SDKs.
You can create your `AccessKey` for free. Make sure to keep your `AccessKey` secret.

To obtain your `AccessKey`:
1. Login or Signup for a free account on the [Picovoice Console](https://picovoice.ai/console/).
2. Once logged in, go to the [`AccessKey` tab](https://console.picovoice.ai/access_key) to create one or use an existing `AccessKey`.

## Usage

Create an instance of the engine:

```swift
import Cheetah

let accessKey = "${ACCESS_KEY}" // AccessKey obtained from https://console.picovoice.ai/access_key
let cheetah = Cheetah(accessKey: accessKey, endpointDuration: 1.0)
```

Transcribe an audio:

```swift
func getNextAudioFrame() -> [Int16] {
  // .. get audioFrame
  return audioFrame;
}

while true {
  do {
    let partialTranscript, isEndpoint = try cheetah.process(getNetAudioFrame())
    if isEndpoint {
      let finalTranscript = try cheetah.flush()
    }
  } catch { }
}

```


Replace `${ACCESS_KEY}` with yours obtained from [Picovoice Console]((https://console.picovoice.ai/)). Finally, when done be sure to explicitly release the resources using `cheetah.delete()`.

## Demo App

For example usage refer to our [iOS demo application](/demo/ios).
