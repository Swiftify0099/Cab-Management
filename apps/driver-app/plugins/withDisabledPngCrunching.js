const { withGradleProperties } = require('@expo/config-plugins');

/**
 * Expo Config Plugin to disable AAPT2 PNG crunching during release builds.
 * This prevents AAPT2 compile errors during Gradle release builds on EAS and locally.
 */
module.exports = function withDisabledPngCrunching(config) {
  return withGradleProperties(config, (config) => {
    config.modResults = config.modResults.filter(
      (item) => item.type !== 'property' || item.key !== 'android.enablePngCrunchInReleaseBuilds'
    );
    config.modResults.push({
      type: 'property',
      key: 'android.enablePngCrunchInReleaseBuilds',
      value: 'false',
    });
    return config;
  });
};
