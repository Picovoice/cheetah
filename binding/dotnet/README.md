# Cheetah Binding for .NET

## Cheetah Speech-to-Text Engine

Made in Vancouver, Canada by [Picovoice](https://picovoice.ai)

Cheetah is an on-device streaming speech-to-text engine. Cheetah is:

- Private; All voice processing runs locally.
- [Accurate](https://picovoice.ai/docs/benchmark/stt/#results)
- [Compact and Computationally-Efficient](https://github.com/Picovoice/speech-to-text-benchmark#rtf)
- Cross-Platform:
  - Linux (x86_64), macOS (x86_64, arm64), and Windows (x86_64)
  - Android and iOS
  - Chrome, Safari, Firefox, and Edge
  - Raspberry Pi (3, 4, 5)

## Requirements

- .NET 8.0

## Compatibility

Platform compatible with .NET Framework 4.6.1+:

- Windows (x86_64)

Platforms compatible with .NET Core 2.0+:

- Linux (x86_64)
- macOS (x86_64)
- Windows (x86_64)

Platforms compatible with .NET Core 3.0+:

- Raspberry Pi:
  - 3 (32 and 64 bit)
  - 4 (32 and 64 bit)
  - 5 (32 and 64 bit)

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

Replace `${ACCESS_KEY}` with yours obtained from [Picovoice Console](https://console.picovoice.ai/).

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

### Language Model

The Cheetah .NET SDK comes preloaded with a default English language model (`.pv` file).
Default models for other supported languages can be found in [lib/common](../../lib/common).

Create custom language models using the [Picovoice Console](https://console.picovoice.ai/). Here you can train
language models with custom vocabulary and boost words in the existing vocabulary.

```csharp
using Pv;

const string accessKey = "${ACCESS_KEY}";
string modelPath = "/absolute/path/to/model.pv";

Cheetah handle = Cheetah.Create(accessKey, modelPath);
```

## Demos

The [Cheetah dotnet demo project](https://github.com/Picovoice/cheetah/tree/master/demo/dotnet) is a .NET Core console app that allows for processing real-time audio (i.e. microphone) and files using Cheetah.
