# Cheetah Binding for Node.js

Made in Vancouver, Canada by [Picovoice](https://picovoice.ai)

Cheetah is an on-device streaming speech-to-text engine. Cheetah is:

- Private; All voice processing runs locally.
- Accurate [[1]](https://picovoice.ai/docs/benchmark/stt/#results)
- Compact and Computationally-Efficient [[2]](https://github.com/Picovoice/speech-to-text-benchmark#rtf)
- Cross-Platform:
    - Linux (x86_64), macOS (x86_64, arm64), and Windows (x86_64)
    - Android and iOS
    - Chrome, Safari, Firefox, and Edge
    - Raspberry Pi (4, 3) and NVIDIA Jetson Nano

## Compatibility

- Node.js 12+
- Runs on Linux (x86_64), macOS (x86_64, arm64), Windows (x86_64), Raspberry Pi (4, 3), and NVIDIA Jetson Nano.

## Installation

```console
npm install @picovoice/cheetah-node
```

## AccessKey

Cheetah requires a valid Picovoice `AccessKey` at initialization. `AccessKey` acts as your credentials when using Cheetah SDKs.
You can get your `AccessKey` for free. Make sure to keep your `AccessKey` secret.
Signup or Login to [Picovoice Console](https://console.picovoice.ai/) to get your `AccessKey`.

### Usage

Create an instance of the engine and transcribe audio :

```javascript
const Cheetah = require("@picovoice/cheetah-node");

const accessKey = "${ACCESS_KEY}"; // Obtained from the Picovoice Console (https://console.picovoice.ai/)
const endpointDurationSec = 2.0;
const handle = new Cheetah(accessKey);

function getNextAudioFrame() {
  // ...
  return audioFrame;
}

while (true) {
  const audioFrame = getNextAudioFrame();
  const [partialTranscript, isEndpoint] = handle.process(audioFrame);
  if (isEndpoint) {
    finalTranscript = handle.flush()
  }
}
```

Replace `${ACCESS_KEY}` with yours obtained from [Picovoice Console](https://console.picovoice.ai/). Finally, when done be sure to explicitly release the resources using
`handle.release()`.

## Demos

[Cheetah Node.js demo package](https://www.npmjs.com/package/@picovoice/cheetah-node-demo) provides command-line utilities for processing audio using cheetah.
