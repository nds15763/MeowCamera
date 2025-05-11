// This file imports and configures all required polyfills for Supabase in React Native

// Import the node-libs-react-native package
const nodeLibs = require('node-libs-react-native');

// Inject the polyfills into the global scope
// This allows Supabase to use Node.js modules without errors
Object.keys(nodeLibs).forEach((lib) => {
  if (lib === 'process') {
    // Special handling for process
    global.process = nodeLibs.process;
  } else {
    global[lib] = nodeLibs[lib];
  }
});

// Add URL polyfills - required for Supabase
require('react-native-url-polyfill/auto');

// Add any additional global configurations needed for your app
