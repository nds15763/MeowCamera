module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // Add React Native reanimated plugin if needed
      'react-native-reanimated/plugin',
      // Enable module resolver for path aliases
      [
        'module-resolver',
        {
          root: ['./'],
          extensions: ['.ios.js', '.android.js', '.js', '.ts', '.tsx', '.json'],
          alias: {
            '@': './'
          },
        },
      ],
    ],
  };
};
