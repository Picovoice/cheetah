# Cheetah Speech-to-Text Demos

Made in Vancouver, Canada by [Picovoice](https://picovoice.ai)

## Cheetah

Cheetah is an on-device streaming speech-to-text engine. Cheetah is:

- Private; All voice processing runs locally.
- Accurate [[1]](https://picovoice.ai/docs/benchmark/stt/#results)
- Compact and Computationally-Efficient [[2]](https://github.com/Picovoice/speech-to-text-benchmark#rtf)
- Cross-Platform:
    - Linux (x86_64)
    - macOS (x86_64, arm64)
    - Windows (x86_64)
    - Android
    - iOS
    - Raspberry Pi (3, 4, 5)
    - NVIDIA Jetson Nano

## Compatibility

- go 1.16+
- Runs on Linux (x86_64), macOS (x86_64, arm64), Windows (x86_64), Raspberry Pi (3, 4, 5), and NVIDIA Jetson Nano.

## AccessKey

Cheetah requires a valid Picovoice `AccessKey` at initialization. `AccessKey` acts as your credentials when using Cheetah SDKs.
You can get your `AccessKey` for free. Make sure to keep your `AccessKey` secret.
Signup or Login to [Picovoice Console](https://console.picovoice.ai/) to get your `AccessKey`.

## Usage

### File Demo

NOTE: The working directory for the following go commands is:

```console
cheetah/demo/go
```

Run the following in the terminal:

```console
go run filedemo/cheetah_file_demo.go \
-input_audio_path "${AUDIO_PATH}" \
-access_key "${ACCESS_KEY}"
```

Replace `${ACCESS_KEY}` with yours obtained from Picovoice Console and `${AUDIO_PATH}` with a path to an audio file (`.wav` extension)
you wish to transcribe.

### Microphone Demo

You need a working microphone connected to your machine for this demo. Run the following in the terminal:

```console
go run micdemo/cheetah_mic_demo.go -access_key "${ACCESS_KEY}"
```

Replace `${ACCESS_KEY}` with yours obtained from Picovoice Console. Once running, the demo prints:

```console
Using device: sof-hda-dsp Digital Microphone
Listening...
```

It is possible that the default audio input device is not the one you wish to use. There are a couple of debugging facilities baked into the demo application to solve this. First, type the following into the console:

```console
go run micdemo/cheetah_mic_demo.go -show_audio_devices
```

It provides information about various audio input devices on the box. Here is an example output:

```console
index: 0, device name: USB Audio Device
index: 1, device name: MacBook Air Microphone
``` 

You can use the device index to specify which microphone to use for the demo. For instance, if you want to use the USB Audio Device
in the above example, you can invoke the demo application as below:

```console
go run micdemo/cheetah_mic_demo.go \
-access_key "${ACCESS_KEY}" \
-audio_device_index 0
```

If the problem persists we suggest storing the recorded audio into a file for inspection. This can be achieved with:

```console
go run micdemo/cheetah_mic_demo.go \
-access_key "${ACCESS_KEY}" \
-audio_device_index 0 \
-output_path ./test.wav
```

If after listening to stored file there is no apparent problem detected please open an issue.

