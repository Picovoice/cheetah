# Cheetah Binding for Python

## Cheetah Speech-to-Text Engine

Made in Vancouver, Canada by [Picovoice](https://picovoice.ai)

Cheetah is an on-device streaming speech-to-text engine. Cheetah is:

- Private; All voice processing runs locally.
- [Accurate](https://picovoice.ai/docs/benchmark/stt/)
- [Compact and Computationally-Efficient](https://github.com/Picovoice/speech-to-text-benchmark#rtf)
- Cross-Platform:
    - Linux (x86_64), macOS (x86_64, arm64), and Windows (x86_64, arm64)
    - Android and iOS
    - Chrome, Safari, Firefox, and Edge
    - Raspberry Pi (3, 4, 5)

## Compatibility

- Python 3.9+
- Runs on Linux (x86_64), macOS (x86_64, arm64), Windows (x86_64, arm64), and Raspberry Pi (3, 4, 5).

## Installation

```console
pip3 install pvcheetah
```

## AccessKey

Cheetah requires a valid Picovoice `AccessKey` at initialization. `AccessKey` acts as your credentials when using Cheetah SDKs.
You can get your `AccessKey` for free. Make sure to keep your `AccessKey` secret.
Signup or Login to [Picovoice Console](https://console.picovoice.ai/) to get your `AccessKey`.

## Usage

### Basic Transcription 

Create an instance of the engine and transcribe audio:

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

Replace `${ACCESS_KEY}` with yours obtained from [Picovoice Console](https://console.picovoice.ai/). When done be sure
to explicitly release the resources using `handle.delete()`.

### Annotated Transcription

Create an instance of the engine and get the audio transcription and word-level metadata:

```python
import pvcheetah

handle = pvcheetah.create(access_key='${ACCESS_KEY}')

def get_next_audio_frame():
    pass

while True:
    partial_output = handle.process_annotated(get_next_audio_frame())
    partial_transcript = partial_output.transcript
    partial_words = partial_output.words
    is_endpoint = partial_output.is_endpoint

    if is_endpoint:
        final_output = handle.flush_annotated()
        final_transcript = final_output.transcript
        final_words = final_output.words
```

Replace `${ACCESS_KEY}` with yours obtained from [Picovoice Console](https://console.picovoice.ai/). When done be sure
to explicitly release the resources using `handle.delete()`.

### Language Model

The Cheetah Python SDK comes preloaded with a default English language model (`.pv` file).
Default models for other supported languages can be found in [lib/common](../../lib/common).

Create custom language models using the [Picovoice Console](https://console.picovoice.ai/). Here you can train
language models with custom vocabulary and boost words in the existing vocabulary.

Pass in the `.pv` file via the `model_path` argument:
```python
cheetah = pvcheetah.create(
    access_key='${ACCESS_KEY}',
    model_path='${MODEL_FILE_PATH}')
```

## Train Models over API

You can train models over API without going to the console:

```python
train_model_from_words(
        "${ACCESS_KEY}",                                                   # AccessKey obtained from Picovoice Console (https://console.picovoice.ai/).
        "${OUTPUT_PATH}",                                                  # Path to save the newly trained model.
        "${LANGUAGE}",                                                     # Two-character language code.
        {"${NEW_WORD}": set(["${PRONUNCIATION1}", "${PRONUNCIATION2}"])},  # New words with optional custom pronunciation to add to the model.
        set(["${BOOST_WORD1}", "${BOOST_WORD2}"]))                         # Boost words.
```

(or)

```python
train_model_from_yaml(
        "${ACCESS_KEY}",   # AccessKey obtained from Picovoice Console (https://console.picovoice.ai/).
        "${OUTPUT_PATH}",  # Path to save the newly trained model.
        "${LANGUAGE}",     # Two-character language code.
        "${YAML_PATH}")    # Path to YAML configuration file.
```

Check [Cheetah Model API](https://picovoice.ai/docs/model-api/cheetah/) docs for a list of supported languages.


## Demos

[pvcheetahdemo](https://pypi.org/project/pvcheetahdemo/) provides command-line utilities for processing audio using
Cheetah.
