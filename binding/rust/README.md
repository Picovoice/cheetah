# Cheetah Binding for Rust

## Cheetah Speech-to-Text Engine

Made in Vancouver, Canada by [Picovoice](https://picovoice.ai)

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

Create an instance of the engine and transcribe audio:

```rust
use cheetah::CheetahBuilder;

fn next_audio_frame() -> Vec<i16> {
  // get audio frame
}

let access_key = "${ACCESS_KEY}"; // AccessKey obtained from Picovoice Console (https://console.picovoice.ai/)
let cheetah: Cheetah = CheetahBuilder::new().access_key(access_key).init().expect("Unable to create Cheetah");

if let Ok(cheetahTranscript) = cheetah.process(&next_audio_frame()) {
  println!("{}", cheetahTranscript.transcript)
  if cheetahTranscript.is_endpoint {
    if let Ok(cheetahTranscript) = cheetah.flush() {
      println!("{}", cheetahTranscript.transcript)
    }
  }
}
```

Replace `${ACCESS_KEY}` with yours obtained from [Picovoice Console](https://console.picovoice.ai/).

The model file contains the parameters for the Cheetah engine. You may create bespoke language models using [Picovoice Console](https://console.picovoice.ai/) and then pass in the relevant file.

## Demos

The [Cheetah Rust demo project](https://github.com/Picovoice/cheetah/tree/master/demo/rust) is a Rust console app that allows for processing real-time audio (i.e. microphone) and files using Cheetah.
