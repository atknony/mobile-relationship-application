const { existsSync } = require('node:fs');

// Everything static lives in app.json. This file exists only for the one value
// that depends on the environment: FCM needs google-services.json baked into
// the Android build. It is gitignored, so it comes from one of two places —
// an EAS file environment variable on cloud builds (EAS uploads the repo
// without ignored files), or the project root on a local build. If neither is
// there it is left out, and the build still works, just without FCM.
//
// "Still works" is the trap: a build without it installs and runs normally,
// but Android cannot issue a push token, so no push ever arrives and nothing
// says why. That is exactly what the 19 Sep dev build did (the file had just
// been gitignored and no EAS variable existed). So say it, loudly, in the
// build log — `eas env:list --environment <env>` must show GOOGLE_SERVICES_JSON.
const LOCAL_GOOGLE_SERVICES = './google-services.json';

function googleServicesFile() {
  if (process.env.GOOGLE_SERVICES_JSON) return process.env.GOOGLE_SERVICES_JSON;
  if (existsSync(LOCAL_GOOGLE_SERVICES)) return LOCAL_GOOGLE_SERVICES;
  console.warn(
    [
      '',
      '⚠️  No google-services.json: this Android build will have NO push notifications.',
      '   Cloud build: eas env:create --name GOOGLE_SERVICES_JSON --type file' +
        ' --value ./google-services.json --environment <env> --visibility secret',
      '   Local build: put google-services.json in the project root.',
      '',
    ].join('\n')
  );
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
