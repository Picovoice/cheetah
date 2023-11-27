Pod::Spec.new do |s|
  s.name = 'Cheetah-iOS'
  s.module_name = 'Cheetah'
  s.version = '2.0.0'
  s.license = {:type => 'Apache 2.0'}
  s.summary = 'iOS SDK for Picovoice\'s Cheetah speech-to-text engine.'
  s.description =
  <<-DESC
  Cheetah is an on-device streaming speech-to-text engine.

  Cheetah is:
    - Private, all voice processing runs locally.
    - Accurate
    - Compact and computationally-Efficient
    - cross-platform:
      - Linux (x86_64)
      - macOS (x86_64, arm64)
      - Windows (x86_64)
      - Android
      - iOS
      - Raspberry Pi (4, 3)
      - NVIDIA Jetson Nano
  DESC
  s.homepage = 'https://github.com/Picovoice/cheetah/tree/master/binding/ios'
  s.author = { 'Picovoice' => 'hello@picovoice.ai' }
  s.source = { :git => "https://github.com/Picovoice/cheetah.git", :tag => "Cheetah-iOS-v2.0.0" }
  s.ios.deployment_target = '13.0'
  s.swift_version = '5.0'
  s.vendored_frameworks = 'lib/ios/PvCheetah.xcframework'
  s.source_files = 'binding/ios/*.{swift}'
  s.exclude_files = 'binding/ios/CheetahAppTest/**'
end
