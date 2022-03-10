# Cheetah Binding for iOS

## Cheetah Speech-to-Text Engine

Made in Vancouver, Canada by [Picovoice](https://picovoice.ai)

Cheetah is an on-device speech-to-text engine. Cheetah is:

- Private; All voice processing runs locally.
- Accurate [[1]](https://github.com/Picovoice/speech-to-text-benchmark#results)
- Compact and Computationally-Efficient [[2]](https://github.com/Picovoice/speech-to-text-benchmark#rtf)
- Cross-Platform:
  - Linux (x86_64)
  - macOS (x86_64, arm64)
  - Windows (x86_64)
  - Android
  - iOS
  - Raspberry Pi (4, 3)
  - NVIDIA Jetson Nano

## Compatibility

This binding is for running Cheetah on **React Native 0.62.2+** on the following platforms:

- Android 4.4+ (SDK 19+)
- iOS 10.0+

## Installation

To start install be sure you have installed yarn and CocoaPods. Then add these two native modules to your react-native project.

```console
yarn add @picovoice/cheetah-react-native
```
or
```console
npm i @picovoice/cheetah-react-native --save
```

Link the iOS package

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

## Adding custom Cheetah models

### Android

Add the Cheetah model file to your Android application by:

1. Either creating a model in [Picovoice Console](https://console.picovoice.ai/) or get the default model in [/lib/common/cheetah_params.pv](/lib/common/cheetah_params.pv).
2. Add the model as a bundled resource by placing it under the [`assets`](./android/src/main/assets/) directory of your Android application.

### iOS

Open [`Cheetah.xcodeproj`](./ios/Cheetah.xcodeproj) in `Xcode` and add the Cheetah model file in `Xcode` by:

1. Either creating a model in [Picovoice CAT Console](https://picovoice.ai/cat/) or get the default model in [/lib/common/cheetah_params.pv](/lib/common/cheetah_params.pv).
2. Add the model as a bundled resource by selecting Build Phases and adding it to Copy Bundle Resources step.

## Usage

Transcribe audio:

```typescript
import {Cheetah, CheetahErrors} from '@picovoice/cheetah-react-native';

const getAudioFrame = () => {
  // get audio frames
}

try {
  while (1) {
    const cheetah = await Cheetah.create("${ACCESS_KEY}", "${MODEL_FILE}")
    const [partialTranscript, isEndpoint] = await cheetah.process(getAudioFrame())
    if (isEndpoint) {
      const finalTranscript = await cheetah.flush()
    }
  }
} catch (err: any) {
  if (err instanceof CheetahErrors) {
    // handle error
  }
}
```

Replace `${ACCESS_KEY}` with yours obtained from [Picovoice Console]((https://console.picovoice.ai/)) and `${MODEL_FILE}`
with the name of the Cheetah model file name.
Finally, when done be sure to explicitly release the resources using `cheetah.delete()`.

## Demo App

For example usage refer to our [React Native demo application](/demo/react-native).
