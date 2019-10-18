import setuptools
import shutil
import os

LONG_DESCRIPTION = \
    """
    #[Cheetah](https://github.com/Picovoice/cheetah).   
    It supports Linux (x86_64), Mac, Raspberry Pi (Zero, 1, 2, 3), and BeagleBone.
    ## Installation
    ```bash
    pip install pvcheetah
    ```
    If it fails to install PyAudio, you can do the following for Debian/Ubuntu as referenced in the installation guide
    of [PyAudio](https://people.csail.mit.edu/hubert/pyaudio/). 
    Install PyAudio  
    ```bash
    sudo apt-get install python-pyaudio python3-pyaudio
    ```
    If the above fails then first run the following
    ```bash
    sudo apt-get install portaudio19-dev
    sudo apt-get install python-all-dev python3-all-dev
    ```
    ## Usage
    ### Realtime Demo
    Make sure you have a working microphone connected to your device first. From commandline type the following
    ```bash
    pvcheetah_mic
    ```
    Then say anything. The demo records audio steam from microphone and transcribes it in real-time.
    ### File-Based Demo
    ```bash
    pvcheetah_file --audio_paths ${AUDIO_PATHS}
    ```
    Replace `${AUDIO_PATHS}` with comma-separated absolute paths to audio files (e.g. WAV or FLAC) to be transcribed.
    In order to get more information about using demos, run them with '--help' argument or look into their GitHub page
    [here](https://github.com/Picovoice/cheetah/tree/master/demo/python).
    ### Cheetah Class
    
    You can create an instance of Cheetah engine for use within your application using the factory method provided below.
    ```python
    import pvcheetah
    pvcheetah.create()
    ```
    """

for x in ('build', 'dist', 'pvcheetah.egg-info'):
    x_path = os.path.join(os.path.dirname(__file__), x)
    if os.path.isdir(x_path):
        shutil.rmtree(x_path)

setuptools.setup(
    name="pvcheetah",
    version="1.1.0",
    author="Picovoice",
    author_email="hello@picovoice.ai",
    description="On-device speech-to-text engine powered by deep learning.",
    long_description=LONG_DESCRIPTION,
    long_description_content_type="text/markdown",
    url="https://github.com/Picovoice/cheetah",
    package_dir={"pvcheetah": ""},
    packages=["pvcheetah"],
    install_requires=[
        "pysoundfile>=0.9.0",
        "enum34==1.1.6",
        "numpy",
        "pyaudio",
    ],
    include_package_data=True,
    classifiers=[
        "Programming Language :: Python :: 3",
        "License :: OSI Approved :: Apache Software License",
        "Operating System :: OS Independent",
    ],
    entry_points=dict(
        console_scripts=[
            'pvcheetah_mic=pvcheetah.demo.python.cheetah_demo_realtime:main',
            'pvcheetah_file=pvcheetah.demo.python.cheetah_demo:main'
        ],
    ),
)