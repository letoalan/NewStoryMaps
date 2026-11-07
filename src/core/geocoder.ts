/**
 * StoryMap — Service de géocodage et recherche de lieux
 */

export interface GeoSearchResult {
  name: string;
  lat: number;
  lng: number;
  displayName: string;
}

export async function searchPlaces(query: string): Promise<GeoSearchResult[]> {
  if (!query || query.trim().length < 2) return [];

  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
    query
  )}&limit=5&addressdetails=1`;

  try {
    const response = await fetch(url, {
      headers: {
        'Accept-Language': 'fr,en',
      },
    });
    if (!response.ok) return [];
    const data = await response.json();
    return data.map((item: any) => ({
      name: item.name || item.display_name.split(',')[0],
      displayName: item.display_name,
      lat: parseFloat(item.lat),
      lng: parseFloat(item.lon),
    }));
  } catch (err) {
    console.error('Erreur géocodage:', err);
    return [];
  }
}

