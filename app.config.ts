// Adds settings that come from secrets / environment on top of app.json.
// ADMOB_IOS_APP_ID: your real AdMob iOS App ID (set it in EAS env before release).
// Without it the app uses Google's public TEST App ID, which only shows test ads.
import type { ConfigContext, ExpoConfig } from 'expo/config';

const GOOGLE_TEST_IOS_APP_ID = 'ca-app-pub-3940256099942544~1458002511';
const GOOGLE_TEST_ANDROID_APP_ID = 'ca-app-pub-3940256099942544~3347511713';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...(config as ExpoConfig),
  plugins: [
    ...(config.plugins ?? []),
    'expo-notifications',
    [
      'react-native-google-mobile-ads',
      {
        iosAppId: process.env.ADMOB_IOS_APP_ID || GOOGLE_TEST_IOS_APP_ID,
        androidAppId: process.env.ADMOB_ANDROID_APP_ID || GOOGLE_TEST_ANDROID_APP_ID,
        skAdNetworkItems: ['cstr6suwn9.skadnetwork'],
      },
    ],
  ],
});
