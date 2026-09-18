const { existsSync } = require('node:fs');

// Everything static lives in app.json. This file exists only for the one value
// that depends on the filesystem: FCM needs google-services.json baked into the
// Android build, but a hard-coded path fails every prebuild until the file has
// been downloaded from Firebase — so it is wired in only once it is there.
const GOOGLE_SERVICES_FILE = './google-services.json';

/** @param {import('expo/config').ConfigContext} ctx @returns {import('expo/config').ExpoConfig} */
module.exports = ({ config }) => ({
  ...config,
  android: {
    ...config.android,
    ...(existsSync(GOOGLE_SERVICES_FILE) ? { googleServicesFile: GOOGLE_SERVICES_FILE } : {}),
  },
});
