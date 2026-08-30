const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

const escapeRegex = (str) => str.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
const projectRoot = escapeRegex(__dirname);

// Anchor blockList to project root so node_modules/xyz/dist is NOT blocked
config.resolver.blockList = [
  new RegExp(`^${projectRoot}[/\\\\]android[/\\\\]app[/\\\\]build[/\\\\].*`),
  new RegExp(`^${projectRoot}[/\\\\]android[/\\\\]build[/\\\\].*`),
  new RegExp(`^${projectRoot}[/\\\\]android[/\\\\]\\.gradle[/\\\\].*`),
  new RegExp(`^${projectRoot}[/\\\\]android[/\\\\]\\.cxx[/\\\\].*`),
  new RegExp(`^${projectRoot}[/\\\\]dist[/\\\\].*`),
];

module.exports = withNativeWind(config, { input: "./global.css" });
