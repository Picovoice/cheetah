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

### Restrictions

IndexedDB is required to use `Cheetah` in a worker thread. Browsers without IndexedDB support
(i.e. Firefox Incognito Mode) should use `Cheetah` in the main thread.

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

Create a model in [Picovoice Console](https://console.picovoice.ai/) or use the [default model](https://github.com/Picovoice/cheetah/tree/master/lib/common).

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

#### Cheetah Model

Cheetah saves and caches your model file in IndexedDB to be used by WebAssembly. Use a different `customWritePath` variable
to hold multiple models and set the `forceWrite` value to true to force re-save a model file.

Either `base64` or `publicPath` must be set to instantiate Cheetah. If both are set, Cheetah will use the `base64` model.

```typescript
const cheetahModel = {
  publicPath: ${MODEL_RELATIVE_PATH},
  // or
  base64: ${MODEL_BASE64_STRING},

  // Optionals
  customWritePath: "cheetah_model",
  forceWrite: false,
  version: 1,
}
```

#### Init options

Set `endpointDurationSec` value to 0 if you do not wish to detect endpoint (moment of silence). Set `enableAutomaticPunctuation` to
true to enable  punctuation in transcript. Set `processErrorCallback` to handle errors if an error occurs while transcribing.

```typescript
// Optional, these are default
const options = {
  endpointDurationSec: 1.0,
  enableAutomaticPunctuation: false,
  processErrorCallback: (error) => {}
}
```

#### Initialize Cheetah

Create a `transcriptCallback` function to get the streaming results
from the engine:

```typescript
let transcript = "";

function transcriptCallback(cheetahTranscript: CheetahTranscript) {
  transcript += cheetahTranscript.transcript;
  if (cheetahTranscript.isEndpoint) {
    transcript += ". ";
  }
  if (cheetahTranscript.isFlushed) {
    transcript += "\n"
  }
}
```

Create an instance of `Cheetah` on the main thread:

```typescript
const handle = await Cheetah.create(
  ${ACCESS_KEY},
  transcriptCallback,
  cheetahModel,
  options // optional options
);
```

Or create an instance of `Cheetah` in a worker thread:

```typescript
const handle = await CheetahWorker.create(
  ${ACCESS_KEY},
  transcriptCallback,
  cheetahModel,
  options // optional options
);
```

#### Process Audio Frames

The `process` function will send the input frames to the engine.
The transcript is received from `transcriptCallback` as mentioned above.

```typescript
function getAudioData(): Int16Array {
  ... // function to get audio data
  return new Int16Array();
}

for (;;) {
  handle.process(getAudioData());
  // break on some condition
}
handle.flush(); // runs transcriptCallback on remaining data.
```

#### Clean Up

Clean up used resources by `Cheetah` or `CheetahWorker`:

```typescript
await handle.release();
```

#### Terminate (Worker only)

Terminate `CheetahWorker` instance:

```typescript
await handle.terminate();
```

## Demo

For example usage refer to our [Web demo application](https://github.com/Picovoice/cheetah/tree/master/demo/web).
