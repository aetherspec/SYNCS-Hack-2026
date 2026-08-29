import { NativeModule, requireNativeModule } from 'expo';
import { Platform } from 'react-native';

declare class TripBackARModule extends NativeModule<{}> {}

const module =
  Platform.OS === 'ios'
    ? requireNativeModule<TripBackARModule>('TripBackAR')
    : new TripBackARModule();

export default module;
