import { NextRequest, NextResponse } from "next/server";

export interface GeocodeResult {
  name: string;
  address: string;
  lat: number;
  lng: number;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim();

  if (!q || q.length < 2) {
    return NextResponse.json({ results: [] });
  }

  const orsKey = process.env.ORS_API_KEY;

  // 1. Try ORS geocoding if key is present
  if (orsKey) {
    try {
      const orsUrl = `https://api.openrouteservice.org/geocode/search?api_key=${orsKey}&text=${encodeURIComponent(
        q
      )}&boundary.rect.min_lon=78.1&boundary.rect.min_lat=17.1&boundary.rect.max_lon=78.7&boundary.rect.max_lat=17.6&boundary.country=IND&size=5`;

      const res = await fetch(orsUrl);
      if (res.ok) {
        const json = await res.json();
        const features = json?.features;
        if (Array.isArray(features) && features.length > 0) {
          const results: GeocodeResult[] = features.map((f: any) => ({
            name: f.properties?.name || f.properties?.label || q,
            address: f.properties?.label || f.properties?.region || "Hyderabad, Telangana",
            lat: f.geometry.coordinates[1],
            lng: f.geometry.coordinates[0],
          }));
          return NextResponse.json({ results, provider: "openrouteservice" });
        }
      }
    } catch {
      // Fall through to Nominatim
    }
  }

  // 2. OpenStreetMap Nominatim with Hyderabad viewport bounding box
  try {
    const nominatimUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
      q + " Hyderabad"
    )}&format=json&limit=5&addressdetails=1&viewbox=78.1,17.6,78.7,17.1`;

    const res = await fetch(nominatimUrl, {
      headers: {
        "User-Agent": "Raastha-Civic-Safety-App/1.0 (hyderabad-civic-safety)",
        "Accept-Language": "en",
      },
    });

    if (!res.ok) {
      return NextResponse.json({ results: [], error: `Geocoding status ${res.status}` });
    }

    const data = await res.json();
    if (!Array.isArray(data)) {
      return NextResponse.json({ results: [] });
    }

    const results: GeocodeResult[] = data.map((item: any) => {
      const parts = (item.display_name || "").split(",");
      const shortName = item.name || parts[0]?.trim() || q;
      const subtitle = parts.slice(1, 4).join(",").trim() || "Hyderabad, Telangana";

      return {
        name: shortName,
        address: subtitle,
        lat: parseFloat(item.lat),
        lng: parseFloat(item.lon),
      };
    });

    return NextResponse.json({ results, provider: "nominatim" });
  } catch (err: any) {
    return NextResponse.json({ results: [], error: err?.message || "Geocoding request failed" });
  }
}
