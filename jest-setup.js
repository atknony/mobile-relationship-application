/* eslint-env jest */

// Reanimated 4 delegates its native bindings to react-native-worklets, which
// has no native part under Jest. Mock it before anything imports Reanimated.
jest.mock('react-native-worklets', () => require('react-native-worklets/src/mock'));

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);
