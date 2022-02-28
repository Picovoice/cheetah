# Cheetah Speech-to-Text Demos

Made in Vancouver, Canada by [Picovoice](https://picovoice.ai)

## Cheetah

Cheetah is an on-device streaming speech-to-text engine. Cheetah is:

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

## Requirements

- .NET Core 3.1

## Compatibility

- Linux (x86_64)
- macOS (x86_64)
- Windows (x86_64)
- Raspberry Pi:
  - 3 (32 and 64 bit)
  - 4 (32 and 64 bit)
- NVIDIA Jetson Nano

## Installation

Both demos use [Microsoft's .NET Core framework](https://dotnet.microsoft.com/download).

Build with the dotnet CLI:

```console
dotnet build -c MicDemo.Release
dotnet build -c FileDemo.Release
```

## AccessKey

AccessKey is your authentication and authorization token for deploying Picovoice SDKs, including Cheetah. Anyone who is
using Picovoice needs to have a valid AccessKey. You must keep your AccessKey secret. You would need internet
connectivity to validate your AccessKey with Picovoice license servers even though the voice recognition is running 100%
offline.

AccessKey also verifies that your usage is within the limits of your account. Everyone who signs up for
[Picovoice Console](https://console.picovoice.ai/) receives the `Free Tier` usage rights described
[here](https://picovoice.ai/pricing/). If you wish to increase your limits, you can purchase a subscription plan.

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