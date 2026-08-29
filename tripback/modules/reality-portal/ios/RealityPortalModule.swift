import ExpoModulesCore

public class RealityPortalModule: Module {
  public func definition() -> ModuleDefinition {
    Name("RealityPortal")

    View(RealityPortalView.self) {
      Events("onTrackingFailed")
      Prop("imageBase64") { (view: RealityPortalView, value: String?) in
        view.imageBase64 = value ?? ""
      }
      Prop("originHeading") { (view: RealityPortalView, value: Double?) in
        view.originHeading = value ?? 0
      }
    }
  }
}
