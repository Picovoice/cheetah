# cheetah-web

**NOTE**: This is a beta build.

The Picovoice Cheetah library for web browsers, powered by WebAssembly.

This library transcribes audio samples in-browser, offline. All processing is done via WebAssembly and Workers in a separate thread.

Looking for Cheetah on NodeJS? See the [@picovoice/cheetah-node](https://www.npmjs.com/package/@picovoice/cheetah-node) package.

## Compatibility

- Chrome / Edge
- Firefox
- Safari

This library requires several modern browser features: `WebAssembly`, `Web Workers`, `IndexedDB` and `Promise`. Internet Explorer will _not_ work.

## Installation & Usage

### Package

Install the [Cheetah-Web package](https://www.npmjs.com/package/@picovoice/cheetah-web) using `yarn`:

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

### Cheetah Models

Cheetah requires a model file on initialization. Create a custom model file from [Picovoice Console](https://console.picovoice.ai/cat)
or you can use the [default model file](/lib/common/cheetah_params.pv).

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

### Usage

Cheetah saves and caches your model file in IndexedDB to be used by Web Assembly. Use a different `modelPath` variable
to hold multiple model values and set the `forceWrite` value to true to force re-save the model file. Set `endpointDurationSec`
value to 0 if you do not with to detect endpoint (moment of silence). Set `enableAutomaticPunctuation` to
false, if you do not wish to enable capitalization and punctuation in transcription.
If the model file (`.pv`) changes, `version` should be incremented to force the cached model to be updated.

```typescript
// these are default
const options = {
  modelPath: "cheetah_model",
  forceWrite: false,
  endpointDurationSec: 1.0,
  enableAutomaticPunctiation: true,
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
  ${MODEL_FILE_RELATIVE_TO_PUBLIC_DIRECTORY},
  transcriptionCallback,
  options // optional options
);
```

or initialize using a base64 string:

```typescript
import cheetahParams from "${PATH_TO_BASE64_CHEETAH_PARAMS}";

const handle = await CheetahWorker.fromBase64(
  ${ACCESS_KEY},
  cheetahParams,
  transcriptionCallback,
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

## Build from source (IIFE + ESM outputs)

This library uses Rollup and TypeScript along with Babel and other popular rollup plugins. There are two outputs: an IIFE version intended for script tags / CDN usage, and a JavaScript module version intended for use with modern JavaScript/TypeScript development (e.g. Angular, Create React App, Webpack).

```console
yarn
yarn build
```

The output will appear in the ./dist/ folder.
