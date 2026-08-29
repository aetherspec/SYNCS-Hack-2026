import { TripBackARViewProps } from './TripBackAR.types';
import { View } from 'react-native';

// ARKit is not available on the web. Keep the wrapper renderable so shared
// screens can safely include it when running in a browser.
export default function TripBackARView(props: TripBackARViewProps) {
  return <View style={props.style} />;
}
