# Cheetah Binding for Flutter

## Cheetah Speech-to-Text Engine

Made in Vancouver, Canada by [Picovoice](https://picovoice.ai)

Cheetah is an on-device speech-to-text engine. Cheetah is:

- Private; All voice processing runs locally.
- [Accurate](https://picovoice.ai/docs/benchmark/stt/)
- [Compact and Computationally-Efficient](https://github.com/Picovoice/speech-to-text-benchmark#rtf)
- Cross-Platform:
  - Linux (x86_64), macOS (x86_64, arm64), Windows (x86_64)
  - Android and iOS
  - Chrome, Safari, Firefox, and Edge
  - Raspberry Pi (3, 4, 5) and NVIDIA Jetson Nano

## Compatibility

This binding is for running Cheetah on **Flutter 2.8.1+** on the following platforms:

- Android 5.0+ (API 21+)
- iOS 13.0+

## Installation

To start, you must have the [Flutter SDK](https://flutter.dev/docs/get-started/install) installed on your system. Once installed, you can run `flutter doctor` to determine any other missing requirements.

To add the Cheetah plugin to your app project, you can reference it in your pub.yaml:
```yaml
dependencies:
  cheetah_flutter: ^<version>
```

## AccessKey

Cheetah requires a valid Picovoice `AccessKey` at initialization. `AccessKey` acts as your credentials when using Cheetah SDKs.
You can get your `AccessKey` for free. Make sure to keep your `AccessKey` secret.
Signup or Login to [Picovoice Console](https://console.picovoice.ai/) to get your `AccessKey`.

## Permissions

To enable recording with the hardware's microphone, you must first ensure that you have enabled the proper permissions on both iOS and Android.

On iOS, open your Info.plist and add the following line:
```xml
<key>NSMicrophoneUsageDescription</key>
<string>[Permission explanation]</string>
```

On Android, open your AndroidManifest.xml and add the following line:
```xml
<uses-permission android:name="android.permission.RECORD_AUDIO" />
<uses-permission android:name="android.permission.INTERNET" />
```

## Cheetah Model File Integration

Add the Cheetah model file to your Flutter application by:

1. Create a model in [Picovoice Console](https://console.picovoice.ai/) or use the [default model](https://github.com/Picovoice/cheetah/tree/master/lib/common).
2. Add the model file to an `assets` folder in your project directory.
3. Add the asset to your `pubspec.yaml`:
```yaml
flutter:
  assets:
    - assets/cheetah_model.pv
```
4. In this example, the path to the model file in code would then be as follows:
```dart
String modelPath = "assets/cheetah_model.pv";
```

Alternatively, if the model file is deployed to the device with a different method, the absolute path to the file on device can be used.

## Usage

An instance of [`Cheetah`](https://picovoice.ai/docs/api/cheetah-flutter/#cheetah) is created by passing a model file path into its static constructor `create`:

```dart
import 'package:cheetah_flutter/cheetah.dart';

String accessKey = '{ACCESS_KEY}' // AccessKey obtained from Picovoice Console (https://console.picovoice.ai/)
String modelPath = '{CHEETAH_MODEL_PATH}' // path relative to the assets folder or absolute path to file on device

void createCheetah() async {
    try{
        _cheetah = await Cheetah.create(accessKey, modelPath);
    } on CheetahException catch (err) {
        // handle Cheetah init error
    }
}
```

Transcribe audio:

```dart
List<int> buffer = getAudioFrame();

String transcript = "";

while true {
    CheetahTranscript partialResult = await _cheetah.process(getAudioFrame());
    transcript += partialResult.transcript;

    if (partialResult.isEndpoint) {
        CheetahTranscript finalResult = await _cheetah.flush();
        transcript += finalResult.transcript;
    }
}
```

When done, resources have to be released explicitly:

```dart
cheetah.delete();
```

## Demo App

For example usage refer to our [Flutter demo application](https://github.com/Picovoice/cheetah/tree/master/demo/flutter).
