const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Add mov to asset extensions
config.resolver.assetExts.push('mov');

module.exports = config;
