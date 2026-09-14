module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ['babel-preset-expo', { jsxImportSource: 'nativewind' }],
    ],
    plugins: [
      ['module-resolver', {
        root: ['./src'],
        alias: { '@': './src' },
      }],
      'react-native-worklets/plugin', // MUST be last (Reanimated 4 moved the plugin here)
    ],
  };
};
