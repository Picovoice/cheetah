# Cheetah Speech-to-Text Demos

Made in Vancouver, Canada by [Picovoice](https://picovoice.ai)

## Cheetah

Cheetah is an on-device streaming speech-to-text engine. Cheetah is:

- Private; All voice processing runs locally.
- [Accurate](https://picovoice.ai/docs/benchmark/stt/#results)
- [Compact and Computationally-Efficient](https://github.com/Picovoice/speech-to-text-benchmark#rtf)
- Cross-Platform:
  - Linux (x86_64), macOS (x86_64, arm64), and Windows (x86_64)
  - Android and iOS
  - Chrome, Safari, Firefox, and Edge
  - Raspberry Pi (3, 4, 5) and NVIDIA Jetson Nano

## Requirements

- .NET Core 3.1

## Compatibility

- Linux (x86_64)
- macOS (x86_64)
- Windows (x86_64)
- Raspberry Pi:
  - 3 (32 and 64 bit)
  - 4 (32 and 64 bit)
  - 5 (32 and 64 bit)
- NVIDIA Jetson Nano

## Installation

Both demos use [Microsoft's .NET Core framework](https://dotnet.microsoft.com/download).

Build with the dotnet CLI:

```console
dotnet build -c MicDemo.Release
dotnet build -c FileDemo.Release
```

## AccessKey

Cheetah requires a valid Picovoice `AccessKey` at initialization. `AccessKey` acts as your credentials when using Cheetah SDKs.
You can get your `AccessKey` for free. Make sure to keep your `AccessKey` secret.
Signup or Login to [Picovoice Console](https://console.picovoice.ai/) to get your `AccessKey`.

## Usage

NOTE: File path arguments must be absolute paths. The working directory for the following dotnet commands is:

```console
Cheetah/demo/dotnet/CheetahDemo
```

### File Demo

Run the following in the terminal:

```console
dotnet run -c FileDemo.Release -- \
--input_audio_path ${AUDIO_PATH} \
--access_key ${ACCESS_KEY} \
```

Replace `${ACCESS_KEY}` with yours obtained from Picovoice Console and `${AUDIO_PATH}` with a path to an audio file you wish to transcribe.

### Microphone Demo

You need a working microphone connected to your machine for this demo. Run the following in the terminal:

```console
dotnet run -c MicDemo.Release -- \
--access_key ${ACCESS_KEY} \
```

It is possible that the default audio input device is not the one you wish to use. There are a couple
of debugging facilities baked into the demo application to solve this. First, type the following into the console:

```console
dotnet run -c MicDemo.Release -- --show_audio_devices
```

It provides information about various audio input devices on the box. This is an example of the output:

```
index: 0, device name: USB Audio Device
index: 1, device name: MacBook Air Microphone
```

You can use the device index to specify which microphone to use for the demo. For instance, if you want to use the USB Audio Device
in the above example, you can invoke the demo application as below:

```console
dotnet run -c MicDemo.Release -- \
--access_key ${ACCESS_KEY} \
--audio_device_index 0
```
