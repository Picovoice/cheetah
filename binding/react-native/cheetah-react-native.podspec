require "json"

package = JSON.parse(File.read(File.join(__dir__, "package.json")))

Pod::Spec.new do |s|
  s.name         = "cheetah-react-native"
  s.version      = package["version"]
  s.summary      = package["description"]
  s.homepage     = package["homepage"]
  s.license      = package["license"]
  s.authors      = package["author"]

  s.platforms    = { :ios => "13.0" }
  s.source       = { :git => "https://github.com/Picovoice/cheetah.git", :tag => "#{s.version}" }

  s.source_files = "ios/*.{h,m,mm,swift}"

  s.dependency "React"
  s.dependency "Cheetah-iOS", '~> 2.2.0'
end
