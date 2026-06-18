#
# Copyright 2022-2026 Picovoice Inc.
#
# You may not use this file except in compliance with the license. A copy of the license is located in the "LICENSE"
# file accompanying this source.
#
# Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on
# an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the
# specific language governing permissions and limitations under the License.
#

import os
import platform
import subprocess

from typing import Sequence

import requests

from ruamel.yaml import YAML
from ruamel.yaml.error import YAMLError


def _is_64bit():
    return '64bit' in platform.architecture()[0]


def _linux_machine():
    machine = platform.machine()
    if machine == 'x86_64':
        return machine
    elif machine in ['aarch64', 'armv7l']:
        arch_info = ('-' + machine) if _is_64bit() else ''
    else:
        raise NotImplementedError("Unsupported CPU architecture: `%s`" % machine)

    cpu_info = ''
    try:
        cpu_info = subprocess.check_output(['cat', '/proc/cpuinfo']).decode('utf-8')
        cpu_part_list = [x for x in cpu_info.split('\n') if 'CPU part' in x]
        cpu_part = cpu_part_list[0].split(' ')[-1].lower()
    except Exception as e:
        raise RuntimeError("Failed to identify the CPU with `%s`\nCPU info: `%s`" % (e, cpu_info))

    if '0xd03' == cpu_part:
        return 'cortex-a53' + arch_info
    elif '0xd08' == cpu_part:
        return 'cortex-a72' + arch_info
    elif "0xd0b" == cpu_part:
        return "cortex-a76" + arch_info
    else:
        raise NotImplementedError("Unsupported CPU: `%s`." % cpu_part)


_RASPBERRY_PI_MACHINES = {
    "cortex-a53",
    "cortex-a72",
    "cortex-a76",
    "cortex-a53-aarch64",
    "cortex-a72-aarch64",
    "cortex-a76-aarch64"}


def default_library_path(relative):
    if platform.system() == 'Darwin':
        if platform.machine() == 'x86_64':
            return os.path.join(os.path.dirname(__file__), relative, 'lib/mac/x86_64/libpv_cheetah.dylib')
        elif platform.machine() == "arm64":
            return os.path.join(os.path.dirname(__file__), relative, 'lib/mac/arm64/libpv_cheetah.dylib')
    elif platform.system() == 'Linux':
        linux_machine = _linux_machine()
        if linux_machine == 'x86_64':
            return os.path.join(os.path.dirname(__file__), relative, 'lib/linux/x86_64/libpv_cheetah.so')
        elif linux_machine in _RASPBERRY_PI_MACHINES:
            return os.path.join(
                os.path.dirname(__file__),
                relative,
                'lib/raspberry-pi/%s/libpv_cheetah.so' % linux_machine)
    elif platform.system() == 'Windows':
        if platform.machine().lower() == 'amd64':
            return os.path.join(os.path.dirname(__file__), relative, 'lib/windows/amd64/libpv_cheetah.dll')
        elif platform.machine().lower() == 'arm64':
            return os.path.join(os.path.dirname(__file__), relative, 'lib/windows/arm64/libpv_cheetah.dll')

    raise NotImplementedError('Unsupported platform.')


def default_model_path(relative):
    return os.path.join(os.path.dirname(__file__), relative, 'lib/common/cheetah_params.pv')


VALID_LANGUAGES = ('de', 'en', 'es', 'fr', 'it', 'pt')  # 'ja', 'ko',
PV_API_URL = "https://rest.picovoice.ai/"


def pv_train_model(
        access_key: str,
        output_path: str,
        language: str,
        yaml_content: str):

    if language not in VALID_LANGUAGES:
        raise ValueError("Invalid language ('%s')" % language)

    try:
        yaml = YAML()
        content = yaml.load(yaml_content)
    except YAMLError as e:
        if hasattr(e, "problem_mark"):
            raise ValueError(f"YAML error at line {e.problem_mark.line + 1}: {e.problem}") from e
        else:
            raise ValueError("Failed to parse yaml content") from e

    if 'new' not in content:
        raise ValueError("YAML must contain `new` field")
    if 'boost' not in content:
        raise ValueError("YAML must contain `boost` field")

    if not isinstance(content['boost'], Sequence):
        raise ValueError("`boost` field should be of type `Sequence`")
    if not all([isinstance(b, str) for b in content['boost']]):
        raise ValueError("`boost` words should be of type `str`")

    for n in content['new']:
        if not isinstance(n, str):
            raise ValueError(f"`{n}` words should be of type `str`")
        pronunciations = content['new'][n]
        if not isinstance(pronunciations, Sequence):
            raise ValueError(f"`{n}` pronunciations should be of type `Sequence`")
        for p in pronunciations:
            if not isinstance(p, str):
                raise ValueError(f"Each of `{n}` pronunciations should be of type `str`")

    payload = {
        "engine": "cheetah",
        "model_type": "default",
        "yaml_content": yaml_content
    }

    headers = {
        "x-api-key": access_key
    }

    url = f"{PV_API_URL}{language}/api/cat"

    try:
        response = requests.post(url, json=payload, headers=headers, allow_redirects=True)
        response.raise_for_status()
    except requests.exceptions.HTTPError as e:
        raise RuntimeError(f"HTTP {e.response.status_code}: {e.response.text}") from e
    except requests.exceptions.RequestException as e:
        raise RuntimeError(f"Request failed: {e}") from e

    with open(output_path, 'wb') as f:
        f.write(response.content)


__all__ = [
    'default_library_path',
    'default_model_path',
    'pv_train_model',
]
