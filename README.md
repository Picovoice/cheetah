# Cheetah

[![GitHub release](https://img.shields.io/github/release/Picovoice/Cheetah.svg)](https://github.com/Picovoice/Cheetah/releases)
[![GitHub](https://img.shields.io/github/license/Picovoice/cheetah)](https://github.com/Picovoice/cheetah/)

[![Crates.io](https://img.shields.io/crates/v/pv_cheetah)](https://crates.io/crates/pv_cheetah)<!-- markdown-link-check-disable-line -->
[![Maven Central](https://img.shields.io/maven-central/v/ai.picovoice/cheetah-android?label=maven-central%20%5Bandroid%5D)](https://repo1.maven.org/maven2/ai/picovoice/cheetah-android/)
[![Maven Central](https://img.shields.io/maven-central/v/ai.picovoice/cheetah-java?label=maven%20central%20%5Bjava%5D)](https://repo1.maven.org/maven2/ai/picovoice/cheetah-java/)
[![npm](https://img.shields.io/npm/v/@picovoice/cheetah-node?label=npm%20%5Bnode%5D)](https://www.npmjs.com/package/@picovoice/cheetah-node)
[![npm](https://img.shields.io/npm/v/@picovoice/cheetah-react?label=npm%20%5Breact%5D)](https://www.npmjs.com/package/@picovoice/cheetah-react)
[![npm](https://img.shields.io/npm/v/@picovoice/cheetah-react-native?label=npm%20%5Breact-native%5D)](https://www.npmjs.com/package/@picovoice/cheetah-react-native)
[![npm](https://img.shields.io/npm/v/@picovoice/cheetah-web?label=npm%20%5Bweb%5D)](https://www.npmjs.com/package/@picovoice/cheetah-web)
[![Nuget](https://img.shields.io/nuget/v/cheetah)](https://www.nuget.org/packages/Cheetah/)
[![CocoaPods](https://img.shields.io/cocoapods/v/Cheetah-iOS)](https://cocoapods.org/pods/Cheetah-iOS)<!-- markdown-link-check-disable-line -->
[![Pub Version](https://img.shields.io/pub/v/cheetah_flutter)](https://pub.dev/packages/cheetah_flutter)
[![PyPI](https://img.shields.io/pypi/v/pvcheetah)](https://pypi.org/project/pvcheetah/)
[![Go Reference](https://pkg.go.dev/badge/github.com/Picovoice/cheetah/binding/go.svg)](https://pkg.go.dev/github.com/Picovoice/cheetah/binding/go)

Made in Vancouver, Canada by [Picovoice](https://picovoice.ai)

[![Twitter URL](https://img.shields.io/twitter/url?label=%40AiPicovoice&style=social&url=https%3A%2F%2Ftwitter.com%2FAiPicovoice)](https://twitter.com/AiPicovoice)<!-- markdown-link-check-disable-line -->
[![YouTube Channel Views](https://img.shields.io/youtube/channel/views/UCAdi9sTCXLosG1XeqDwLx7w?label=YouTube&style=social)](https://www.youtube.com/channel/UCAdi9sTCXLosG1XeqDwLx7w)

Cheetah is an on-device streaming speech-to-text engine. Cheetah is:

- Private; All voice processing runs locally.
- [Accurate](https://picovoice.ai/docs/benchmark/stt/)
- [Compact and Computationally-Efficient](https://github.com/Picovoice/speech-to-text-benchmark#rtf)
- Cross-Platform:
    - Linux (x86_64), macOS (x86_64, arm64), and Windows (x86_64)
    - Android and iOS
    - Chrome, Safari, Firefox, and Edge
    - Raspberry Pi (3, 4, 5) and NVIDIA Jetson Nano

## Table of Contents

- [Cheetah](#cheetah)
    - [Table of Contents](#table-of-contents)
    - [AccessKey](#accesskey)
    - [Language Support](#language-support)
    - [Demos](#demos)
        - [Python](#python-demos)
        - [C](#c-demos)
        - [iOS](#ios-demos)
        - [Android](#android-demo)
        - [Flutter](#flutter-demo)
        - [Go](#go-demo)
        - [React Native](#react-native-demo)
        - [Java](#java-demos)
        - [Node.js](#nodejs-demo)
        - [.Net](#net-demo)
        - [Rust](#rust-demo)
        - [Web](#web-demos)
          - [Vanilla JavaScript and HTML](#vanilla-javascript-and-html)
          - [React](#react-demo)
    - [SDKs](#sdks)
        - [Python](#python)
        - [C](#c)
        - [iOS](#ios)
        - [Android](#android)
        - [Flutter](#flutter)
        - [Go](#go)
        - [React Native](#react-native)
        - [Node.js](#nodejs)
        - [Java](#java)
        - [.Net](#net)
        - [Rust](#rust)
        - [Web](#web)
          - [Vanilla JavaScript and HTML (ES Modules)](#vanilla-javascript-and-html-es-modules)
          - [React](#react)
    - [Releases](#releases)

## AccessKey

AccessKey is your authentication and authorization token for deploying Picovoice SDKs, including Cheetah. Anyone who is
using Picovoice needs to have a valid AccessKey. You must keep your AccessKey secret. You would need internet
connectivity to validate your AccessKey with Picovoice license servers even though the voice recognition is running 100%
offline.

AccessKey also verifies that your usage is within the limits of your account. Everyone who signs up for
[Picovoice Console](https://console.picovoice.ai/) receives the `Free Tier` usage rights described
[here](https://picovoice.ai/pricing/). If you wish to increase your limits, you can purchase a subscription plan.

## Language Support

- Cheetah Streaming Speech-to-Text currently supports English only.
- Support for [additional languages is available for commercial customers](https://picovoice.ai/consulting/) on a case-by-case basis.

## Demos

### Python Demos

Install the demo package:

```console
pip3 install pvcheetahdemo
```

```console
cheetah_demo_mic --access_key ${ACCESS_KEY}
```

Replace `${ACCESS_KEY}` with yours obtained from Picovoice Console.

### C Demos

If using SSH, clone the repository with:

```console
git clone --recurse-submodules git@github.com:Picovoice/cheetah.git
```

If using HTTPS, clone the repository with:

```console
git clone --recurse-submodules https://github.com/Picovoice/cheetah.git
```

Build the demo:

```console
cmake -S demo/c/ -B demo/c/build && cmake --build demo/c/build
```

Run the demo:

```console
./demo/c/build/cheetah_demo_mic -a ${ACCESS_KEY} -m ${MODEL_PATH} -l ${LIBRARY_PATH}
```

Replace `${ACCESS_KEY}` with yours obtained from Picovoice Console, `${LIBRARY_PATH}` with the path to appropriate
library under [lib](/lib), and `${MODEL_PATH}` to path to [default model file](./lib/common/cheetah_params.pv)
(or your custom one).

### iOS Demos

To run the demo, go to [demo/ios/CheetahDemo](./demo/ios/CheetahDemo) and run:

```console
pod install
```

Replace `let accessKey = "${YOUR_ACCESS_KEY_HERE}"` in the file [ViewModel.swift](./demo/ios/CheetahDemo/CheetahDemo/ViewModel.swift) with your `AccessKey`.

Then, using [Xcode](https://developer.apple.com/xcode/), open the generated `CheetahDemo.xcworkspace` and run the application.

### Android Demo

Using Android Studio, open [demo/android/CheetahDemo](./demo/android/CheetahDemo) as an Android project and then run the application.

Replace `"${YOUR_ACCESS_KEY_HERE}"` in the file [MainActivity.java](./demo/android/CheetahDemo/cheetah-demo-app/src/main/java/ai/picovoice/cheetahdemo/MainActivity.java) with your `AccessKey`.

### Flutter Demo

To run the Cheetah demo on Android or iOS with Flutter, you must have the [Flutter SDK](https://flutter.dev/docs/get-started/install) installed on your system. Once installed, you can run `flutter doctor` to determine any other missing requirements for your relevant platform. Once your environment has been set up, launch a simulator or connect an Android/iOS device.

Before launching the app, use the [copy_assets.sh](./demo/flutter/copy_assets.sh) script to copy the cheetah demo model file into the demo project. (**NOTE**: on Windows, Git Bash or another bash shell is required, or you will have to manually copy the context into the project.).

Replace `"${YOUR_ACCESS_KEY_HERE}"` in the file [main.dart](./demo/flutter/lib/main.dart) with your `AccessKey`.

Run the following command from [demo/flutter](./demo/flutter) to build and deploy the demo to your device:

```console
flutter run
```

### Go Demo

The demo requires `cgo`, which on Windows may mean that you need to install a gcc compiler like [MinGW](https://www.mingw-w64.org/) to build it properly.

From [demo/go](./demo/go) run the following command from the terminal to build and run the file demo:

```console
go run micdemo/cheetah_mic_demo.go -access_key "${ACCESS_KEY}"
```

Replace `${ACCESS_KEY}` with yours obtained from Picovoice Console.

For more information about Go demos go to [demo/go](./demo/go).

### React Native Demo

To run the React Native Cheetah demo app you will first need to set up your React Native environment. For this,
please refer to [React Native's documentation](https://reactnative.dev/docs/environment-setup). Once your environment has
been set up, navigate to [demo/react-native](./demo/react-native) to run the following commands:

For Android:

```console
yarn android-install    # sets up environment
yarn android-run        # builds and deploys to Android
```

For iOS:

```console
yarn ios-install        # sets up environment
yarn ios-run
```
### Node.js Demo

Install the demo package:

```console
yarn global add @picovoice/cheetah-node-demo
```

With a working microphone connected to your device, run the following in the terminal:

```console
cheetah-mic-demo --access_key ${ACCESS_KEY}
```

For more information about Node.js demos go to [demo/nodejs](./demo/nodejs).

### Java Demos

The [Cheetah Java demo](./demo/java) is a command-line application that lets you choose between running Cheetah on an audio file or on real-time microphone input.

To try the real-time demo, make sure there is a working microphone connected to your device. Then invoke the following commands from the terminal:

```console
cd demo/java
./gradlew build
cd build/libs
java -jar cheetah-mic-demo.jar -a ${ACCESS_KEY}
```
For more information about Java demos go to [demo/java](./demo/java).

### .NET Demo

[Cheetah .NET demo](./demo/dotnet) is a command-line application that lets you choose between running Cheetah on an audio
file or on real-time microphone input.

Make sure there is a working microphone connected to your device. From [demo/dotnet/CheetahDemo](./demo/dotnet/CheetahDemo)
run the following in the terminal:

```console
dotnet run -c MicDemo.Release -- --access_key ${ACCESS_KEY}
```

Replace `${ACCESS_KEY}` with your Picovoice `AccessKey`.

For more information about .NET demos, go to [demo/dotnet](./demo/dotnet).

### Rust Demo

[Cheetah Rust demo](./demo/rust) is a command-line application that lets you choose between running Cheetah on an audio
file or on real-time microphone input.

Make sure there is a working microphone connected to your device. From [demo/rust/micdemo](demo/rust/micdemo)
run the following in the terminal:

```console
cargo run --release -- --access_key ${ACCESS_KEY}
```

Replace `${ACCESS_KEY}` with your Picovoice `AccessKey`.

For more information about Rust demos, go to [demo/rust](./demo/rust).

### Web Demos

#### Vanilla JavaScript and HTML

From [demo/web](./demo/web) run the following in the terminal:

```console
yarn
yarn start
```

(or)

```console
npm install
npm run start
```

Open `http://localhost:5000` in your browser to try the demo.

#### React Demo

From [demo/react](demo/react) run the following in the terminal:

```console
yarn
yarn start
```

(or)

```console
npm install
npm run start
```

Open `http://localhost:3000` in your browser to try the demo.

## SDKs

### Python

Install the Python SDK:

```console
pip3 install pvcheetah
```

Create an instance of the engine and transcribe audio in real-time:

```python
import pvcheetah

handle = pvcheetah.create(access_key='${ACCESS_KEY}')

def get_next_audio_frame():
    pass

while True:
    partial_transcript, is_endpoint = handle.process(get_next_audio_frame())
    if is_endpoint:
        final_transcript = handle.flush()
```

Replace `${ACCESS_KEY}` with yours obtained from Picovoice Console.

### C

Create an instance of the engine and transcribe audio in real-time:

```c
#include <stdbool.h>
#include <stdio.h>
#include <stdlib.h>

#include "pv_cheetah.h"

pv_cheetah_t *handle = NULL;
const pv_status_t status = pv_cheetah_init("${ACCESS_KEY}", "${MODEL_PATH}", 0.f, false, &handle);
if (status != PV_STATUS_SUCCESS) {
    // error handling logic
}

extern const int16_t *get_next_audio_frame(void);

while (true) {
    char *partial_transcript = NULL;
    bool is_endpoint = false;
    const pv_status_t status = pv_cheetah_process(
            handle,
            get_next_audio_frame(),
            &partial_transcript,
            &is_endpoint);
    if (status != PV_STATUS_SUCCESS) {
        // error handling logic
    }
    // do something with transcript
    free(partial_transcript);
    if (is_endpoint) {
        char *final_transcript = NULL;
        const pv_status_t status = pv_cheetah_flush(handle, &final_transcript);
        if (status != PV_STATUS_SUCCESS) {
            // error handling logic
        }
        // do something with transcript
        free(final_transcript);
    }
}
```

Replace `${ACCESS_KEY}` with yours obtained from Picovoice Console and `${MODEL_PATH}` to path to
[default model file](./lib/common/cheetah_params.pv) (or your custom one). Finally, when done be sure to release
resources acquired using `pv_cheetah_delete(handle)`.

### iOS
<!-- markdown-link-check-disable -->
The Cheetah iOS binding is available via [CocoaPods](https://cocoapods.org/pods/Cheetah-iOS). To import it into your iOS project, add the following line to your Podfile and run `pod install`:
<!-- markdown-link-check-enable -->
```ruby
pod 'Cheetah-iOS'
```

Create an instance of the engine and transcribe audio in real-time:

```swift
import Cheetah

let modelPath = Bundle(for: type(of: self)).path(
        forResource: "${MODEL_FILE}", // Name of the model file name for Cheetah
        ofType: "pv")!

let cheetah = Cheetah(accessKey: "${ACCESS_KEY}", modelPath: modelPath)

func getNextAudioFrame() -> [Int16] {
  // .. get audioFrame
  return audioFrame;
}

while true {
  do {
    let partialTranscript, isEndpoint = try cheetah.process(getNetAudioFrame())
    if isEndpoint {
      let finalTranscript = try cheetah.flush()
    }
  } catch let error as CheetahError {
      // handle error
  } catch { }
}
```

Replace `${ACCESS_KEY}` with yours obtained from Picovoice Console and `${MODEL_FILE}` with a custom trained model from
[Picovoice Console](https://console.picovoice.ai/) or the [default model](./lib/common/cheetah_params.pv).

### Android

To include the package in your Android project, ensure you have included `mavenCentral()` in your top-level `build.gradle` file and then add the following to your app's `build.gradle`:

```groovy
dependencies {
    implementation 'ai.picovoice:cheetah-android:${LATEST_VERSION}'
}
```

Create an instance of the engine and transcribe audio in real-time:

```java
import ai.picovoice.cheetah.*;

final String accessKey = "${ACCESS_KEY}"; // AccessKey obtained from Picovoice Console (https://console.picovoice.ai/)
final String modelPath = "${MODEL_FILE}";

short[] getNextAudioFrame() {
    // .. get audioFrame
    return audioFrame;
}

try {
    Cheetah cheetah = new Cheetah.Builder().setAccessKey(accessKey).setModelPath(modelPath).build(appContext);

    String transcript = "";

    while true {
        CheetahTranscript transcriptObj = cheetah.process(getNextAudioFrame());
        transcript += transcriptObj.getTranscript();

        if (transcriptObj.getIsEndpoint()) {
            CheetahTranscript finalTranscriptObj = cheetah.flush();
            transcript += finalTranscriptObj.getTranscript();
        }
    };

} catch (CheetahException ex) { }
```

Replace `${ACCESS_KEY}` with yours obtained from Picovoice Console and `${MODEL_FILE}` with the default or custom trained model from [console](https://console.picovoice.ai/).

### Flutter

Add the [Cheetah Flutter plugin](https://pub.dev/packages/cheetah_flutter) to your pub.yaml.

```yaml
dependencies:
  cheetah_flutter: ^<version>
```

Create an instance of the engine and transcribe audio in real-time:

```dart
import 'package:cheetah_flutter/cheetah.dart';

const accessKey = "{ACCESS_KEY}"  // AccessKey obtained from Picovoice Console (https://console.picovoice.ai/)

List<int> buffer = getAudioFrame();

try{
    Cheetah _cheetah = await Cheetah.create(accessKey, '{CHEETAH_MODEL_PATH}');

    String transcript = "";

    while true {
        CheetahTranscript partialResult = await _cheetah.process(getAudioFrame());
        transcript += partialResult.transcript;

        if (partialResult.isEndpoint) {
            CheetahTranscript finalResult = await _cheetah.flush();
            transcript += finalResult.transcript;
        }
    }

    _cheetah.delete()

} on CheetahException catch (err) { }
```

Replace `${ACCESS_KEY}` with your `AccessKey` obtained from [Picovoice Console](https://console.picovoice.ai/) and `${CHEETAH_MODEL_PATH}` with the the path a custom trained model from [Picovoice Console](https://console.picovoice.ai/) or the [default model](lib/common/cheetah_params.pv).

### Go

Install the Go binding:

```console
go get github.com/Picovoice/cheetah/binding/go
```

Create an instance of the engine and transcribe audio in real-time:

```go
import . "github.com/Picovoice/cheetah/binding/go"

cheetah = NewCheetah{AccessKey: "${ACCESS_KEY}"}
err := cheetah.Init()
if err != nil {
    // handle err init
}
defer cheetah.Delete()

func getNextFrameAudio() []int16{
    // get audio frame
}

for {
  partialTranscript, isEndpoint, err = cheetah.Process(getNextFrameAudio())
  if isEndpoint {
    finalTranscript, err = cheetah.Flush()
    }
}
```

Replace `${ACCESS_KEY}` with yours obtained from Picovoice Console. When done be sure to explicitly release the resources using `cheetah.Delete()`.

### React Native

The Cheetah React Native binding is available via [NPM](https://www.npmjs.com/package/@picovoice/cheetah-react-native). Add it via the following command:

```console
yarn add @picovoice/cheetah-react-native
```

Create an instance of the engine and transcribe an audio file:

```typescript
import {Cheetah, CheetahErrors} from '@picovoice/cheetah-react-native';

const getAudioFrame = () => {
  // get audio frames
}

try {
  while (1) {
    const cheetah = await Cheetah.create("${ACCESS_KEY}", "${MODEL_FILE}")
    const {transcript, isEndpoint} = await cheetah.process(getAudioFrame())
    if (isEndpoint) {
      const {transcript} = await cheetah.flush()
    }
  }
} catch (err: any) {
  if (err instanceof CheetahErrors) {
    // handle error
  }
}
```

Replace `${ACCESS_KEY}` with yours obtained from Picovoice Console and `${MODEL_FILE}` with the default or custom trained model from [console](https://console.picovoice.ai/). When done be sure to explicitly release the resources using `cheetah.delete()`.

### Node.js

Install the Node.js SDK:

```console
yarn add @picovoice/cheetah-node
```

Create instances of the Cheetah class:

```javascript
const Cheetah = require("@picovoice/cheetah-node");

const accessKey = "${ACCESS_KEY}"; // Obtained from the Picovoice Console (https://console.picovoice.ai/)
const endpointDurationSec = 0.2;
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

Replace `${ACCESS_KEY}` with yours obtained from [Picovoice Console](https://console.picovoice.ai/).

When done, be sure to release resources using `release()`:

```javascript
handle.release();
```

### Java

Create an instance of the engine with the Cheetah Builder class and transcribe audio in real-time:

```java
import ai.picovoice.cheetah.*;

final String accessKey = "..."; // AccessKey provided by Picovoice Console (https://console.picovoice.ai/)

short[] getNextAudioFrame() {
    // .. get audioFrame
    return audioFrame;
}

String transcript = "";

try {
    Cheetah cheetah = new Cheetah.Builder().setAccessKey(accessKey).build();

    while true {
        CheetahTranscript transcriptObj = cheetah.process(getNextAudioFrame());
        transcript += transcriptObj.getTranscript();

        if (transcriptObj.getIsEndpoint()) {
            CheetahTranscript finalTranscriptObj = cheetah.flush();
            transcript += finalTranscriptObj.getTranscript();
        }
    }

    cheetah.delete();

} catch (CheetahException ex) { }

```

### .NET

Install the .NET SDK using NuGet or the dotnet CLI:

```console
dotnet add package Cheetah
```

The SDK exposes a factory method to create instances of the engine as below:

```csharp
using Pv;

const string accessKey = "${ACCESS_KEY}";

Cheetah handle = Cheetah.Create(accessKey);
```

Replace `${ACCESS_KEY}` with yours obtained from [Picovoice Console](https://console.picovoice.ai/).

When initialized, the valid sample rate is given by `handle.SampleRate`. Expected frame length (number of audio samples in an input array) is `handle.FrameLength`. The engine accepts 16-bit linearly-encoded PCM and operates on single-channel audio.

```csharp
short[] GetNextAudioFrame()
{
    // .. get audioFrame
    return audioFrame;
}

string transcript = "";

while(true)
{
    CheetahTranscript transcriptObj = handle.Process(GetNextAudioFrame());
    transcript += transcriptObj.Transcript;

        if (transcriptObj.IsEndpoint) {
        CheetahTranscript finalTranscriptObj = handle.Flush();
        transcript += finalTranscriptObj.Transcript;
    }
}
```

Cheetah will have its resources freed by the garbage collector, but to have resources freed immediately after use, wrap it in a using statement:

```csharp
using(Cheetah handle = Cheetah.Create(accessKey))
{
    // .. Cheetah usage here
}
```


### Rust

First you will need [Rust and Cargo](https://rustup.rs/) installed on your system.

To add the cheetah library into your app, add `pv_cheetah` to your app's `Cargo.toml` manifest:
```toml
[dependencies]
pv_cheetah = "*"
```

Create an instance of the engine using `CheetahBuilder` instance and transcribe an audio file:

```rust
use cheetah::CheetahBuilder;

fn next_audio_frame() -> Vec<i16> {
  // get audio frame
}

let access_key = "${ACCESS_KEY}"; // AccessKey obtained from Picovoice Console (https://console.picovoice.ai/)
let cheetah: Cheetah = CheetahBuilder::new().access_key(access_key).init().expect("Unable to create Cheetah");

if let Ok(cheetahTranscript) = cheetah.process(&next_audio_frame()) {
  println!("{}", cheetahTranscript.transcript)
  if cheetahTranscript.is_endpoint {
    if let Ok(cheetahTranscript) = cheetah.flush() {
      println!("{}", cheetahTranscript.transcript)
    }
  }
}
```

Replace `${ACCESS_KEY}` with yours obtained from [Picovoice Console](https://console.picovoice.ai/).

### Web

#### Vanilla JavaScript and HTML (ES Modules)

Install the web SDK using yarn:

```console
yarn add @picovoice/cheetah-web
```

or using npm:

```console
npm install --save @picovoice/cheetah-web
```

Create an instance of the engine using `CheetahWorker` and transcribe an audio file:

```typescript
import { CheetahWorker } from "@picovoice/cheetah-web";
import cheetahParams from "${PATH_TO_BASE64_CHEETAH_PARAMS}";

let transcript = "";

function transcriptCallback(cheetahTranscript: CheetahTranscript) {
  transcript += cheetahTranscript.transcript;
  if (cheetahTranscript.isEndpoint) {
    transcript += "\n";
  }
}

function getAudioData(): Int16Array {
  // ... function to get audio data
  return new Int16Array();
}

const cheetah = await CheetahWorker.create(
  "${ACCESS_KEY}",
  transcriptCallback,
  { base64: cheetahParams }
);

for (;;) {
  cheetah.process(getAudioData());
  // break on some condition
}
cheetah.flush(); // runs transcriptionCallback on remaining data.
```

Replace `${ACCESS_KEY}` with yours obtained from [Picovoice Console](https://console.picovoice.ai/). Finally, when done release the resources using `cheetah.release()`.

#### React

```console
yarn add @picovoice/cheetah-react @picovoice/web-voice-processor
```

(or)

```console
npm install @picovoice/cheetah-react @picovoice/web-voice-processor
```

```typescript
import { useCheetah } from "@picovoice/cheetah-react";

function App(props) {
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

  const initEngine = async () => {
    await init(
      "${ACCESS_KEY}",
      cheetahModel,
    );
  };

  const toggleRecord = async () => {
    if (isListening) {
      await stop();
    } else {
      await start();
    }
  };

  useEffect(() => {
    if (result !== null) {
      console.log(result.transcript);
      console.log(result.isComplete);
    }
  }, [result])
}
```

## Releases

### v2.0.0 - November 27th, 2023

- Improvements to error reporting
- Upgrades to authorization and authentication system
- Improved engine accuracy
- Various bug fixes and improvements
- Node min support bumped to Node 16
- Bumped iOS support to iOS 13+
- Patches to .NET support

### v1.1.0 - August 11th, 2022

* Added true-casing by default for transcription results
* Added option to enable automatic punctuation insertion
* Cheetah Web SDK release

### v1.0.0 - January 25th, 2022

* Initial release
