# Cheetah Demo

## Setup

Replace `"${YOUR_ACCESS_KEY_HERE}"` inside [MainActivity.java](cheetah-demo-app/src/main/java/ai/picovoice/cheetahdemo/MainActivity.java)
with your AccessKey obtained from [Picovoice Console](https://picovoice.ai/console/).

## Usage

Launch the demo on your phone using Android Studio.

1. Press the record button.
2. Start talking. Record some phrases or whatever audio you would like to transcribe.
3. Press stop. Wait for the info box to display "Transcribed...". This may take a few seconds.
4. The transcription will appear in the textbox above.

## Running the Instrumented Unit Tests

Ensure you have an Android device connected or simulator running. Then run the following from the terminal:

```console
cd demo/android/CheetahDemo
./gradlew connectedAndroidTest -PpvTestingAccessKey="YOUR_ACCESS_KEY_HERE"
```

The test results are stored in `cheetah-demo-app/build/reports`.