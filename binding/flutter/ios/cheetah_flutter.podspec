Pod::Spec.new do |s|
  s.name             = 'cheetah_flutter'
  s.version          = '2.2.0'
  s.summary          = 'A Flutter package plugin for Picovoice\'s Cheetah Speech-to-Text engine'
  s.description      = <<-DESC
  A Flutter package plugin for Picovoice\'s Cheetah Speech-to-Text engine
                       DESC
  s.homepage         = 'https://picovoice.ai/'
  s.license          = { :type => 'Apache-2.0' }
  s.author           = { 'Picovoice' => 'hello@picovoice.ai' }
  s.source           = { :git => "https://github.com/Picovoice/cheetah.git" }
  s.source_files = 'Classes/**/*'
  s.platform = :ios, '13.0'
  s.dependency 'Flutter'
  s.dependency 'Cheetah-iOS', '~> 2.2.0'

  s.swift_version = '5.0'
end
