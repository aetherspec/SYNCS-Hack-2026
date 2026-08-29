import ARKit
import ExpoModulesCore
import RealityKit
import UIKit

class RealityPortalView: ExpoView, ARSessionDelegate {
  let onTrackingFailed = EventDispatcher()
  private let arView = ARView(frame: .zero)
  private var placed = false
  private var failed = false

  var imageBase64 = "" {
    didSet { placePlateIfReady() }
  }

  var originHeading = 0.0 {
    didSet { placePlateIfReady() }
  }

  required init(appContext: AppContext?) {
    super.init(appContext: appContext)
    clipsToBounds = true
    arView.automaticallyConfigureSession = false
    arView.translatesAutoresizingMaskIntoConstraints = false
    addSubview(arView)
    NSLayoutConstraint.activate([
      arView.topAnchor.constraint(equalTo: topAnchor),
      arView.bottomAnchor.constraint(equalTo: bottomAnchor),
      arView.leadingAnchor.constraint(equalTo: leadingAnchor),
      arView.trailingAnchor.constraint(equalTo: trailingAnchor),
    ])
    startSession()
  }

  deinit {
    arView.session.pause()
  }

  private func startSession() {
#if targetEnvironment(simulator)
    failTracking()
    return
#endif
    guard ARWorldTrackingConfiguration.isSupported else {
      failTracking()
      return
    }
    arView.session.delegate = self
    let config = ARWorldTrackingConfiguration()
    config.worldAlignment = .gravityAndHeading
    arView.session.run(config, options: [.resetTracking, .removeExistingAnchors])
  }

  func session(_ session: ARSession, cameraDidChangeTrackingState camera: ARCamera) {
    switch camera.trackingState {
    case .normal:
      placePlateIfReady()
    case .limited(.initializing), .limited(.relocalizing), .notAvailable:
      break
    case .limited:
      break
    @unknown default:
      break
    }
  }

  func session(_ session: ARSession, didFailWithError error: Error) {
    failTracking()
  }

  private func placePlateIfReady() {
    guard !placed, !failed, !imageBase64.isEmpty else { return }
    guard arView.session.currentFrame != nil else { return }
    let raw = imageBase64.hasPrefix("data:")
      ? String(imageBase64.split(separator: ",").last ?? "")
      : imageBase64
    guard let data = Data(base64Encoded: raw, options: [.ignoreUnknownCharacters]),
          let uiImage = UIImage(data: data),
          let cgImage = uiImage.cgImage
    else {
      failTracking()
      return
    }

    do {
      let texture = try TextureResource.generate(from: cgImage, options: .init(semantic: .color))
      var material = UnlitMaterial()
      material.color = .init(tint: .white, texture: .init(texture))
      let aspect = Float(uiImage.size.width / max(uiImage.size.height, 1))
      let height: Float = 2.4
      let width = max(4.5, height * aspect)
      let mesh = MeshResource.generatePlane(width: width, height: height, cornerRadius: 0)
      let plate = ModelEntity(mesh: mesh, materials: [material])

      let distance: Float = 4.2
      let heading = Float(originHeading) * .pi / 180
      plate.position = SIMD3(sin(heading) * distance, 0, -cos(heading) * distance)
      plate.orientation = simd_quatf(angle: -heading, axis: SIMD3(0, 1, 0))

      let anchor = AnchorEntity(world: matrix_identity_float4x4)
      anchor.addChild(plate)
      arView.scene.addAnchor(anchor)
      placed = true
    } catch {
      failTracking()
    }
  }

  private func failTracking() {
    guard !failed else { return }
    failed = true
    onTrackingFailed()
  }
}
