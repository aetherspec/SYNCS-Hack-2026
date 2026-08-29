import ExpoModulesCore

public class TripBackARModule: Module {
  public func definition() -> ModuleDefinition {
    Name("TripBackAR")

    View(TripBackARView.self) {
      Events("onStatus", "onPlacement")

      Prop("imageUri") { (view: TripBackARView, imageUri: String?) in
        view.imageUri = imageUri
      }

      Prop("active") { (view: TripBackARView, active: Bool) in
        view.active = active
      }
    }
  }
}
