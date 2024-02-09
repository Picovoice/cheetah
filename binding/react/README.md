# Cheetah Binding for React

## Cheetah Speech-to-Text Engine

Made in Vancouver, Canada by [Picovoice](https://picovoice.ai)

Cheetah is an on-device streaming speech-to-text engine. Cheetah is:

- Private; All voice processing runs locally.
- [Accurate](https://picovoice.ai/docs/benchmark/stt/#accuracy)
- [Compact and Computationally-Efficient](https://github.com/Picovoice/speech-to-text-benchmark#rtf)
- Cross-Platform:
  - Linux (x86_64), macOS (x86_64, arm64), and Windows (x86_64)
  - Android and iOS
  - Chrome, Safari, Firefox, and Edge
  - Raspberry Pi (3, 4, 5) and NVIDIA Jetson Nano

## Compatibility

- Chrome / Edge
- Firefox
- Safari

### Restrictions

IndexedDB and WebWorkers are required to use `Cheetah React`. Browsers without support (e.g. Firefox Incognito Mode) should use the [`CheetahWeb binding`](https://github.com/Picovoice/cheetah/tree/master/binding/web) main thread method.

## AccessKey

Cheetah requires a valid Picovoice `AccessKey` at initialization. `AccessKey` acts as your credentials when using Cheetah SDKs.
You can get your `AccessKey` for free. Make sure to keep your `AccessKey` secret.
Signup or Login to [Picovoice Console](https://console.picovoice.ai/) to get your `AccessKey`.

## Installation

Using `yarn`:

```console
yarn add @picovoice/cheetah-react @picovoice/web-voice-processor
```

or using `npm`:

```console
npm install --save @picovoice/cheetah-react @picovoice/web-voice-processor
```

## Usage

Cheetah requires a model file (`.pv`) at initialization. Use the default language model found in [lib/common](https://github.com/Picovoice/cheetah/tree/master/lib/common), or create a custom Cheetah model (`.pv`) in the [Picovoice Console](https://console.picovoice.ai/) for the target platform `Web (WASM)`.

There are two methods to initialize Cheetah.

### Public Directory

**NOTE**: Due to modern browser limitations of using a file URL, this method does __not__ work if used without hosting a server.

This method fetches the model file from the public directory and feeds it to Cheetah. Copy the model file into the public directory:

```console
cp ${CHEETAH_MODEL_FILE} ${PATH_TO_PUBLIC_DIRECTORY}
```

### Base64

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

### Cheetah Model

Cheetah saves and caches your model file in IndexedDB to be used by WebAssembly. Use a different `customWritePath` variable to hold multiple models and set the `forceWrite` value to true to force re-save a model file.
If the model file changes, `version` should be incremented to force the cached models to be updated.
Either `base64` or `publicPath` must be set to instantiate Cheetah. If both are set, Cheetah will use the `base64` model.

```typescript
const cheetahModel = {
  publicPath: "${MODEL_RELATIVE_PATH}",
  // or
  base64: "${MODEL_BASE64_STRING}",

  // Optionals
  customWritePath: "custom_model",
  forceWrite: true,
  version: 1,
}
```

Additional engine options are provided via the `options` parameter. Set `endpointDurationSec` value to 0 if you do not wish to detect endpoint (period of silence). Set `enableAutomaticPunctuation` to true to enable punctuation in the transcript.

```typescript
// Optional - below are default values
const options = {
  endpointDurationSec: 1.0,
  enableAutomaticPunctuation: false
}
```

### Initialize Cheetah

Use `useCheetah` and `init` to initialize `Cheetah`:

```typescript
const {
  result,
  isLoaded,
  isListening,
  error,
  init,
  start,
  stop,
  release,
} = useCheetah();

const initCheetah = async () => {
  await init(
    "${ACCESS_KEY}",
    cheetahModel,
    options
  )
}
```

In case of any errors, use the `error` state variable to check the error message. Use the `isLoaded` state variable to check if `Cheetah` has loaded.

### Transcribe Audio

Cheetah React binding uses [WebVoiceProcessor](https://github.com/Picovoice/web-voice-processor) to record audio with a microphone.
To start recording and transcribing, run the `start` function:

```typescript
await start();
```

If `WebVoiceProcessor` has started correctly, `isListening` will be set to true.
Use the `result` state to get transcription results:

```typescript
useEffect(() => {
  if (result !== null) {
    console.log(result.transcript);
    console.log(result.isComplete);
  }
}, [result])
```

- `result.transcript`: transcript returned from Cheetah
- `result.isComplete`: whether the corresponding `transcript` marks the end of a transcript (i.e. the end of a sentence)

### Stop

Run `stop` to stop recording:

```typescript
await stop();
```

If `WebVoiceProcessor` has stopped correctly, `isListening` will be set to false.

### Clean Up

While running in a component, you can call `release` to clean up all resources used by Cheetah and WebVoiceProcessor:

```typescript
await release();
```

This will set `isLoaded` and `isListening` to false, and `error` to null.

If any arguments require changes, call `release`, then `init` again to initialize Cheetah with the new settings.

You do not need to call `release` when your component is unmounted - the hook will clean up automatically on unmount.

## Non-English Languages

In order to detect non-English wake words you need to use the corresponding model file (`.pv`). The model files for all
supported languages are available [here](https://github.com/Picovoice/cheetah/tree/master/lib/common).

## Demo

For example usage refer to our [React demo application](https://github.com/Picovoice/cheetah/tree/master/demo/react).
