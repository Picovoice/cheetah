# C Demo

## Compatibility

- C99-compatible compiler

## Requirements

- [CMake](https://cmake.org/) version 3.13 or higher
- [MinGW](http://mingw-w64.org/doku.php) (**Windows Only**)

## AccessKey

AccessKey is your authentication and authorization token for deploying Picovoice SDKs, including Cheetah. Anyone who is
using Picovoice  needs to have a valid AccessKey. YOU MUST KEEP YOUR AccessKey SECRET! You do need internet connectivity
to validate your AccessKey with Picovoice license servers even though the voice recognition is running 100% offline.

AccessKey also verifies that your usage is within the limits of your account. Everyone who signs up for
[Picovoice Console](https://console.picovoice.ai/) receives the `Free Tier` usage rights as described on
[here](https://picovoice.ai/pricing/). If you wish to increase your limits, you can purchase a subscription plan.

## Usage

### Build

Build the demos by running this from the root of the repository:

```console
cmake -S demo/c/ -B demo/c/build
cmake --build demo/c/build
```

### Run

#### Mic Demo

Running the demo without arguments prints the usage:

```console
usage: -a ACCESS_KEY -l LIBRARY_PATH -m MODEL_PATH [-i DEVICE_INDEX]
-s (show audio device indices)
```

The demo uses the default microphone on your device for recording. See the list of recording devices:

```console
./demo/c/build/cheetah_demo_mic -s
```

Run the command corresponding to your platform from the root of the repository. Replace `${ACCESS_KEY}` with yours
obtained from [Picovoice Console](https://console.picovoice.ai/). Either remove the `-i ${MIC_INDEX}` portion or replace
`${MIC_INDEX}` with the microphone index you wish to use.

##### Linux (x86_64)

```console
./demo/c/build/cheetah_demo \
-a ${ACCESS_KEY} \
-l lib/linux/x86_64/libpv_cheetah.so \
-m lib/common/cheetah_params.pv \
-i ${MIC_INDEX}
```

##### macOS (x86_64)

```console
./demo/c/build/cheetah_demo \
-a ${ACCESS_KEY} \
-l lib/mac/x86_64/libpv_cheetah.dylib \
-m lib/common/cheetah_params.pv \
-i ${MIC_INDEX}
```

##### macOS (arm64)

```console
./demo/c/build/cheetah_demo \
-a ${ACCESS_KEY} \
-l lib/mac/arm64/libpv_cheetah.dylib \
-m lib/common/cheetah_params.pv \
-i ${MIC_INDEX}
```

##### Windows

Run using `Command Prompt`.

```console
demo\\c\\build\\cheetah_demo.exe ^
-a ${ACCESS_KEY} ^
-l lib\\windows\\amd64\\libpv_cheetah.dll ^
-m lib\\common\\cheetah_params.pv ^
-i ${MIC_INDEX}
```

##### Raspberry Pi 4

```console
./demo/c/build/cheetah_demo \
-a ${ACCESS_KEY} \
-l lib/raspberry-pi/cortex-a72/libpv_cheetah.so \
-m lib/common/cheetah_params.pv \
-i ${MIC_INDEX}
```

##### Raspberry Pi 4 (64-bit)

```console
./demo/c/build/cheetah_demo \
-a ${ACCESS_KEY} \
-l lib/raspberry-pi/cortex-a72-aarch64/libpv_cheetah.so \
-m lib/common/cheetah_params.pv \
-i ${MIC_INDEX}
```

##### Raspberry Pi 3

```console
./demo/c/build/cheetah_demo \
-a ${ACCESS_KEY} \
-l lib/raspberry-pi/cortex-a53/libpv_cheetah.so \
-m lib/common/cheetah_params.pv \
-i ${MIC_INDEX}
```

##### Raspberry Pi 3 (64-bit)

```console
./demo/c/build/cheetah_demo \
-a ${ACCESS_KEY} \
-l lib/raspberry-pi/cortex-a53-aarch64/libpv_cheetah.so \
-m lib/common/cheetah_params.pv \
-i ${MIC_INDEX}
```

##### NVIDIA Jetson Nano

```console
./demo/c/build/cheetah_demo \
-a ${ACCESS_KEY} \
-l lib/jetson/cortex-a57-aarch64/libpv_cheetah.so \
-m lib/common/cheetah_params.pv \
-i ${MIC_INDEX}
```

#### File Demo

```console
usage: -a ACCESS_KEY -l LIBRARY_PATH -m MODEL_PATH wav_path0 wav_path1 ...
```

Run the command corresponding to your platform from the root of the repository. Replace `${ACCESS_KEY}` with yours
obtained from [Picovoice Console](https://console.picovoice.ai/) and `${WAV_PATH}` with the path to a compatible 
(single-channel, 16 kHz, and 16-bit PCM) WAV file you want to transcribe.

##### Linux (x86_64)

```console
./demo/c/build/cheetah_demo \
-a ${ACCESS_KEY} \
-l lib/linux/x86_64/libpv_cheetah.so \
-m lib/common/cheetah_params.pv \
${WAV_PATH}
```

##### macOS (x86_64)

```console
./demo/c/build/cheetah_demo \
-a ${ACCESS_KEY} \
-l lib/mac/x86_64/libpv_cheetah.dylib \
-m lib/common/cheetah_params.pv \
${WAV_PATH}
```

##### macOS (arm64)

```console
./demo/c/build/cheetah_demo \
-a ${ACCESS_KEY} \
-l lib/mac/arm64/libpv_cheetah.dylib \
-m lib/common/cheetah_params.pv \
${WAV_PATH}
```

##### Windows

Run using `Command Prompt`.

```console
demo\\c\\build\\cheetah_demo.exe ^
-a ${ACCESS_KEY} ^
-l lib\\windows\\amd64\\libpv_cheetah.dll ^
-m lib\\common\\cheetah_params.pv ^
${WAV_PATH}
```

##### Raspberry Pi 4

```console
./demo/c/build/cheetah_demo \
-a ${ACCESS_KEY} \
-l lib/raspberry-pi/cortex-a72/libpv_cheetah.so \
-m lib/common/cheetah_params.pv \
${WAV_PATH}
```

##### Raspberry Pi 4 (64-bit)

```console
./demo/c/build/cheetah_demo \
-a ${ACCESS_KEY} \
-l lib/raspberry-pi/cortex-a72-aarch64/libpv_cheetah.so \
-m lib/common/cheetah_params.pv \
${WAV_PATH}
```

##### Raspberry Pi 3

```console
./demo/c/build/cheetah_demo \
-a ${ACCESS_KEY} \
-l lib/raspberry-pi/cortex-a53/libpv_cheetah.so \
-m lib/common/cheetah_params.pv \
${WAV_PATH}
```

##### Raspberry Pi 3 (64-bit)

```console
./demo/c/build/cheetah_demo \
-a ${ACCESS_KEY} \
-l lib/raspberry-pi/cortex-a53-aarch64/libpv_cheetah.so \
-m lib/common/cheetah_params.pv \
${WAV_PATH}
```

##### NVIDIA Jetson Nano

```console
./demo/c/build/cheetah_demo \
-a ${ACCESS_KEY} \
-l lib/jetson/cortex-a57-aarch64/libpv_cheetah.so \
-m lib/common/cheetah_params.pv \
${WAV_PATH}
```
