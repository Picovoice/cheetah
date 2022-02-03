# Cheetah

Made in Vancouver, Canada by [Picovoice](https://picovoice.ai)

[![Twitter URL](https://img.shields.io/twitter/url?label=%40AiPicovoice&style=social&url=https%3A%2F%2Ftwitter.com%2FAiPicovoice)](https://twitter.com/AiPicovoice)
[![YouTube Channel Views](https://img.shields.io/youtube/channel/views/UCAdi9sTCXLosG1XeqDwLx7w?label=YouTube&style=social)](https://www.youtube.com/channel/UCAdi9sTCXLosG1XeqDwLx7w)

Cheetah is an on-device streaming speech-to-text engine. Cheetah is:

- Private; All voice processing runs locally.
- Accurate [[1]](https://github.com/Picovoice/speech-to-text-benchmark#results)
- Compact and Computationally-Efficient [[1]](https://github.com/Picovoice/speech-to-text-benchmark#results)
- Cross-Platform:
    - Linux (x86_64)
    - macOS (x86_64, arm64)
    - Windows (x86_64)
    - Android
    - iOS
    - Raspberry Pi (4, 3)
    - NVIDIA Jetson Nano

## Table of Contents

- [Cheetah](#cheetah)
    - [Table of Contents](#table-of-contents)
    - [AccessKey](#accesskey)
    - [Demos](#demos)
        - [Python](#python-demos)
        - [C](#c-demos)
        - [iOS](#ios-demos)
    - [SDKs](#sdks)
        - [Python](#python)
        - [C](#c)
        - [iOS](#ios)
    - [Releases](#releases)

## AccessKey

AccessKey is your authentication and authorization token for deploying Picovoice SDKs, including Cheetah. Anyone who is
using Picovoice needs to have a valid AccessKey. You must keep your AccessKey secret. You would need internet
connectivity to validate your AccessKey with Picovoice license servers even though the voice recognition is running 100%
offline.

AccessKey also verifies that your usage is within the limits of your account. Everyone who signs up for
[Picovoice Console](https://console.picovoice.ai/) receives the `Free Tier` usage rights described
[here](https://picovoice.ai/pricing/). If you wish to increase your limits, you can purchase a subscription plan.

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
./demo/c/build/cheetah_demo_mic -a ${ACCESS_KEY} -l ${LIBRARY_PATH} -m ${MODEL_PATH}
```

Replace `${ACCESS_KEY}` with yours obtained from Picovoice Console, `${LIBRARY_PATH}` with the path to appropriate
library under [lib](/lib), and `${MODEL_PATH}` to path to [default model file](/lib/common/cheetah_params.pv)
(or your custom one).

### iOS Demos

To run the demo, go to [demo/ios/CheetahDemo](/demo/ios/CheetahDemo) and run:

```console
pod install
```

Replace `let accessKey = "${YOUR_ACCESS_KEY_HERE}"` in the file [ViewModel.swift](/demo/ios/CheetahDemo/CheetahDemo/ViewModel.swift) with your `AccessKey`.

Then, using [Xcode](https://developer.apple.com/xcode/), open the generated `CheetahDemo.xcworkspace` and run the application.

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
#include <stdio.h>
#include <stdlib.h>

#include "pv_cheetah.h"

pv_cheetah_t *handle = NULL;
const pv_status_t status = pv_cheetah_init("${ACCESS_KEY}", "${MODEL_PATH}", -1.f, &handle);
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
[default model file](/lib/common/cheetah_params.pv) (or your custom one). Finally, when done be sure to release
resources acquired using `pv_cheetah_delete(handle)`.

### iOS

The Cheetah iOS binding is available via [Cocoapods](https://cocoapods.org/pods/Cheetah-iOS). To import it into your iOS project, add the following line to your Podfile and run `pod install`: 

```ruby
pod 'Cheetah-iOS'
```

Create an instance of the engine and transcribe audio in real-time:

```swift
import Cheetah

cheetah = Cheetah(accessKey: "${ACCESS_KEY}")

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
  } catch { }
}
```

Replace `${ACCESS_KEY}` with yours obtained from Picovoice Console.

## Releases

### V1.0.0 — January 25th, 2022

* Initial release.
