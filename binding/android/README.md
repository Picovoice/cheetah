# Cheetah Binding for Android

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

- Android 5.0 (SDK 21+)

## Installation

Cheetah is hosted on Maven Central. To include the package in your Android project, ensure you have
included `mavenCentral()` in your top-level `build.gradle` file and then add the following to your
app's `build.gradle`:

```groovy
dependencies {
    // ...
    implementation 'ai.picovoice:cheetah-android:${VERSION}'
}
```

## AccessKey

Cheetah requires a valid Picovoice `AccessKey` at initialization. `AccessKey` acts as your credentials when using Cheetah SDKs.
You can get your `AccessKey` for free. Make sure to keep your `AccessKey` secret.
Signup or Login to [Picovoice Console](https://console.picovoice.ai/) to get your `AccessKey`.

## Usage

Add the Cheetah model file to your Android application by:

1. Either create a model in [Picovoice Console](https://console.picovoice.ai/) or use the [default model](../../lib/common).
2. Add the model as a bundled resource by placing it under the assets directory of your Android project (`src/main/assets`).

Create an instance of the engine with the Cheetah Builder class by passing in the `accessKey`, `modelPath` and Android app context:

```java
import ai.picovoice.cheetah.*;

final String accessKey = "${ACCESS_KEY}"; // AccessKey provided by Picovoice Console (https://console.picovoice.ai/)
final String modelPath = "${MODEL_PATH}"; // relative path to assets directory or absolute path to file on device
try {
    Cheetah cheetah = new Cheetah.Builder()
        .setAccessKey(accessKey)
        .setModelPath(modelPath)
        .build(appContext);
} catch (CheetahException ex) { }
```

Transcribe audio:

```java
short[] getNextAudioFrame() {
    // .. get audioFrame
    return audioFrame;
}

String transcript = "";

while (true) {
    CheetahTranscript transcriptObj = cheetah.process(getNextAudioFrame());
    transcript += transcriptObj.getTranscript();

    if (transcriptObj.getIsEndpoint()) {
        CheetahTranscript finalTranscriptObj = cheetah.flush();
        transcript += finalTranscriptObj.getTranscript();
    }
}
```

When done, resources have to be released explicitly:

```java
cheetah.delete();
```

## Demo App

For example usage refer to our [Android demo application](../../demo/android).
