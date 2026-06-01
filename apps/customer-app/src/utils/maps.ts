import axios from 'axios'

const HEADERS = {
  'User-Agent': 'SwiftifyCabApp/1.0 (contact@swiftify.com)'
}

// Nominatim Free Geocoding API
export const geocodeCity = async (city: string): Promise<{ lat: number; lon: number } | null> => {
  try {
    const res = await axios.get(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(city)}&format=json&limit=1`,
      { headers: HEADERS }
    )
    if (res.data && res.data.length > 0) {
      return {
        lat: parseFloat(res.data[0].lat),
        lon: parseFloat(res.data[0].lon),
      }
    }
    return null
  } catch (error) {
    console.error('Geocoding error:', error)
    return null
  }
}

// OpenRouteService Free Routing API
export const getRoutePolyline = async (
  start: { lat: number; lon: number },
  end: { lat: number; lon: number },
  apiKey: string
): Promise<Array<{ latitude: number; longitude: number }> | null> => {
  try {
    const res = await axios.get(
      `https://api.openrouteservice.org/v2/directions/driving-car?api_key=${apiKey}&start=${start.lon},${start.lat}&end=${end.lon},${end.lat}`
    )
    
    // OpenRouteService returns an encoded polyline or coordinates.
    // By default, v2/directions/driving-car GET returns a FeatureCollection with GeoJSON geometry.
    const coordinates = res.data?.features?.[0]?.geometry?.coordinates
    if (coordinates && Array.isArray(coordinates)) {
      return coordinates.map((coord: [number, number]) => ({
        latitude: coord[1],
        longitude: coord[0],
      }))
    }
    return null
  } catch (error) {
    console.error('Routing error:', error)
    return null
  }
}
