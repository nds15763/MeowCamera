// globals.js - Polyfills for React Native

// Direct require of node-libs-react-native instead of importing globals
const nodeLibs = require('node-libs-react-native');

// Apply all node libs to the global scope
Object.keys(nodeLibs).forEach((lib) => {
  // Special handling for process
  if (lib === 'process') {
    global.process = nodeLibs.process;
  } else {
    global[lib] = nodeLibs[lib];
  }
});

// This ensures proper URL handling in React Native
require('react-native-url-polyfill/auto');

// Ensure Buffer is defined (needed for many crypto operations)
global.Buffer = global.Buffer || require('buffer').Buffer;

// Install necessary polyfills for Supabase
try {
  require('react-native-get-random-values');
} catch (e) {
  console.warn('react-native-get-random-values not available, some crypto features may not work');
}
