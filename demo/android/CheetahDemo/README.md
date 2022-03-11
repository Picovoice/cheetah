# Cheetah Demo

## Setup

Replace `"${YOUR_ACCESS_KEY_HERE}"` inside [MainActivity.java](cheetah-demo-app/src/main/java/ai/picovoice/cheetahdemo/MainActivity.java)
with your AccessKey obtained from [Picovoice Console](https://console.picovoice.ai/).

## AccessKey

Cheetah requires a valid Picovoice `AccessKey` at initialization. `AccessKey` acts as your credentials when using Cheetah SDKs.
You can get your `AccessKey` for free. Make sure to keep your `AccessKey` secret.
Signup or Login to [Picovoice Console](https://console.picovoice.ai/) to get your `AccessKey`.

## Usage

Launch the demo on your phone using Android Studio.

1. Press the record button.
2. Start talking. The transcription will appear in the textbox above.

## Running the Instrumented Unit Tests

Ensure you have an Android device connected or simulator running. Then run the following from the terminal:

```console
cd demo/android/CheetahDemo
./gradlew connectedAndroidTest -PpvTestingAccessKey="YOUR_ACCESS_KEY_HERE"
```

The test results are stored in `cheetah-demo-app/build/reports`.
