// metro.config.js
const { getDefaultConfig } = require('expo/metro-config');
const nodeLibs = require('node-libs-react-native');

// Add additional native modules here if needed
const extraNodeModules = {
  ...nodeLibs,
  // Add other modules that need to be polyfilled:
  stream: require.resolve('stream-browserify'),
  crypto: require.resolve('crypto-browserify'),
  http: require.resolve('stream-http'),
  https: require.resolve('https-browserify'),
  os: require.resolve('os-browserify/browser'),
  net: require.resolve('react-native-tcp-socket'),
  fs: require.resolve('react-native-level-fs'),
  path: require.resolve('path-browserify'),
  // Add empty implementation for tls and other required Node modules
  tls: require.resolve('./polyfills/tls-polyfill'),
  zlib: require.resolve('browserify-zlib'),
  child_process: require.resolve('./polyfills/child_process-polyfill'),
  dgram: require.resolve('./polyfills/dgram-polyfill'),
};

// Get the default Expo config
const config = getDefaultConfig(__dirname);

// Add our custom resolver config
config.resolver.extraNodeModules = extraNodeModules;

module.exports = config;
