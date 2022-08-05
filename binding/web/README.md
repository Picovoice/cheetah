# Cheetah Binding for Web

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
    - Raspberry Pi (4, 3) and NVIDIA Jetson Nano

## Compatibility

- Chrome / Edge
- Firefox
- Safari

## Installation

### Package

Using `Yarn`:

```console
yarn add @picovoice/cheetah-web
```

or using `npm`:

```console
npm install --save @picovoice/cheetah-web
```

### AccessKey

Cheetah requires a valid Picovoice `AccessKey` at initialization. `AccessKey` acts as your credentials when using Cheetah SDKs.
You can get your `AccessKey` for free. Make sure to keep your `AccessKey` secret.
Signup or Login to [Picovoice Console](https://console.picovoice.ai/) to get your `AccessKey`.

### Usage

For the web packages, there are two methods to initialize Cheetah.

#### Public Directory

**NOTE**: Due to modern browser limitations of using a file URL, this method does __not__ work if used without hosting a server.

This method fetches the model file from the public directory and feeds it to Cheetah. Copy the model file into the public directory:

```console
cp ${CHEETAH_MODEL_FILE} ${PATH_TO_PUBLIC_DIRECTORY}
```

#### Base64

**NOTE**: This method works without hosting a server, but increases the size of the model file roughly by 33%.

This method uses a base64 string of the model file and feeds it to Cheetah. Use the built-in script `pvbase64` to
base64 your model file:

```console
npx pvbase64 -i ${CHEETAH_MODEL_FILE} -o ${OUTPUT_DIRECTORY}/${MODEL_NAME}.js
```

The output will be a js file which you can import into any file of your project. For detailed information about `pvbase64`,
run:

```console
npx pvbase64 -h
```

#### Init options

Cheetah saves and caches your model file in IndexedDB to be used by Web Assembly. Use a different `modelPath` variable
to hold multiple model values and set the `forceWrite` value to true to force re-save the model file. Set `endpointDurationSec`
value to 0 if you do not with to detect endpoint (moment of silence). Set `enableAutomaticPunctuation` to
true to enable  punctuation in transcription. Set `processErrorCallback` to handle errors if an error occurs
while transcribing. If the model file (`.pv`) changes, `version` should be incremented to force the cached model to be updated.

```typescript
// these are default
const options = {
  endpointDurationSec: 1.0,
  enableAutomaticPunctiation: true,
  processErrorCallback: (error) => {},
  modelPath: "cheetah_model",
  forceWrite: false,
  version: 1
}
```

#### Initialize in Main Thread

Use `Cheetah` to initialize from public directory:

```typescript
const handle = await Cheetah.fromPublicDirectory(
  ${ACCESS_KEY},
  ${MODEL_FILE_RELATIVE_TO_PUBLIC_DIRECTORY},
  options // optional options
);
```

or initialize using a base64 string:

```typescript
import cheetahParams from "${PATH_TO_BASE64_CHEETAH_PARAMS}";

const handle = await Cheetah.fromBase64(
  ${ACCESS_KEY},
  cheetahParams,
  options // optional options
)
```

#### Process Audio Frames in Main Thread

```typescript
function getAudioData(): Int16Array {
  ... // function to get audio data
  return new Int16Array();
}

let transcription = "";
for (;;) {
  const [partial, isEndpoint] = await handle.process(getAudioData());
  transcription += partial;
  if (isEndpoint) {
    transcription += await handle.flush();
    transcription += "\n";
  }
  // break on some condition
}
transcription += await handle.flush(); // runs transcriptionCallback in remaining data
console.log(transcription);
```

#### Initialize in Worker Thread

Create a `transcriptionCallback` function to get the streaming results
from the worker:

```typescript
let transcription = "";

function transcriptionCallback(partial: string, isEndpoint: boolean) {
  transcription += partial;
  if (isEndpoint) {
    transcription += "\n";
  }
}
```

Add to the `options` object an `processErrorCallback` function if you would like
to catch errors:

```typescript
function processErrorCallback(error: string) {
  ...
}

options.processErrorCallback = processErrorCallback;
```

Use `CheetahWorker` to initialize from public directory:

```typescript
const handle = await CheetahWorker.fromPublicDirectory(
  ${ACCESS_KEY},
  transcriptionCallback,
  ${MODEL_FILE_RELATIVE_TO_PUBLIC_DIRECTORY},
  options // optional options
);
```

or initialize using a base64 string:

```typescript
import cheetahParams from "${PATH_TO_BASE64_CHEETAH_PARAMS}";

const handle = await CheetahWorker.fromBase64(
  ${ACCESS_KEY},
  transcriptionCallback,
  cheetahParams,
  options // optional options
)
```

#### Process Audio Frames in Worker Thread

In a worker thread, the `process` function will send the input frames to the worker.
The transcription is received from `transcriptionCallback` as mentioned above.

```typescript
function getAudioData(): Int16Array {
  ... // function to get audio data
  return new Int16Array();
}

for (;;) {
  handle.process(getAudioData());
  // break on some condition
}
handle.flush(); // runs transcriptionCallback on remaining data.
```

#### Clean Up

Clean up used resources by `Cheetah` or `CheetahWorker`:

```typescript
await handle.release();
```

#### Terminate

Terminate `CheetahWorker` instance:

```typescript
await handle.terminate();
```

## Demo

For example usage refer to our [Web demo application](https://github.com/Picovoice/cheetah/tree/master/demo/web).
