# Cheetah Binding for Java

## Cheetah Speech-to-Text Engine

Made in Vancouver, Canada by [Picovoice](https://picovoice.ai)

Cheetah is an on-device speech-to-text engine. Cheetah is:

- Private, All voice processing runs locally.
- [Accurate](https://picovoice.ai/docs/benchmark/stt/)
- [Compact and Computationally-Efficient](https://github.com/Picovoice/speech-to-text-benchmark#rtf)
- Cross-Platform:
  - Linux (x86_64), macOS (x86_64, arm64), Windows (x86_64)
  - Android and iOS
  - Chrome, Safari, Firefox, and Edge
  - Raspberry Pi (3, 4, 5) and NVIDIA Jetson Nano

## Compatibility

- Java 11+

## Installation

The latest Java bindings are available from the Maven Central Repository at:

```console
ai.picovoice:cheetah-java:${version}
```

If you're using Gradle for your Java project, include the following line in your `build.gradle` file to add Cheetah:
```console
implementation 'ai.picovoice:cheetah-java:${version}'
```

If you're using IntelliJ, open the Project Structure dialog (`File > Project Structure`) and go to the `Libraries` section.
Click the plus button at the top to add a new project library and select `From Maven...`. Search for `ai.picovoice:cheetah-java`
in the search box and add the latest version to your project.

## AccessKey

Cheetah requires a valid Picovoice `AccessKey` at initialization. `AccessKey` acts as your credentials when using Cheetah SDKs.
You can get your `AccessKey` for free. Make sure to keep your `AccessKey` secret.
Signup or Login to [Picovoice Console](https://console.picovoice.ai/) to get your `AccessKey`.

## Usage

Create an instance of the engine with the Cheetah Builder class:

```java
import ai.picovoice.cheetah.*;

final String accessKey = "..."; // AccessKey provided by Picovoice Console (https://console.picovoice.ai/)

try {
    Cheetah cheetah = new Cheetah.Builder()
        .setAccessKey(accessKey)
        .build();
} catch (CheetahException ex) { }
```

Transcribe audio:

```java
short[] getNextAudioFrame() {
    // .. get audioFrame
    return audioFrame;
}

String transcript = "";

while true {
    CheetahTranscript transcriptObj = cheetah.process(getNextAudioFrame());
    transcript += transcriptObj.getTranscript();

    if (transcriptObj.getIsEndpoint()) {
        CheetahTranscript finalTranscriptObj = cheetah.flush();
        transcript += finalTranscriptObj.getTranscript();
    }
}
```

When done resources have to be released explicitly:

```java
cheetah.delete();
```

## Demo App

For example usage refer to our [Java demos](../../demo/java).
