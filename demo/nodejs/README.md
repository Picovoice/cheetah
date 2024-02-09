# Cheetah Speech-to-Text Demos

Made in Vancouver, Canada by [Picovoice](https://picovoice.ai)

## Cheetah

Cheetah is an on-device streaming speech-to-text engine. Cheetah is:

- Private; All voice processing runs locally.
- Accurate [[1]](https://picovoice.ai/docs/benchmark/stt/#results)
- Compact and Computationally-Efficient [[2]](https://github.com/Picovoice/speech-to-text-benchmark#rtf)
- Cross-Platform:
    - Linux (x86_64), macOS (x86_64, arm64), and Windows (x86_64)
    - Android and iOS
    - Chrome, Safari, Firefox, and Edge
    - Raspberry Pi (3, 4, 5) and NVIDIA Jetson Nano

## Compatibility

- Node.js 12+
- Runs on Linux (x86_64), macOS (x86_64, arm64), Windows (x86_64), Raspberry Pi (3, 4, 5), and NVIDIA Jetson Nano.

## Installation

```console
npm install -g @picovoice/cheetah-node-demo
```

## AccessKey

Cheetah requires a valid Picovoice `AccessKey` at initialization. `AccessKey` acts as your credentials when using Cheetah SDKs.
You can get your `AccessKey` for free. Make sure to keep your `AccessKey` secret.
Signup or Login to [Picovoice Console](https://console.picovoice.ai/) to get your `AccessKey`.

## Usage

### File Demo

Run the following in the terminal:

```console
cheetah_demo_file --access_key ${ACCESS_KEY} --input_audio_file_path ${AUDIO_PATH}
```

Replace `${ACCESS_KEY}` with yours obtained from Picovoice Console and `${AUDIO_PATH}` with a path to an audio file you
wish to transcribe.

### Microphone Demo

You need a working microphone connected to your machine for this demo. Run the following in the terminal:

```console
cheetah_demo_mic --access_key ${ACCESS_KEY}
```

Replace `${ACCESS_KEY}` with yours obtained from Picovoice Console.

Now start recording and when done press `ENTER` key.
