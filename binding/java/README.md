# Cheetah Binding for Java

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

The Cheetah SDK requires a valid `AccessKey` at initialization. `AccessKey`s act as your credentials when using Cheetah SDKs.
You can create your `AccessKey` for free. Make sure to keep your `AccessKey` secret.

To obtain your `AccessKey`:
1. Login or Signup for a free account on the [Picovoice Console](https://picovoice.ai/console/).
2. Once logged in, go to the [`AccessKey` tab](https://console.picovoice.ai/access_key) to create one or use an existing `AccessKey`.

## Usage

Create an instance of the engine with the Cheetah Builder class:

```java
import ai.picovoice.cheetah.*;

final String accessKey = "..."; // AccessKey provided by Picovoice Console (https://picovoice.ai/console/)

try {
    Cheetah cheetah = new Cheetah.Builder().setAccessKey(accessKey).build();
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

For example usage refer to our [Java demos](/demo/java).
