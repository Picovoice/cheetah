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
    - Raspberry Pi (3, 4, 5) and NVIDIA Jetson Nano

## Compatibility

- Rust 1.54+
- Runs on Linux (x86_64), macOS (x86_64, arm64), Windows (x86_64), Raspberry Pi (3, 4, 5), and NVIDIA Jetson Nano.

## Installation

First you will need [Rust and Cargo](https://rustup.rs/) installed on your system.

To add the cheetah library into your app, add `pv_cheetah` to your apps `Cargo.toml` manifest:
```toml
[dependencies]
pv_cheetah = "*"
```

If you prefer to clone the repo and use it locally, first run `copy.sh`.
(**NOTE:** on Windows, Git Bash or another bash shell is required, or you will have to manually copy the libs into the project).
Then you can reference the local binding location:
```toml
[dependencies]
pv_cheetah = { path = "/path/to/rust/binding" }
```

## AccessKey

Cheetah requires a valid Picovoice `AccessKey` at initialization. `AccessKey` acts as your credentials when using Cheetah SDKs.
You can get your `AccessKey` for free. Make sure to keep your `AccessKey` secret.
Signup or Login to [Picovoice Console](https://console.picovoice.ai/) to get your `AccessKey`.

## Usage

NOTE: The working directory for the following `Cargo` commands is:

```console
cheetah/demo/rust/filedemo  # File Demo
cheetah/demo/rust/micdemo   # Microphone Demo
```

### File Demo

Run the following in the terminal:

```console
cargo run --release -- --access_key ${ACCESS_KEY} --input_audio_path ${AUDIO_PATH}
```

Replace `${ACCESS_KEY}` with yours obtained from Picovoice Console and `${AUDIO_PATH}` with a path to an audio file you
wish to transcribe.

### Microphone Demo

You need a working microphone connected to your machine for this demo. Run the following in the terminal:

```console
cargo run --release -- --access_key ${ACCESS_KEY}
```

Replace `${ACCESS_KEY}` with yours obtained from Picovoice Console.
