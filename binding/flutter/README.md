# Cheetah Binding for Flutter

## Cheetah Speech-to-Text Engine

Made in Vancouver, Canada by [Picovoice](https://picovoice.ai)

Cheetah is an on-device speech-to-text engine. Cheetah is:

- Private; All voice processing runs locally.
- Accurate [[1]](https://github.com/Picovoice/speech-to-text-benchmark#results)
- Compact and Computationally-Efficient [[2]](https://github.com/Picovoice/speech-to-text-benchmark#rtf)
- Cross-Platform:
    - Linux (x86_64)
    - macOS (x86_64, arm64)
    - Windows (x86_64)
    - Android
    - iOS
    - Raspberry Pi (4, 3)
    - NVIDIA Jetson Nano

## Compatibility

This binding is for running Cheetah on **Flutter 1.20.0+** on the following platforms:

- Android 4.4+ (API 19+)
- iOS 9.0+

## Installation

To start, you must have the [Flutter SDK](https://flutter.dev/docs/get-started/install) installed on your system. Once installed, you can run `flutter doctor` to determine any other missing requirements.

To add the Cheetah plugin to your app project, you can reference it in your pub.yaml:
```yaml
dependencies:
  cheetah_flutter: ^<version>
```

## AccessKey

The Cheetah SDK requires a valid `AccessKey` at initialization. `AccessKey`s act as your credentials when using Cheetah SDKs.
You can create your `AccessKey` for free. Make sure to keep your `AccessKey` secret.

To obtain your `AccessKey`:
1. Login or Signup for a free account on the [Picovoice Console](https://picovoice.ai/console/).
2. Once logged in, go to the [`AccessKey` tab](https://console.picovoice.ai/access_key) to create one or use an existing `AccessKey`.

## Permissions

To enable recording with the hardware's microphone, you must first ensure that you have enabled the proper permission on both iOS and Android.

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

**NOTE:** When archiving for release on iOS, you may have to change the build settings of your project in order to prevent stripping of the Cheetaaah library. To do this open the Runner project in XCode and change build setting Deployment -> Strip Style to 'Non-Global Symbols'.

## Model File

Add the Cheetah model file to your Flutter application by:

1. Either creating a model in [Picovoice Console](https://console.picovoice.ai/) or using the default model in [/lib/common/cheetah_params.pv](/lib/common/cheetah_params.pv).
2. Add the model file to an `assets` folder in your project directory.
3. Then add it to your `pubspec.yaml`:
```yaml
flutter:
  assets:
    - assets/cheetah_model.pv
```

## Usage

`Cheetah` is created by passing a model file path into it's static constructor `create`:

```dart
import 'package:cheetah/cheetah.dart';

const accessKey = "{ACCESS_KEY}"  // AccessKey obtained from Picovoice Console (https://picovoice.ai/console/)

void createCheetah() async {
    try{
        _cheetah = await Cheetah.create(accessKey, '{CHEETAH_MODEL_PATH}');
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
    CheetahTranscript transcriptObj = await _cheetah.process(getAudioFrame());
    transcript += transcriptObj.transcript;

    if (transcriptObj.isEndpoint) {
        CheetahTranscript endpointTranscriptObj = await _cheetah.flush();
        transcript += endpointTranscriptObj.transcript;
    }
}
```

When done resources have to be released explicitly:

```dart
cheetah.delete();
```

## Demo App

For example usage refer to our [Flutter demo application](/demo/flutter).
