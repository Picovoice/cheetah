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

Build the demo by running this from the root of the repository:

```console
cmake -S demo/c/ -B demo/c/build
cmake --build demo/c/build
```

### Run

#### Mic Demo

#### File Demo
