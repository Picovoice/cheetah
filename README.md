# Cheetah

Made in Vancouver, Canada by [Picovoice](https://picovoice.ai)

Cheetah is an on-device streaming Speech-to-Text engine. Cheetah is:

* offline: runs locally without an Internet connection.
* highly-accurate [[1]](https://github.com/Picovoice/speech-to-text-benchmark#results).
* compact and computationally-efficient [[1]](https://github.com/Picovoice/speech-to-text-benchmark#results).
* cross-platform. Linux (x86_64), Mac (x86_64), Windows (x86_64), web browsers, Android, iOS, Raspberry Pi, and
BeagleBone are supported. Linux (x86_64) is available for personal and non-commercial use free of charge. Other
platforms are only available under the commercial license.
* customizable. Allows adding new words and adapting to different contexts (Available only under the commercial license).

## Table of Contents
- [Cheetah](#cheetah)
  - [Table of Contents](#table-of-contents)
  - [License](#license)
  - [Use Cases](#use-cases)
  - [Structure of Repository](#structure-of-repository)
  - [Picovoice Console and License File](#picovoice-console-and-license-file)
  - [Running Demo Applications](#running-demo-applications)
    - [Python Demo Application](#python-demo-application)
      - [File-Based Demo](#file-based-demo)
    - [Realtime Demo](#realtime-demo)
    - [C Demo Application](#c-demo-application)
      - [File-Based Demo](#file-based-demo-1)
      - [Realtime Demo](#realtime-demo-1)
  - [Integration](#integration)
    - [Python](#python)
    - [C](#c)
  - [Releases](#releases)
    - [V1.2.0 — January 14th, 2020](#v120--january-14th-2020)
    - [V1.1.0 — September 2nd, 2019](#v110--september-2nd-2019)
    - [V1.0.0 — October 30th, 2018](#v100--october-30th-2018)

## License

This repository is provided for **personal & non-commercial** use only. Refer to [LICENSE](/LICENSE) for details. If you
wish to use Cheetah in a commercial product, [contact Picovoice](https://picovoice.ai/contact/).

## Use Cases

Cheetah is meant to be used for open-domain transcription applications that require live user feedback (incremental
transcription results). Open-Domain question answering, voice typing, and meeting note-taking are a few examples.

* If real-time feedback (incremental transcription results) is not needed, see
[Leopard](https://github.com/Picovoice/leopard).
* If you need to understand naturally-spoken (complex) commands within a specific domain, see
[Rhino](https://github.com/Picovoice/rhino).
* If you need to recognize a fixed set of simple voice commands, or activate a device using voice, see
[Porcupine](https://github.com/Picovoice/porcupine).


## Structure of Repository

Cheetah is shipped as an ANSI C shared library. The binary files for supported platforms are located under
[lib](/lib) and header files are at [include](/include). Bindings are available at [binding](/binding) to facilitate
usage from higher-level languages/platforms. Demo applications are at [demo](/demo). When possible, use one of the demo
applications as a starting point for your own implementation. Finally, [resources](/resources) is a placeholder for
data used by various applications within the repository.

## Picovoice Console and License File

In order to run, Cheetah requires a valid license file ('.lic' extension). To obtain a time-limited evaluation license file, visit [Picovoice Console](https://console.picovoice.ai). To obtain a commercial license, [contact Picovoice](https://picovoice.ai/contact/).

## Running Demo Applications

### Python Demo Application

First, make sure you have Python 3 installed along with the necessary packages included in the requirements.txt file:

```bash
python --version
Python 3.6.8

pip3 install -r requirements.txt
```

#### File-Based Demo

The demo transcribes a set of audio files provided as command line arguments. The demo has been tested using Python 3.6.
Note that the files need to be single-channel, 16KHz, and 16-bit linearly-encoded. For more information about audio
requirements refer to [pv_cheetah.h](/include/pv_cheetah.h). The following transcribes the WAV file located in the
resource directory.

```bash
python demo/python/cheetah_demo.py --audio_paths resources/audio_samples/test.wav --license_path PATH_TO_YOUR_CHEETAH_LICENSE_FILE
```

In order to transcribe multiple files concatenate their paths using comma as below.

```bash
python demo/python/cheetah_demo.py --audio_paths PATH_TO_AUDIO_FILE_1,PATH_TO_AUDIO_FILE_2,PATH_TO_AUDIO_FILE_3 --license_path PATH_TO_YOUR_CHEETAH_LICENSE_FILE
```

### Realtime Demo

This Cheetah demo records audio from the microphone and transcribes it in real-time:

```bash
python demo/python/cheetah_demo_realtime.py --license_path PATH_TO_YOUR_CHEETAH_LICENSE_FILE
```

Note: you need to have a working microphone and it needs to be set as the default audio capture device on your computer
for the demo to function correctly.

### C Demo Application

#### File-Based Demo

This demo application accepts a set of WAV files as input and returns their transcripts. Note that the demo expects the
audio files to be WAV, 16KHz, and 16-bit linearly-encoded. It does not perform any verification to assure the
compatibility or correctness of the input audio files. Set the current working directory to the root of the repository.

The demo can be built using `gcc` as below.

```bash
gcc -I include/ -O3 demo/c/cheetah_demo.c -ldl -o cheetah_demo
```

The usage can be attained by:

```bash
./cheetah_demo
```

Then it can be used as follows:

```bash
./cheetah_demo \
./lib/linux/x86_64/libpv_cheetah.so \
./lib/common/acoustic_model.pv \
./lib/common/language_model.pv \
./PATH_TO_YOUR_CHEETAH_LICENSE_FILE \
./resources/audio_samples/test.wav
```

In order to transcribe multiple files, append the absolute path to each additional file to the list of command line
arguments as follows:

```bash
./cheetah_demo \
./lib/linux/x86_64/libpv_cheetah.so \
./lib/common/acoustic_model.pv \
./lib/common/language_model.pv \
./PATH_TO_YOUR_CHEETAH_LICENSE_FILE \
PATH_TO_AUDIO_FILE_1 PATH_TO_AUDIO_FILE_2 PATH_TO_AUDIO_FILE_3
```

#### Realtime Demo

This demo records the input audio from a microphone and transcribes in real-time. Running the command from
root of the repository, the demo can be built using `gcc`:

```bash
gcc -I include/ -O3 demo/c/cheetah_demo_realtime.c -ldl -lasound -o cheetah_demo_realtime
```

The usage can be attained by

```bash
./cheetah_demo_realtime
```

It can be used as follows

```bash
./cheetah_demo_realtime \
lib/linux/x86_64/libpv_cheetah.so \
AUDIO_DEVICE_NAME \
lib/common/acoustic_model.pv \
lib/common/language_model.pv \
PATH_TO_YOUR_CHEETAH_LICENSE_FILE
```

The `AUDIO_DEVICE_NAME` parameter for the microphone can be found using

```bash
arecord -L
```

Note: you need to have a working microphone.

## Integration

### Python

[cheetah.py](/binding/python/cheetah.py) provides a Python binding for Cheetah library. Below is a quick demonstration
of how to construct an instance of it.

```python
library_path = ... # The file is available under lib/linux/x86_64/libpv_cheetah.so
acoustic_model_path = ... # The file is available under lib/common/acoustic_model.pv
language_model_path = ... # The file is available under lib/common/language_model.pv
license_path = ... # The .lic file is available from Picovoice Console (https://console.picovoice.ai)

handle = Cheetah(library_path, acoustic_model_path, language_model_path, license_path)
```

When initialized, valid sample rate can be obtained using `handle.sample_rate`. Expected frame length (number of audio
samples in each input array) is `handle.frame_length`.

```python
audio = ... # audio data to be transcribed

num_frames = len(audio) / handle.frame_length

transcript = ''

for i in range(num_frames):
    frame = [i * handle.frame_length:(i + 1) * handle.frame_length]
    partial_transcript, _ = handle.process(frame)
    transcript += partial_transcript

transcript += handle.flush()
```

When finished, release the acquired resources.

```python
handle.delete()
```

### C

Cheetah is implemented in ANSI C and therefore can be directly linked to C applications.
[pv_cheetah.h](/include/pv_cheetah.h) header file contains relevant information. An instance of the Cheetah object can be
constructed as follows:

```c
const char *acoustic_model_path = ... // The file is available under lib/common/acoustic_model.pv
const char *language_model_path = ... // The file is available under lib/common/language_model.pv
const char *license_path = ... // The .lic file is available from Picovoice Console (https://console.picovoice.ai)
const int32_t endpoint_duration_sec = ... // endpoint duration in seconds. set to '-1' to disable endpointing

pv_cheetah_t *handle;
const pv_status_t status = pv_cheetah_init(
    acoustic_model_path,
    language_model_path,
    license_path,
    endpoint_duration_sec,
    &handle);
if (status != PV_STATUS_SUCCESS) {
    // error handling logic
}
```

Now the `handle` can be used to process incoming audio stream. Cheetah accepts single-channel 16-bit PCM audio.
The sample rate can be retrieved using `pv_sample_rate()`. Finally, Cheetah accepts input audio in consecutive chunks
(aka frames); the length of each frame can be retrieved using `pv_cheetah_frame_length()`.

```C
const int16_t *audio = ... // audio data to be transcribed
const int audio_length = ... // number of samples in audio

const int num_frames = audio_length / pv_cheetah_frame_length();

char *transcript = ... // buffer for storing transcription.

for (int i = 0; i < num_frames; i++) {
    const int16_t *frame = &audio[i * pv_cheetah_frame_length()];

    char *partial_transcript;
    bool is_endpoint; // is updated only if endpoint detection is enabled at construction time.
    const pv_status_t status = pv_cheetah_process(handle, frame, &partial_transcript, &is_endpoint);
    if (status != PV_STATUS_SUCCESS) {
        // error handling logic
    }

    strcat(transcript, partial_transcript);
    free(partial_transcript);
}

char *final_transcript;
const pv_status_t status = pv_cheetah_flush(handle, &final_transcript)
if (status != PV_STATUS_SUCCESS) {
    // error handling logic
}

strcat(transcript, final_transcript);
free(final_transcript);
```

Finally, when done be sure to release resources acquired.

```C
pv_cheetah_delete(handle);
```

## Releases

### V1.2.0 — January 14th, 2020

* Improved accuracy
* Runtime optimizations

### V1.1.0 — September 2nd, 2019

* Real-time decoding
* Improved accuracy
* Runtime optimizations

### V1.0.0 — October 30th, 2018

* Initial release.
