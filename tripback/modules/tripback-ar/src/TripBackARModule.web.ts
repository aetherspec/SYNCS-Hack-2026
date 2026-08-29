import { registerWebModule, NativeModule } from 'expo';

// TripBackARModule is not available on the web platform.
class TripBackARModule extends NativeModule<{}> {}

export default registerWebModule(TripBackARModule, 'TripBackARModule');
