# C Demo

## Compatibility

- C99-compatible compiler

## Requirements

- [CMake](https://cmake.org/) version 3.13 or higher
- [MinGW](https://www.mingw-w64.org/) (**Windows Only**)

## AccessKey

Cheetah requires a valid Picovoice `AccessKey` at initialization. `AccessKey` acts as your credentials when using Cheetah SDKs.
You can get your `AccessKey` for free. Make sure to keep your `AccessKey` secret.
Signup or Login to [Picovoice Console](https://console.picovoice.ai/) to get your `AccessKey`.

## Usage

If using SSH, clone the repository with:

```console
git clone --recurse-submodules git@github.com:Picovoice/cheetah.git
```

If using HTTPS, clone the repository with:

```console
git clone --recurse-submodules https://github.com/Picovoice/cheetah.git
```

### Build Linux/MacOS

Build the demos by running this from the root of the repository:

```console
cmake -S demo/c/ -B demo/c/build
cmake --build demo/c/build
```

### Build Windows

Build the demo by running this from the root of the repository:

```console
cmake -S demo/c/ -B demo/c/build -G "MinGW Makefiles"
cmake --build demo/c/build
```

### Run

#### Mic Demo

Running the demo without arguments prints the usage:

```console
usage: -a ACCESS_KEY -m MODEL_PATH -l LIBRARY_PATH [-e ENDPOINT_DURATION] [-d] [-i DEVICE_INDEX]
-s (show audio device indices)
```

The demo uses the default microphone on your device for recording. See the list of recording devices:

```console
./demo/c/build/cheetah_demo_mic -s
```

Run the command corresponding to your platform from the root of the repository. Replace `${ACCESS_KEY}` with yours
obtained from [Picovoice Console](https://console.picovoice.ai/). Either remove the `-i ${MIC_INDEX}` portion or replace
`${MIC_INDEX}` with the microphone index you wish to use.

Use the `-d` flag to disable automatic punctuation.

##### Linux (x86_64)

```console
./demo/c/build/cheetah_demo \
-a ${ACCESS_KEY} \
-m lib/common/cheetah_params.pv \
-l lib/linux/x86_64/libpv_cheetah.so \
-i ${MIC_INDEX}
```

##### macOS (x86_64)

```console
./demo/c/build/cheetah_demo \
-a ${ACCESS_KEY} \
-m lib/common/cheetah_params.pv \
-l lib/mac/x86_64/libpv_cheetah.dylib \
-i ${MIC_INDEX}
```

##### macOS (arm64)

```console
./demo/c/build/cheetah_demo \
-a ${ACCESS_KEY} \
-m lib/common/cheetah_params.pv \
-l lib/mac/arm64/libpv_cheetah.dylib \
-i ${MIC_INDEX}
```

##### Windows

Run using `Command Prompt`.

```console
demo\\c\\build\\cheetah_demo.exe ^
-a ${ACCESS_KEY} ^
-m lib\\common\\cheetah_params.pv ^
-l lib\\windows\\amd64\\libpv_cheetah.dll ^
-i ${MIC_INDEX}
```

##### Raspberry Pi 4

```console
./demo/c/build/cheetah_demo \
-a ${ACCESS_KEY} \
-m lib/common/cheetah_params.pv \
-l lib/raspberry-pi/cortex-a72/libpv_cheetah.so \
-i ${MIC_INDEX}
```

##### Raspberry Pi 4 (64-bit)

```console
./demo/c/build/cheetah_demo \
-a ${ACCESS_KEY} \
-m lib/common/cheetah_params.pv \
-l lib/raspberry-pi/cortex-a72-aarch64/libpv_cheetah.so \
-i ${MIC_INDEX}
```

##### Raspberry Pi 3

```console
./demo/c/build/cheetah_demo \
-a ${ACCESS_KEY} \
-m lib/common/cheetah_params.pv \
-l lib/raspberry-pi/cortex-a53/libpv_cheetah.so \
-i ${MIC_INDEX}
```

##### Raspberry Pi 3 (64-bit)

```console
./demo/c/build/cheetah_demo \
-a ${ACCESS_KEY} \
-m lib/common/cheetah_params.pv \
-l lib/raspberry-pi/cortex-a53-aarch64/libpv_cheetah.so \
-i ${MIC_INDEX}
```

##### NVIDIA Jetson Nano

```console
./demo/c/build/cheetah_demo \
-a ${ACCESS_KEY} \
-m lib/common/cheetah_params.pv \
-l lib/jetson/cortex-a57-aarch64/libpv_cheetah.so \
-i ${MIC_INDEX}
```

#### File Demo

```console
usage: -a ACCESS_KEY -m MODEL_PATH -l LIBRARY_PATH [-d] wav_path0 wav_path1 ...
```

Run the command corresponding to your platform from the root of the repository. Replace `${ACCESS_KEY}` with yours
obtained from [Picovoice Console](https://console.picovoice.ai/) and `${WAV_PATH}` with the path to a compatible
(single-channel, 16 kHz, and 16-bit PCM) WAV file you want to transcribe.

Use the `-d` flag to disable automatic punctuation.

##### Linux (x86_64)

```console
./demo/c/build/cheetah_demo \
-a ${ACCESS_KEY} \
-m lib/common/cheetah_params.pv \
-l lib/linux/x86_64/libpv_cheetah.so \
${WAV_PATH}
```

##### macOS (x86_64)

```console
./demo/c/build/cheetah_demo \
-a ${ACCESS_KEY} \
-m lib/common/cheetah_params.pv \
-l lib/mac/x86_64/libpv_cheetah.dylib \
${WAV_PATH}
```

##### macOS (arm64)

```console
./demo/c/build/cheetah_demo \
-a ${ACCESS_KEY} \
-m lib/common/cheetah_params.pv \
-l lib/mac/arm64/libpv_cheetah.dylib \
${WAV_PATH}
```

##### Windows

Run using `Command Prompt`.

```console
demo\\c\\build\\cheetah_demo.exe ^
-a ${ACCESS_KEY} ^
-m lib\\common\\cheetah_params.pv ^
-l lib\\windows\\amd64\\libpv_cheetah.dll ^
${WAV_PATH}
```

##### Raspberry Pi 4

```console
./demo/c/build/cheetah_demo \
-a ${ACCESS_KEY} \
-m lib/common/cheetah_params.pv \
-l lib/raspberry-pi/cortex-a72/libpv_cheetah.so \
${WAV_PATH}
```

##### Raspberry Pi 4 (64-bit)

```console
./demo/c/build/cheetah_demo \
-a ${ACCESS_KEY} \
-m lib/common/cheetah_params.pv \
-l lib/raspberry-pi/cortex-a72-aarch64/libpv_cheetah.so \
${WAV_PATH}
```

##### Raspberry Pi 3

```console
./demo/c/build/cheetah_demo \
-a ${ACCESS_KEY} \
-m lib/common/cheetah_params.pv \
-l lib/raspberry-pi/cortex-a53/libpv_cheetah.so \
${WAV_PATH}
```

##### Raspberry Pi 3 (64-bit)

```console
./demo/c/build/cheetah_demo \
-a ${ACCESS_KEY} \
-m lib/common/cheetah_params.pv \
-l lib/raspberry-pi/cortex-a53-aarch64/libpv_cheetah.so \
${WAV_PATH}
```

##### NVIDIA Jetson Nano

```console
./demo/c/build/cheetah_demo \
-a ${ACCESS_KEY} \
-m lib/common/cheetah_params.pv \
-l lib/jetson/cortex-a57-aarch64/libpv_cheetah.so \
${WAV_PATH}
```
