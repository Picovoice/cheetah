import os
import shutil

import setuptools

os.system('git clean -dfx')

package_folder = os.path.join(os.path.dirname(__file__), 'pvcheetahdemo')
os.mkdir(package_folder)

shutil.copy(os.path.join(os.path.dirname(__file__), '../../LICENSE'), package_folder)

shutil.copy(
    os.path.join(os.path.dirname(__file__), 'cheetah_demo_file.py'),
    os.path.join(package_folder, 'cheetah_demo_file.py'))

shutil.copy(
    os.path.join(os.path.dirname(__file__), 'cheetah_demo_mic.py'),
    os.path.join(package_folder, 'cheetah_demo_mic.py'))

with open(os.path.join(os.path.dirname(__file__), 'MANIFEST.in'), 'w') as f:
    f.write('include pvcheetahdemo/LICENSE\n')
    f.write('include pvcheetahdemo/cheetah_demo_file.py\n')
    f.write('include pvcheetahdemo/cheetah_demo_mic.py\n')

with open(os.path.join(os.path.dirname(__file__), 'README.md'), 'r') as f:
    long_description = f.read()

setuptools.setup(
    name="pvcheetahdemo",
    version="2.0.2",
    author="Picovoice",
    author_email="hello@picovoice.ai",
    description="Cheetah speech-to-text engine demos",
    long_description=long_description,
    long_description_content_type="text/markdown",
    url="https://github.com/Picovoice/cheetah",
    packages=["pvcheetahdemo"],
    install_requires=["pvcheetah==2.0.2", "pvrecorder==1.2.3"],
    include_package_data=True,
    classifiers=[
        "Development Status :: 5 - Production/Stable",
        "Intended Audience :: Developers",
        "License :: OSI Approved :: Apache Software License",
        "Operating System :: OS Independent",
        "Programming Language :: Python :: 3",
        "Topic :: Multimedia :: Sound/Audio :: Speech"
    ],
    entry_points=dict(
        console_scripts=[
            'cheetah_demo_file=pvcheetahdemo.cheetah_demo_file:main',
            'cheetah_demo_mic=pvcheetahdemo.cheetah_demo_mic:main',
        ],
    ),
    python_requires='>=3.8',
    keywords="Speech-to-Text, ASR, Speech Recognition, Voice Recognition, Automatic Speech Recognition",
)
