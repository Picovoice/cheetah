# Leopard Speech-to-Text Engine

Made in Vancouver, Canada by [Picovoice](https://picovoice.ai)

Leopard is an on-device speech-to-text engine. Leopard is:

- Private; All voice processing runs locally. 
- Accurate [[1]](https://github.com/Picovoice/speech-to-text-benchmark#results)
- Compact and Computationally-Efficient [[1]](https://github.com/Picovoice/speech-to-text-benchmark#results)
- Cross-Platform:
  - Linux (x86_64)
  - macOS (x86_64, arm64)
  - Windows (x86_64)
  - Raspberry Pi (4, 3)
  - NVIDIA Jetson Nano

## Compatibility

- Python 3
- Runs on Linux (x86_64), macOS (x86_64, arm64), Windows (x86_64), Raspberry Pi (4, 3), and NVIDIA Jetson Nano.

## Installation

```console
pip3 install pvleopard
```

## AccessKey

AccessKey is your authentication and authorization token for deploying Picovoice SDKs, including Leopard. Anyone who is
using Picovoice needs to have a valid AccessKey. You must keep your AccessKey secret. You would need internet
connectivity to validate your AccessKey with Picovoice license servers even though the voice recognition is running 100%
offline.

AccessKey also verifies that your usage is within the limits of your account. Everyone who signs up for
[Picovoice Console](https://console.picovoice.ai/) receives the `Free Tier` usage rights described
[here](https://picovoice.ai/pricing/). If you wish to increase your limits, you can purchase a subscription plan.

### Usage

Create an instance of the engine and transcribe an audio file:

```python
import pvleopard

handle = pvleopard.create(access_key='${ACCESS_KEY}')

print(handle.process_file('${AUDIO_PATH}'))
```

Replace `${ACCESS_KEY}` with yours obtained from [Picovoice Console]((https://console.picovoice.ai/)) and
`${AUDIO_PATH}` to the path an audio file. Finally, when done be sure to explicitly release the resources using
`handle.delete()`.

## Demos

[pvleoparddemo](https://pypi.org/project/pvleoparddemo/) provides command-line utilities for processing audio using
Leopard.
