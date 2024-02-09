# Cheetah Speech-to-Text Demos

Made in Vancouver, Canada by [Picovoice](https://picovoice.ai)

## Cheetah

Cheetah is an on-device streaming speech-to-text engine. Cheetah is:

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
- Runs on Linux (x86_64), macOS (x86_64, arm64), Windows (x86_64), Raspberry Pi (3, 4, 5), and NVIDIA Jetson Nano.

## Installation

Build the demo jars with Gradle:
```console
cd cheetah/demo/java
./gradlew build
```

## AccessKey

Cheetah requires a valid Picovoice `AccessKey` at initialization. `AccessKey` acts as your credentials when using Cheetah SDKs.
You can get your `AccessKey` for free. Make sure to keep your `AccessKey` secret.
Signup or Login to [Picovoice Console](https://console.picovoice.ai/) to get your `AccessKey`.

## Usage

Navigate to the output directory to use the demos:

```console
cd cheetah/demo/java/build/libs
```

### File Demo

The file demo uses Cheetah to get speech-to-text results from an audio file. This demo is mainly useful for quantitative performance benchmarking against a corpus of audio data.

```console
java -jar cheetah-file-demo.jar -a ${ACCESS_KEY} -i ${AUDIO_PATH}
```

### Microphone Demo

The microphone demo opens an audio stream from a microphone and performs live speech-to-text:

```console
java -jar cheetah-mic-demo.jar -a ${ACCESS_KEY}
```

It is possible that the default audio input device is not the one you wish to use. There are a couple of debugging facilities baked into the demo application to solve this. First, type the following into the console:

```console
java -jar cheetah-mic-demo.jar -sd
```

It provides information about various audio input devices on the box. On a Windows PC, this is the output:

```
Available input devices:

    Device 0: Microphone Array (Realtek(R) Au
    Device 1: Microphone Headset USB
```

You can use the device index to specify which microphone to use for the demo. For instance, if you want to use the Headset microphone in the above example, you can invoke the demo application as below:

```console
java -jar cheetah-mic-demo.jar -a ${ACCESS_KEY} -di 1
```

If the problem persists we suggest storing the recorded audio into a file for inspection. This can be achieved with:

```console
java -jar cheetah-mic-demo.jar -a ${ACCESS_KEY} -di 1 -o ./test.wav
```

If after listening to stored file there is no apparent problem detected, please open an issue.
