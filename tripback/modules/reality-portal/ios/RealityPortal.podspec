require 'json'

package = JSON.parse(File.read(File.join(__dir__, '..', 'package.json')))

Pod::Spec.new do |s|
  s.name           = 'RealityPortal'
  s.version        = package['version']
  s.summary        = 'ARKit viewer for TripBack historical plates'
  s.description    = 'World-locks a 2D Gemini panorama in the live camera.'
  s.author         = 'TripBack'
  s.homepage       = 'https://github.com/syncs-hack'
  s.license        = 'MIT'
  s.platforms      = { :ios => '16.4' }
  s.source         = { git: 'https://github.com/syncs-hack/tripback.git' }
  s.static_framework = true
  s.dependency 'ExpoModulesCore'
  s.frameworks     = 'ARKit', 'RealityKit', 'UIKit'
  s.pod_target_xcconfig = { 'DEFINES_MODULE' => 'YES' }
  s.source_files   = '*.swift'
end
