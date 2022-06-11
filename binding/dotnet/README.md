# Cheetah Binding for .NET

## Cheetah Speech-to-Text Engine

Made in Vancouver, Canada by [Picovoice](https://picovoice.ai)

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

- .NET 6.0

## Compatibility

Platform compatible with .NET Framework 4.6.1+:

- Windows (x86_64)

Platforms compatible with .NET Core 2.0+:

- Linux (x86_64)
- macOS (x86_64)
- Windows (x86_64)

Platforms compatible with .NET Core 3.1+:

- Raspberry Pi:
  - 3 (32 and 64 bit)
  - 4 (32 and 64 bit)
- NVIDIA Jetson Nano

Platform compatible with .NET 6.0+:

- macOS (arm64)

## Installation

You can install the latest version of Cheetah by getting the latest [Cheetah Nuget package](https://www.nuget.org/packages/Picovoice.Cheetah/) in Visual Studio or using the .NET CLI:

```console
dotnet add package Picovoice.Cheetah
```

## AccessKey

Cheetah requires a valid Picovoice `AccessKey` at initialization. `AccessKey` acts as your credentials when using Cheetah SDKs.
You can get your `AccessKey` for free. Make sure to keep your `AccessKey` secret.
Signup or Login to [Picovoice Console](https://console.picovoice.ai/) to get your `AccessKey`.

## Usage

Create an instance of the engine and transcribe an audio file:

```csharp
using Pv;

const string accessKey = "${ACCESS_KEY}";

Cheetah handle = Cheetah.Create(accessKey);
```

Replace `${ACCESS_KEY}` with yours obtained from [Picovoice Console]((https://console.picovoice.ai/)).

When initialized, the valid sample rate is given by `handle.SampleRate`. Expected frame length (number of audio samples in an input array) is `handle.FrameLength`. The engine accepts 16-bit linearly-encoded PCM and operates on single-channel audio.

```csharp
short[] GetNextAudioFrame()
{
    // .. get audioFrame
    return audioFrame;
}

string transcript = "";

while(true)
{
    CheetahTranscript transcriptObj = handle.Process(GetNextAudioFrame());
    transcript += transcriptObj.Transcript;

    if (transcriptObj.IsEndpoint) {
        CheetahTranscript finalTranscriptObj = handle.Flush();
        transcript += finalTranscriptObj.Transcript;
    }
}
```

Cheetah will have its resources freed by the garbage collector, but to have resources freed immediately after use, wrap it in a using statement:

```csharp
using(Cheetah handle = Cheetah.Create(accessKey))
{
    // .. Cheetah usage here
}
```

The model file contains the parameters for the Cheetah engine. You may create bespoke language models using [Picovoice Console](https://console.picovoice.ai/) and then pass in the relevant file.

```csharp
using Pv;

const string accessKey = "${ACCESS_KEY}";
string modelPath = "/absolute/path/to/model.pv";

Cheetah handle = Cheetah.Create(accessKey, modelPath);
```

## Demos

The [Cheetah dotnet demo project](/demo/dotnet) is a .NET Core console app that allows for processing real-time audio (i.e. microphone) and files using Cheetah.
