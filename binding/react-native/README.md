# Cheetah Binding for React Native

## Cheetah Speech-to-Text Engine

Made in Vancouver, Canada by [Picovoice](https://picovoice.ai)

Cheetah is an on-device speech-to-text engine. Cheetah is:

- Private; All voice processing runs locally.
- [Accurate](https://picovoice.ai/docs/benchmark/stt/)
- [Compact and Computationally-Efficient](https://github.com/Picovoice/speech-to-text-benchmark#rtf)
- Cross-Platform:
  - Linux (x86_64), macOS (x86_64, arm64), Windows (x86_64)
  - Android and iOS
  - Chrome, Safari, Firefox, and Edge
  - Raspberry Pi (3, 4, 5) and NVIDIA Jetson Nano

## Compatibility

This binding is for running Cheetah on **React Native 0.62.2+** on the following platforms:

- Android 5.0+ (SDK 21+)
- iOS 11.0+

## Installation

To start install, ensure you have installed yarn and CocoaPods. Then, add the following native modules to your react-native project:

```console
yarn add @picovoice/cheetah-react-native
```
or
```console
npm i @picovoice/cheetah-react-native --save
```

Link the iOS package:

```console
cd ios && pod install && cd ..
```

**NOTE**: Due to a limitation in React Native CLI auto-linking, the native module cannot be included as a
transitive dependency. If you are creating a module that depends on cheetah-react-native,
you will have to list these as peer dependencies and require developers to install it alongside.

## AccessKey

Cheetah requires a valid Picovoice `AccessKey` at initialization. `AccessKey` acts as your credentials when using Cheetah SDKs.
You can get your `AccessKey` for free. Make sure to keep your `AccessKey` secret.
Signup or Login to [Picovoice Console](https://console.picovoice.ai/) to get your `AccessKey`.

## Adding Cheetah Models

Create a custom model using the [Picovoice Console](https://console.picovoice.ai/) or use the [default model](https://github.com/Picovoice/cheetah/tree/master/lib/common/).

### Android

To add a Leopard model file to your Android application, add the file as a bundled resource by placing it under the `assets` directory of your Android application.

### iOS

To add a Leopard model file to your iOS application, add the file as a bundled resource by selecting Build Phases in `Xcode` and adding it to the `Copy Bundle Resources` step.

## Usage

Create an instance of `Cheetah`:

```typescript
import {Cheetah, CheetahErrors} from '@picovoice/cheetah-react-native';

const accessKey = "${ACCESS_KEY}" // AccessKey obtained from Picovoice Console (https://console.picovoice.ai/)
const modelPath = "${CHEETAH_MODEL_PATH}" // path relative to the assets folder or absolute path to file on device

try {
    const cheetah = await Cheetah.create(accessKey, modelPath)
} catch (err: any) {
  if (err instanceof CheetahErrors) {
    // handle error
  }
}
```

Transcribe real-time audio:

```typescript
const getAudioFrame = () => {
  // get audio frames
}

let transcript = ""
try {
  while (1) {
    const partialResult = await cheetah.process(getAudioFrame())
    transcript += partialResult.transcript
    if (partialResult.isEndpoint) {
      const finalResult = await cheetah.flush()
      transcript += finalTranscript.transcript
    }
  }
} catch (err: any) {
  if (err instanceof CheetahErrors) {
    // handle error
  }
}
```

Finally, when done be sure to explicitly release the resources using `cheetah.delete()`.

## Demo App

For example usage refer to our [React Native demo application](https://github.com/Picovoice/cheetah/tree/master/demo/react-native).
