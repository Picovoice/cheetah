module.exports = {
  root: true,
  extends: '@react-native-community',
  plugins: ['detox'],
  overrides: [
    {
      files: ['e2e/**/*.test.js'],
      env: {
        'detox/detox': true,
        jest: true,
        'jest/globals': true,
      },
    },
  ],
};
