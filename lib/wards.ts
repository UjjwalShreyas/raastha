/**
 * GHMC (Greater Hyderabad Municipal Corporation) Circles, Wards & Locality Registry.
 * Provides nearest-centroid lookup from lat/lng coordinates and ward choices for citizens.
 */

export interface GhmcWard {
  id: string;
  name: string;
  circle: string;
  locality: string;
  lat: number;
  lng: number;
}

export const GHMC_WARDS: GhmcWard[] = [
  {
    id: "ward-central",
    name: "Circle 8 - Abids & Nampally (Central Zone)",
    circle: "Circle 8",
    locality: "Abids, Nampally, Koti, Sultan Bazar",
    lat: 17.3888,
    lng: 78.4735,
  },
  {
    id: "ward-charminar",
    name: "Circle 10 - Charminar & Old City",
    circle: "Circle 10",
    locality: "Charminar, Falaknuma, Chandrayangutta",
    lat: 17.3616,
    lng: 78.4747,
  },
  {
    id: "ward-mehdipatnam",
    name: "Circle 12 - Mehdipatnam & Masab Tank",
    circle: "Circle 12",
    locality: "Mehdipatnam, Masab Tank, Asif Nagar",
    lat: 17.3916,
    lng: 78.4411,
  },
  {
    id: "ward-jubilee",
    name: "Circle 18 - Jubilee Hills & Banjara Hills",
    circle: "Circle 18",
    locality: "Jubilee Hills, Banjara Hills, Film Nagar",
    lat: 17.4259,
    lng: 78.4215,
  },
  {
    id: "ward-madhapur",
    name: "Circle 20 - Serilingampally (Madhapur & Hitec City)",
    circle: "Circle 20",
    locality: "Madhapur, Hitec City, Kondapur",
    lat: 17.4485,
    lng: 78.3772,
  },
  {
    id: "ward-gachibowli",
    name: "Circle 21 - Gachibowli & Financial District",
    circle: "Circle 21",
    locality: "Gachibowli, Nanakramguda, Financial District",
    lat: 17.4401,
    lng: 78.3489,
  },
  {
    id: "ward-kukatpally",
    name: "Circle 24 - Kukatpally & KPHB Colony",
    circle: "Circle 24",
    locality: "Kukatpally, KPHB Colony, Moosapet",
    lat: 17.4933,
    lng: 78.3995,
  },
  {
    id: "ward-secunderabad",
    name: "Circle 14 - Secunderabad & Begumpet",
    circle: "Circle 14",
    locality: "Secunderabad, Begumpet, Paradise, Marredpally",
    lat: 17.4399,
    lng: 78.4983,
  },
  {
    id: "ward-ameerpet",
    name: "Circle 16 - Ameerpet & Sanathnagar",
    circle: "Circle 16",
    locality: "Ameerpet, SR Nagar, Sanathnagar, Punjagutta",
    lat: 17.4375,
    lng: 78.4482,
  },
  {
    id: "ward-lb-nagar",
    name: "Circle 3 - LB Nagar & Dilsukhnagar",
    circle: "Circle 3",
    locality: "LB Nagar, Dilsukhnagar, Malakpet, Saroornagar",
    lat: 17.3688,
    lng: 78.5247,
  },
];

/**
 * Calculates the nearest GHMC circle/ward from given lat/lng coordinates.
 */
export function getNearestWard(lat: number, lng: number): string {
  if (!lat || !lng) {
    return GHMC_WARDS[0].name;
  }

  let minDistanceSq = Infinity;
  let nearestWardName = GHMC_WARDS[0].name;

  for (const ward of GHMC_WARDS) {
    const dLat = lat - ward.lat;
    const dLng = lng - ward.lng;
    const distSq = dLat * dLat + dLng * dLng;

    if (distSq < minDistanceSq) {
      minDistanceSq = distSq;
      nearestWardName = ward.name;
    }
  }

  return nearestWardName;
}
