import ARKit
import ExpoModulesCore
import SceneKit
import UIKit

final class TripBackARView: ExpoView, ARSCNViewDelegate, ARSessionDelegate {
  private let sceneView = ARSCNView(frame: .zero)
  private var portalNode: SCNNode?
  private var portalContentNode: SCNNode?
  private var portalImage: UIImage?
  private var sessionRunning = false
  private var lastStatus: String?
  let onStatus = EventDispatcher()
  let onPlacement = EventDispatcher()

  var imageUri: String? {
    didSet {
      portalImage = imageUri.flatMap(Self.decodeImage)
      if portalImage == nil {
        removePortal()
        if imageUri != nil {
          emitStatus("error", message: "The portal image could not be decoded.")
        }
      }
      if let portalContentNode, let portalImage {
        updateMaterial(of: portalContentNode, with: portalImage)
      }
    }
  }

  var active = false {
    didSet {
      guard active != oldValue else { return }
      updateSession()
    }
  }

  required init(appContext: AppContext? = nil) {
    super.init(appContext: appContext)
    clipsToBounds = true

    sceneView.delegate = self
    sceneView.session.delegate = self
    sceneView.autoresizingMask = [.flexibleWidth, .flexibleHeight]
    sceneView.scene = SCNScene()
    sceneView.backgroundColor = .clear
    addSubview(sceneView)

    sceneView.addGestureRecognizer(UITapGestureRecognizer(target: self, action: #selector(handleTap(_:))))
    sceneView.addGestureRecognizer(UIPinchGestureRecognizer(target: self, action: #selector(handlePinch(_:))))
    sceneView.addGestureRecognizer(UIRotationGestureRecognizer(target: self, action: #selector(handleRotation(_:))))

    NotificationCenter.default.addObserver(
      self,
      selector: #selector(applicationDidBecomeActive),
      name: UIApplication.didBecomeActiveNotification,
      object: nil
    )
    NotificationCenter.default.addObserver(
      self,
      selector: #selector(applicationWillResignActive),
      name: UIApplication.willResignActiveNotification,
      object: nil
    )
  }

  override func layoutSubviews() {
    super.layoutSubviews()
    sceneView.frame = bounds
  }

  override func didMoveToWindow() {
    super.didMoveToWindow()
    updateSession()
  }

  deinit {
    NotificationCenter.default.removeObserver(self)
    stopSession(shouldEmitStatus: false)
  }

  @objc private func applicationDidBecomeActive() {
    updateSession()
  }

  @objc private func applicationWillResignActive() {
    stopSession(shouldEmitStatus: true)
  }

  private func updateSession() {
    guard active, window != nil, UIApplication.shared.applicationState == .active else {
      if sessionRunning {
        stopSession(shouldEmitStatus: true)
      } else if !active {
        emitStatus("inactive")
      }
      return
    }

    guard ARWorldTrackingConfiguration.isSupported else {
      stopSession(shouldEmitStatus: false)
      emitStatus("unsupported", message: "AR world tracking is not available on this device.")
      return
    }

    guard !sessionRunning else { return }

    let configuration = ARWorldTrackingConfiguration()
    configuration.planeDetection = [.vertical]
    configuration.worldAlignment = .gravity
    sceneView.session.run(configuration, options: [.resetTracking, .removeExistingAnchors])
    sessionRunning = true
  }

  private func stopSession(shouldEmitStatus: Bool) {
    sceneView.session.pause()
    sessionRunning = false
    removePortal()
    if shouldEmitStatus {
      emitStatus(active ? "paused" : "inactive")
    }
  }

  @objc private func handleTap(_ gesture: UITapGestureRecognizer) {
    guard active, sessionRunning else { return }

    let point = gesture.location(in: sceneView)
    guard let image = portalImage else {
      emitPlacement("noImage", message: "No portal image is available.")
      return
    }

    let targets: [ARRaycastQuery.Target] = [.existingPlaneGeometry, .estimatedPlane]
    for target in targets {
      guard let query = sceneView.raycastQuery(from: point, allowing: target, alignment: .vertical) else {
        continue
      }
      guard let result = sceneView.session.raycast(query).first else { continue }

      let wasReplacement = portalNode != nil
      removePortal()

      let width: CGFloat = 1.0
      let aspectRatio = max(image.size.width / max(image.size.height, 1), 0.01)
      let plane = SCNPlane(width: width, height: width / aspectRatio)
      plane.firstMaterial?.isDoubleSided = true
      plane.firstMaterial?.lightingModel = .constant
      plane.firstMaterial?.diffuse.contents = image

      let anchorNode = SCNNode()
      anchorNode.simdWorldTransform = result.worldTransform
      // ARKit's raycast transform uses the plane's x/z tangent axes. SCNPlane
      // uses x/y, so rotate its local y axis onto the plane's z tangent axis.
      let contentNode = SCNNode(geometry: plane)
      contentNode.eulerAngles.x = .pi / 2
      // The vertical raycast basis presents SceneKit's image texture inverted.
      // Rotate the portal in its own plane so the generated scene is upright.
      contentNode.eulerAngles.z = .pi
      anchorNode.addChildNode(contentNode)
      sceneView.scene.rootNode.addChildNode(anchorNode)
      portalNode = anchorNode
      portalContentNode = contentNode

      emitPlacement(wasReplacement ? "replaced" : "placed")
      return
    }

    emitPlacement("noRaycast", message: "No vertical surface was found at that point.")
  }

  @objc private func handlePinch(_ gesture: UIPinchGestureRecognizer) {
    guard active, let portalContentNode else { return }
    if gesture.state == .began || gesture.state == .changed {
      let scale = min(max(portalContentNode.scale.x * Float(gesture.scale), 0.25), 3.0)
      portalContentNode.scale = SCNVector3(scale, scale, scale)
      gesture.scale = 1.0
    }
  }

  @objc private func handleRotation(_ gesture: UIRotationGestureRecognizer) {
    guard active, let portalContentNode else { return }
    if gesture.state == .began || gesture.state == .changed {
      let halfRotation = Float(gesture.rotation) / 2
      let rotation = SCNQuaternion(0, 0, sin(halfRotation), cos(halfRotation))
      portalContentNode.localRotate(by: rotation)
      gesture.rotation = 0
    }
  }

  private func removePortal() {
    portalNode?.removeFromParentNode()
    portalNode = nil
    portalContentNode = nil
  }

  private func updateMaterial(of node: SCNNode, with image: UIImage) {
    guard let plane = node.geometry as? SCNPlane else { return }
    let aspectRatio = max(image.size.width / max(image.size.height, 1), 0.01)
    plane.height = plane.width / aspectRatio
    plane.firstMaterial?.diffuse.contents = image
  }

  private func emitStatus(_ state: String, reason: String? = nil, message: String? = nil) {
    guard lastStatus != state || reason != nil || message != nil else { return }
    lastStatus = state
    var payload: [String: Any] = ["state": state]
    if let reason { payload["reason"] = reason }
    if let message { payload["message"] = message }
    onStatus(payload)
  }

  private func emitPlacement(_ outcome: String, message: String? = nil) {
    var payload: [String: Any] = ["outcome": outcome]
    if let message { payload["message"] = message }
    onPlacement(payload)
  }

  private static func decodeImage(_ uri: String) -> UIImage? {
    let trimmed = uri.trimmingCharacters(in: .whitespacesAndNewlines)
    guard !trimmed.isEmpty else { return nil }

    let encoded: String
    if let commaIndex = trimmed.firstIndex(of: ","),
       trimmed[..<commaIndex].lowercased().contains(";base64") {
      encoded = String(trimmed[trimmed.index(after: commaIndex)...])
    } else {
      encoded = trimmed
    }

    let normalized = encoded
      .replacingOccurrences(of: "-", with: "+")
      .replacingOccurrences(of: "_", with: "/")
    let padding = String(repeating: "=", count: (4 - normalized.count % 4) % 4)
    guard let data = Data(base64Encoded: normalized + padding, options: [.ignoreUnknownCharacters]) else {
      return nil
    }
    return UIImage(data: data)
  }

  func session(_ session: ARSession, didFailWithError error: Error) {
    stopSession(shouldEmitStatus: false)
    emitStatus("failure", message: error.localizedDescription)
  }

  func sessionWasInterrupted(_ session: ARSession) {
    stopSession(shouldEmitStatus: false)
    emitStatus("interrupted", message: "The AR session was interrupted.")
  }

  func sessionInterruptionEnded(_ session: ARSession) {
    updateSession()
  }

  func session(_ session: ARSession, cameraDidChangeTrackingState camera: ARCamera) {
    switch camera.trackingState {
    case .normal:
      emitStatus("ready")
    case .notAvailable:
      emitStatus("unavailable", message: "AR camera tracking is unavailable.")
    case let .limited(reason):
      let reasonText = trackingReason(reason)
      emitStatus("limited", reason: reasonText, message: "AR camera tracking is limited.")
    }
  }

  private func trackingReason(_ reason: ARCamera.TrackingState.Reason) -> String {
    switch reason {
    case .initializing:
      return "initializing"
    case .excessiveMotion:
      return "excessiveMotion"
    case .insufficientFeatures:
      return "insufficientFeatures"
    case .relocalizing:
      return "relocalizing"
    @unknown default:
      return "unknown"
    }
  }
}
