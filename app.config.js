const PROD_API_URL = "https://soultalkapp.com/api";
const apiBaseUrl = process.env.API_BASE_URL || PROD_API_URL;

// so-153d: Adapty SDK keys.
// ADAPTY_PUBLIC_SDK_KEY env var is set in EAS build profile secrets:
//   - preview/development builds: set to the Adapty SANDBOX public key
//     (format: public_live_...  obtained from Adapty dashboard → App → iOS)
//   - production/TestFlight builds: set to the Adapty PRODUCTION public key
//     (format: public_live_...  provided by Overseer once Adapty app is configured)
// The key is public-side only — safe to bundle into the app binary.
// The server-side ADAPTY_WEBHOOK_SECRET is stored in SSM, never in client config.
const adaptyPublicSdkKey = process.env.ADAPTY_PUBLIC_SDK_KEY || "";

const appJson = require("./app.json");

module.exports = ({ config }) => ({
  ...appJson.expo,
  extra: {
    ...appJson.expo.extra,
    apiConfig: {
      baseUrl: apiBaseUrl,
    },
    // so-153d: Adapty subscription SDK config.
    // Access in code: Constants.expoConfig?.extra?.adaptyConfig?.publicSdkKey
    adaptyConfig: {
      publicSdkKey: adaptyPublicSdkKey,
    },
  },
});
