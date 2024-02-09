# Cheetah Binding for iOS

## Cheetah Speech-to-Text Engine

Made in Vancouver, Canada by [Picovoice](https://picovoice.ai)

Cheetah is a streaming on-device speech-to-text engine. Cheetah is:

- Private, All voice processing runs locally.
- [Accurate](https://picovoice.ai/docs/benchmark/stt/)
- [Compact and Computationally-Efficient](https://github.com/Picovoice/speech-to-text-benchmark#rtf)
- Cross-Platform:
  - Linux (x86_64), macOS (x86_64, arm64), Windows (x86_64)
  - Android and iOS
  - Chrome, Safari, Firefox, and Edge
  - Raspberry Pi (3, 4, 5) and NVIDIA Jetson Nano

## Installation

<!-- markdown-link-check-disable -->
The Cheetah iOS binding is available via [CocoaPods](https://cocoapods.org/pods/Cheetah-iOS). To import it into your iOS project, add the following line to your Podfile:
<!-- markdown-link-check-enable -->

```ruby
pod 'Cheetah-iOS'
```

## AccessKey

Cheetah requires a valid Picovoice `AccessKey` at initialization. `AccessKey` acts as your credentials when using Cheetah SDKs.
You can get your `AccessKey` for free. Make sure to keep your `AccessKey` secret.
Signup or Login to [Picovoice Console](https://console.picovoice.ai/) to get your `AccessKey`.

## Usage

Add the Cheetah model file in `Xcode`:

1. Create a model in [Picovoice Console](https://console.picovoice.ai/) or get the [default model](../../lib/common/).
2. Add the model as a bundled resource by selecting Build Phases and adding it to `Copy Bundle Resources` step.

Create an instance of the engine:

```swift
import Cheetah

let modelPath = Bundle(for: type(of: self)).path(
        forResource: "${MODEL_FILE}", // Name of the model file name for Cheetah
        ofType: "pv")!

let accessKey = "${ACCESS_KEY}" // AccessKey obtained from https://console.picovoice.ai/access_key
let cheetah = Cheetah(
        accessKey: accessKey,
        modelPath: modelPath,
        endpointDuration: 1.0)
```

Alternatively, you can provide `modelPath` as an absolute path to the model file on device.

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
  } catch let error as CheetahError {
      // handle error
  } catch { }
}

```


Replace `${ACCESS_KEY}` with yours obtained from [Picovoice Console](https://console.picovoice.ai/) and `${MODEL_FILE}` with the name of the Cheetah model file name. Finally, when done be sure to explicitly release the resources using `cheetah.delete()`.

## Running Unit Tests

Copy your `AccessKey` into the `accessKey` variable in [`CheetahAppTestUITests.swift`](./CheetahAppTest/CheetahAppTestUITests/CheetahAppTestUITests.swift). Open `CheetahAppTest.xcworkspace` with XCode and run the tests with `Product > Test`.

## Demo App

For example usage refer to our [iOS demo application](../../demo/ios).
