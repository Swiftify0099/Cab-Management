export default ({ config }) => {
  const apiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || "AIzaSyCZw4DVNyJwP85ZeDG1y_x8DLQ7bF8J0EU";
  return {
    ...config,
    android: {
      ...config.android,
      permissions: [
        ...(config.android?.permissions || []),
        "ACCESS_FINE_LOCATION",
        "ACCESS_COARSE_LOCATION",
      ],
      config: {
        ...config.android?.config,
        googleMaps: {
          apiKey: apiKey
        }
      }
    },
    ios: {
      ...config.ios,
      infoPlist: {
        ...config.ios?.infoPlist,
        NSLocationWhenInUseUsageDescription:
          "Swiftify needs your location to find nearby drivers on your route.",
        NSLocationAlwaysAndWhenInUseUsageDescription:
          "Swiftify uses your location to match you with drivers along your route.",
      },
      config: {
        ...config.ios?.config,
        googleMapsApiKey: apiKey
      }
    }
  };
};
