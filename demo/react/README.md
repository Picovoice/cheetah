# cheetah-web-react-demo

This demo application consists of a `VoiceWidget` component which uses the `useCheetah` react hook to perform real-time speech-to-text. It instantiates a Cheetah worker engine and uses it with the [@picovoice/web-voice-processor](https://www.npmjs.com/package/@picovoice/web-voice-processor) to access (and automatically downsample) microphone audio.

If you decline microphone permission in the browser, or another such issue prevents Cheetah from starting, the error will be displayed.

The demo also shows the various loading and error states, as well as mounting/unmounting the `VoiceWidget` with a toggle, demonstrating the complete lifecycle of Cheetah within a React app.

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

## AccessKey

Cheetah requires a valid Picovoice `AccessKey` at initialization. `AccessKey` acts as your credentials when using Cheetah SDKs.
You can get your `AccessKey` for free. Make sure to keep your `AccessKey` secret.
Signup or Login to [Picovoice Console](https://console.picovoice.ai/) to get your `AccessKey`.

## Install and Run

Use `yarn` or `npm` to install the dependencies. Run `start` to start the demo.

```console
yarn
yarn start
```

(or)

```console
npm install
npm run start
```

Open `http://localhost:3000` to view it in the browser.

The page will reload if you make edits. You will also see any lint errors in the console.

Wait until Cheetah has initialized. Start recording audio to see the real-time transcription.
