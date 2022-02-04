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
    - Android
    - iOS
    - Raspberry Pi (4, 3)
    - NVIDIA Jetson Nano

## Installation

The Cheetah iOS binding is available via [CocoaPods](https://cocoapods.org/pods/Cheetah-iOS). To import it into your iOS project, add the following line to your Podfile: 

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

Add the Cheetah model file in `Xcode` by:

1. Either creating a model in [Picovoice CAT Console](https://picovoice.ai/cat/) or get the default model in [/lib/common/cheetah_params.pv](/lib/common/cheetah_params.pv).
2. Add the model as a bundled resource by selecting Build Phases and adding it to Copy Bundle Resources step.

Create an instance of the engine:

```swift
import Cheetah

let modelPath = Bundle(for: type(of: self)).path(
        forResource: "${MODEL_FILE}", // Name of the model file name for Cheetah
        ofType: "pv")!

let accessKey = "${ACCESS_KEY}" // AccessKey obtained from https://console.picovoice.ai/access_key
let cheetah = Cheetah(accessKey: accessKey, modelPath: modelPath, endpointDuration: 1.0)
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
  } catch let error as CheetahError { 
      // handle error
  } catch { }
}

```


Replace `${ACCESS_KEY}` with yours obtained from [Picovoice Console]((https://console.picovoice.ai/)) and `${MODEL_FILE}` with the name of the Cheetah model file name. Finally, when done be sure to explicitly release the resources using `cheetah.delete()`.

## Demo App

For example usage refer to our [iOS demo application](/demo/ios).
