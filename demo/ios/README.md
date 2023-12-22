# Cheetah iOS Demo

## AccessKey

Cheetah requires a valid Picovoice `AccessKey` at initialization. `AccessKey` acts as your credentials when using Cheetah SDKs.
You can get your `AccessKey` for free. Make sure to keep your `AccessKey` secret.
Signup or Login to [Picovoice Console](https://console.picovoice.ai/) to get your `AccessKey`.

## Running the Demo

Copy your `AccessKey` into the `ACCESS_KEY` variable inside [`ViewModel.swift`](./CheetahDemo/CheetahDemo/ViewModel.swift).

Before building the demo app, run the following from `CheetahDemo` directory to install the Cheetah CocoaPod:

```ruby
pod install
```
Open [CheetahDemo.xcworkspace](./CheetahDemo/CheetahDemo.xcworkspace) and run the demo.
