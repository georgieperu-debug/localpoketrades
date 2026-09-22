import axios from "axios";

export class InvalidPostcodeError extends Error {}

/**
 * Geocodes a UK postcode via postcodes.io (free, no API key). Used at
 * profile-setup time so matching/radius filtering can run on lat/lng
 * without ever needing precise GPS from the user.
 */
export async function geocodePostcode(postcode: string): Promise<{ lat: number; lng: number }> {
  const normalized = postcode.trim().toUpperCase();
  try {
    const res = await axios.get<{ result: { latitude: number; longitude: number } }>(
      `https://api.postcodes.io/postcodes/${encodeURIComponent(normalized)}`,
      { timeout: 10000 }
    );
    return { lat: res.data.result.latitude, lng: res.data.result.longitude };
  } catch (err) {
    if (axios.isAxiosError(err) && err.response?.status === 404) {
      throw new InvalidPostcodeError(`"${postcode}" doesn't look like a valid UK postcode`);
    }
    throw err;
  }
}

const EARTH_RADIUS_MILES = 3958.8;

/** Great-circle distance between two lat/lng points, in miles. */
export function distanceMiles(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return EARTH_RADIUS_MILES * 2 * Math.asin(Math.sqrt(h));
}
