const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

// Exclude Android native build and cache directories from Metro file crawler
config.resolver.blockList = [
  /.*[/\\]android[/\\]app[/\\]build[/\\].*/,
  /.*[/\\]android[/\\]build[/\\].*/,
  /.*[/\\]android[/\\]\.gradle[/\\].*/,
  /.*[/\\]android[/\\]\.cxx[/\\].*/,
  /.*[/\\]dist[/\\].*/,
];

module.exports = withNativeWind(config, { input: "./global.css" });
