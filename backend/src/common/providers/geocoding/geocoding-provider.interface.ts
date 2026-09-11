export interface GeocodingResult {
  lat: number;
  lng: number;
  formattedAddress?: string;
}

export interface IGeocodingProvider {
  geocode(address: string): Promise<GeocodingResult | null>;
  reverseGeocode(lat: number, lng: number): Promise<string | null>;
}
