import { registerRootComponent } from 'expo';

import App from './src/App';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It works the same in Expo Go and in a real EAS build.
registerRootComponent(App);
