# Cheetah iOS Demo

## AccessKey

Cheetah requires a valid `AccessKey` at initialization. `AccessKey`s act as your credentials when using Cheetah SDKs.
You can create your `AccessKey` for free. Make sure to keep your `AccessKey` secret.

To obtain your `AccessKey`:
1. Login or Signup for a free account on the [Picovoice Console](https://picovoice.ai/console/).
2. Once logged in, go to the [`AccessKey` tab](https://console.picovoice.ai/access_key) to create one or use an existing `AccessKey`.

Copy your `AccessKey` into the `ACCESS_KEY` variable inside [`ViewModel.swift`](/demo/ios/CheetahDemo/CheetahDemo/ViewModel.swift#L25) before building the demo.

## Running the Demo

Before building the demo app, run the following from `CheetahDemo` directory to install the Cheetah Cocoapod:

```ruby
pod install
```
Open [CheetahDemo.xcworkspace](/demo/ios/CheetahDemo/CheetahDemo.xcworkspace) and run the demo.

## Running the On-Device Unit Tests

Copy your `AccessKey` into the `accessKey` variable in [CheetahDemoUITests.swift](/demo/ios/CheetahDemo/CheetahDemoUITests/CheetahDemoUITests.swift). Open [CheetahDemo.xcworkspace](/demo/ios/CheetahDemo/CheetahDemo.xcworkspace) with XCode and run the tests with `Product > Test`.