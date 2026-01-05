/**
 * Calculate the distance between two GPS coordinates using the Haversine formula
 * @param lat1 Latitude of first point
 * @param lon1 Longitude of first point
 * @param lat2 Latitude of second point
 * @param lon2 Longitude of second point
 * @returns Distance in meters
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000 // Earth's radius in meters

  const toRad = (deg: number) => (deg * Math.PI) / 180

  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

  return R * c
}

/**
 * Maximum allowed distance from classroom in meters
 * Configurable via MAX_DISTANCE_METERS environment variable
 */
export const MAX_DISTANCE_METERS = parseInt(process.env.MAX_DISTANCE_METERS || '100', 10)

/**
 * Check if a student is within the allowed proximity
 */
export function isWithinProximity(distanceMeters: number): boolean {
  return distanceMeters <= MAX_DISTANCE_METERS
}

