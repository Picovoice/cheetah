# Cheetah Speech-to-Text Demos

Made in Vancouver, Canada by [Picovoice](https://picovoice.ai)

## Cheetah

Cheetah is an on-device streaming speech-to-text engine. Cheetah is:

- Private; All voice processing runs locally.
- [Accurate](https://picovoice.ai/docs/benchmark/stt/)
- [Compact and Computationally-Efficient](https://github.com/Picovoice/speech-to-text-benchmark#rtf)
- Cross-Platform:
    - Linux (x86_64), macOS (x86_64, arm64), and Windows (x86_64)
    - Android and iOS
    - Chrome, Safari, Firefox, and Edge
    - Raspberry Pi (3, 4, 5)

## Compatibility

- Python 3.8+
- Runs on Linux (x86_64), macOS (x86_64, arm64), Windows (x86_64), and Raspberry Pi (3, 4, 5).

## Installation

```console
pip3 install pvcheetahdemo
```

## AccessKey

Cheetah requires a valid Picovoice `AccessKey` at initialization. `AccessKey` acts as your credentials when using Cheetah SDKs.
You can get your `AccessKey` for free. Make sure to keep your `AccessKey` secret.
Signup or Login to [Picovoice Console](https://console.picovoice.ai/) to get your `AccessKey`.

## Usage

### Microphone Demo

You need a working microphone connected to your machine for this demo. Run the following in the terminal:

```console
cheetah_demo_mic --access_key ${ACCESS_KEY}
```

Replace `${ACCESS_KEY}` with yours obtained from Picovoice Console.

### File Demo

Run the following in the terminal:

```console
cheetah_demo_file --access_key ${ACCESS_KEY} --wav_paths ${WAV_PATH}
```

Replace `${ACCESS_KEY}` with yours obtained from Picovoice Console and `${WAV_PATH}` with a path to a compatible
(single-channel, 16 kHz, 16-bit PCM) wav file you wish to transcribe.
