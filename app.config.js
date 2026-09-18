const { existsSync } = require('node:fs');

// Everything static lives in app.json. This file exists only for the one value
// that depends on the environment: FCM needs google-services.json baked into
// the Android build. It is gitignored, so it comes from one of two places —
// an EAS file environment variable on cloud builds (EAS uploads the repo
// without ignored files), or the project root on a local build. If neither is
// there it is left out, and the build still works, just without FCM.
const LOCAL_GOOGLE_SERVICES = './google-services.json';

function googleServicesFile() {
  if (process.env.GOOGLE_SERVICES_JSON) return process.env.GOOGLE_SERVICES_JSON;
  if (existsSync(LOCAL_GOOGLE_SERVICES)) return LOCAL_GOOGLE_SERVICES;
  return undefined;
}

/** @param {import('expo/config').ConfigContext} ctx @returns {import('expo/config').ExpoConfig} */
module.exports = ({ config }) => {
  const file = googleServicesFile();
  return {
    ...config,
    android: {
      ...config.android,
      ...(file ? { googleServicesFile: file } : {}),
    },
  };
};
