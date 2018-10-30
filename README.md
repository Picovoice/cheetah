# Cheetah


Made in Vancouver, Canada by [Picovoice](https://picovoice.ai)

Cheetah is an on-device **speech-to-text** engine. It is

* offline and runs locally without an internet connection. Nothing is sent to cloud to fully protect users' **privacy**. 
* compact and computationally-efficient making it suitable for **IoT** applications.
* **highly-accurate**.
* **cross-platform**. Currently **Raspberry Pi**, **Android**, **iOS**,
**Linux**, **Mac**, and **Windows** are supported. 
* **customizable**. Allows adding new words and adapting to different contexts.


## Table of Contents
* [License](#license)
* [Performance](#performance)
* [Structure of Repository](#structure-of-repository)
* [Running Demo Applications](#running-demo-applications)
    * [C Demo Application](#c-demo-application)
    * [Python Demo Application](#python-demo-application)
* [Integration](#integration)
    * [C](#c)
    * [Python](#python)
* [Releases](#releases)

## License

This repository is provided for **non-commercial** use only. Please refer to [LICENSE](/LICENSE) for details.
The [license file](/resources/license) in this repository is time-limited. Picovoice assures that the license is valid
for at least 30 days at any given time.

If you wish to use Cheetah in a commercial product please send an email to sales@picovoice.ai with a brief description
of your use-case. The following table depicts the feature comparison between the free and commercial version of the
engine.

| License Type | Free | Commercial |
:---: | :---: | :---:
Non-Commercial Use | Yes | Yes |
Commercial Use | No | Yes |
Supported Platforms | Linux | Linux, Mac, Windows, iOS, Android, Raspberry Pi, and various embedded platforms.
Custom Language Models | No | Yes |
Compact Language Models | No | Yes |
Support | Community Support | Enterprise Support

## Performance

A comparison between accuracy and runtime metrics of Porcupine and two other widely-used libraries, PocketSphinx and
Mozilla DeepSpeech, is provided [here](https://github.com/Picovoice/stt-benchmark).

## Structure of Repository

Cheetah is shipped as an ANSI C shared library. The binary files for supported platforms are located under
[lib](/lib) and header files are at [include](/include). Bindings are available at [binding](/binding) to facilitate
usage from higher-level languages/platforms. Demo applications are at [demo](/demo). When possible, use one of the demo
applications as a starting point for your own implementation. Finally, [resources](/resources) is a placeholder for
data used by various applications within the repository.

## Running Demo Applications

### Python Demo Application

The demo transcribes a set of audio files provided as command line arguments. The demo has been tested using Python 3.5.
Note that the files need to be single-channel, 16KHz, and 16-bit linearly encoded. For more information about audio
requirements refer to [pv_cheetah.h](/include/pv_cheetah.h). The following transcribes the WAV file located in the
resource directory.

```bash
python demo/python/cheetah_demo.py --audio_paths resources/audio_samples/test.wav
```

In order to transcribe multiple files concatenate their paths using comma as below.

```bash
python demo/python/cheetah.py --audio_paths PATH_TO_AUDIO_FILE_1,PATH_TO_AUDIO_FILE_2,PATH_TO_AUDIO_FILE_3
```

### C Demo Application

This demo application accepts a set of WAV files as input and returns their transcripts. Please not that the demo
expects the audio files to be WAV, 16KHz, and 16-bit linearly-encoded. It does not perform any verification to assure
the correctness of the input audio files. Running the command file from root of the repository the demo can be built
using `gcc` as below.

```bash
gcc -I include/ -O3 demo/c/cheetah_demo.c -ldl -o cheetah_demo
```

The usage can be attained by

```bash
./cheetah_demo
```

Then it can be used as follows

```bash
./cheetah_demo ./lib/linux/x86_64/libpv_cheetah.so ./lib/common/acoustic_model.pv ./lib/common/language_model.pv \
./resources/license/cheetah_eval_linux_public.lic ./resources/audio_samples/test.wav
```

In order to transcribe multiple files append the absolute path to each additional file to the list of command line arguments as follows

```bash
./cheetah_demo ./lib/linux/x86_64/libpv_cheetah.so ./lib/common/acoustic_model.pv ./lib/common/language_model.pv \
./resources/license/cheetah_eval_linux_public.lic PATH_TO_AUDIO_FILE_1 PATH_TO_AUDIO_FILE_2 PATH_TO_AUDIO_FILE_3
```

## Integration

### C

Cheetah is implemented in ANSI C and therefore can be directly linked to C applications.
[pv_cheetah.h](/include/pv_cheetah.h) header file contains relevant information. An instance of Cheetah object can be
constructed as follows.

```c
const char *acoustic_model_file_path = ... // The file is available under lib/common/acoustic_model.pv
const char *language_model_file_path = ... // The file is available under lib/common/language_model.pv
const char *license_file_path = ... // The file is available under resources/license/cheetah_eval_linux_spublic.lic

pv_cheetah_t *handle;
const pv_status_t status = pv_cheetah_init(
    acoustic_model_file_path,
    language_model_file_path,
    license_file_path,
    &handle);
if (status != PV_STATUS_SUCCESS) {
    // error handling logic
}
```

Now the `handle` can be used to process incoming audio frames. Cheetah accepts single channel, 16-bit PCM audio.
The sample rate can be retrieved using `pv_sample_rate()`. Finally, Cheetah accepts input audio in consecutive chunks
(aka frames) the length of each frame can be retrieved using `pv_cheetah_frame_length()`.

```C
const int16_t *audio = ... // audio data to be transcribed
const int audio_length = ... // number of samples in audio

const int num_frames = audio_length / pv_cheetah_frame_length();

for (int i = 0; i < num_frames; i++) {
    const int16_t *frame = &audio[i * pv_cheetah_frame_length()];
    const pv_status_t status = pv_cheetah_process(handle, frame);
    if (status != PV_STATUS_SUCCESS) {
        // error handling logic
    }
}

char *transcription;
const pv_status_t status = pv_cheetah_transcribe(handle, &transcription)
if (status != PV_STATUS_SUCCESS) {
    // error handling logic
}
```

Finally, when done be sure to release resources acquired.

```C
    free(transcription);
    pv_cheetah_delete(handle);
```

### Python

[cheetah.py](/binding/python/cheetah.py) provides a Python binding for Cheetah library. Below is a quick demonstration
of how to construct an instance of it.

```python
library_path = ... # The file is available under lib/linux/x86_64/libpv_cheetah.so
acoustic_model_file_path = ... # The file is available under lib/common/acoustic_model.pv
language_model_file_path = ... # The file is available under lib/common/language_model.pv
license_file_path = ... # The file is available under resources/license/cheetah_eval_linux_public.lic

handle = Cheetah(library_path, acoustic_model_file_path, language_model_file_path, license_file_path)

```

When initialized, valid sample rate can be obtained using handle.sample_rate. Expected frame length 
(number of audio samples in an input array) is handle.frame_length.

```python
audio = ... # audio data to be transcribed

num_frames = len(audio) / handle.frame_length

for i in range(num_frames):
    frame = [i * handle.frame_length:(i + 1) * handle.frame_length]
    handle.process(frame)
    
transcript = handle.transcribe()
```

When done release the acquired resources.

```python
handle.delete()
```

## Releases

### v1.0.0 - October 30th, 2018

* Initial release.
