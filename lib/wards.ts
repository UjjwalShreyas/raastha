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
  {
    id: "ward-pedda-amberpet",
    name: "Pedda Amberpet Municipality (New Life Villas & ORR Exit 11)",
    circle: "Pedda Amberpet",
    locality: "Pedda Amberpet, Sy No 246, 248 & 249, New Life Villas, NH65",
    lat: 17.3231,
    lng: 78.6185,
  },
];

export interface NearbyAuthority {
  id: string;
  name: string;
  department: string;
  officialRole: string;
  zone: string;
  wardOrCircle: string;
  nodalEmail: string;
  contactNumber: string;
  lat: number;
  lng: number;
  distanceKm?: number;
}

export const STATE_AND_MUNICIPAL_AUTHORITIES: NearbyAuthority[] = [
  {
    id: "auth-ghmc-west",
    name: "GHMC West Zone & Serilingampally Division",
    department: "Municipal Administration & Urban Development (MA&UD)",
    officialRole: "Zonal Commissioner & Superintending Engineer",
    zone: "West Zone (HITEC City / Madhapur / Gachibowli)",
    wardOrCircle: "Circle 20 & 21",
    nodalEmail: "zc-west@ghmc.gov.in",
    contactNumber: "+91 40 2111 1111",
    lat: 17.4485,
    lng: 78.3772,
  },
  {
    id: "auth-ghmc-central",
    name: "GHMC Central Zone & Khairatabad Division",
    department: "Municipal Administration & Urban Development (MA&UD)",
    officialRole: "Zonal Commissioner & Executive Engineer (Civil)",
    zone: "Central Zone (Abids / Nampally / Punjagutta / Banjara Hills)",
    wardOrCircle: "Circle 8 & 18",
    nodalEmail: "zc-central@ghmc.gov.in",
    contactNumber: "+91 40 2111 2222",
    lat: 17.4156,
    lng: 78.4350,
  },
  {
    id: "auth-ghmc-charminar",
    name: "GHMC South Zone & Charminar Division",
    department: "Municipal Administration & Urban Development (MA&UD)",
    officialRole: "Zonal Commissioner & Executive Engineer",
    zone: "South Zone (Old City / Charminar / Falaknuma)",
    wardOrCircle: "Circle 9 & 10",
    nodalEmail: "zc-south@ghmc.gov.in",
    contactNumber: "+91 40 2111 3333",
    lat: 17.3616,
    lng: 78.4747,
  },
  {
    id: "auth-ghmc-secunderabad",
    name: "GHMC North Zone & Secunderabad Division",
    department: "Municipal Administration & Urban Development (MA&UD)",
    officialRole: "Zonal Commissioner & Superintending Engineer (North)",
    zone: "North Zone (Secunderabad / Begumpet / Marredpally)",
    wardOrCircle: "Circle 14 & 15",
    nodalEmail: "zc-north@ghmc.gov.in",
    contactNumber: "+91 40 2111 4444",
    lat: 17.4399,
    lng: 78.4983,
  },
  {
    id: "auth-ghmc-kukatpally",
    name: "GHMC Kukatpally Zonal Directorate",
    department: "Municipal Administration & Urban Development (MA&UD)",
    officialRole: "Zonal Commissioner & Chief Town Planner",
    zone: "North-West Zone (Kukatpally / KPHB / Moosapet / Miyapur)",
    wardOrCircle: "Circle 24",
    nodalEmail: "zc-kukatpally@ghmc.gov.in",
    contactNumber: "+91 40 2111 5555",
    lat: 17.4933,
    lng: 78.3995,
  },
  {
    id: "auth-ghmc-lbnagar",
    name: "GHMC East Zone & LB Nagar Directorate",
    department: "Municipal Administration & Urban Development (MA&UD)",
    officialRole: "Zonal Commissioner & Superintending Engineer",
    zone: "East Zone (LB Nagar / Dilsukhnagar / Saroornagar)",
    wardOrCircle: "Circle 3",
    nodalEmail: "zc-east@ghmc.gov.in",
    contactNumber: "+91 40 2111 6666",
    lat: 17.3688,
    lng: 78.5247,
  },
  {
    id: "auth-rb-telangana",
    name: "Telangana Roads & Buildings Department (R&B)",
    department: "Roads & Buildings Directorate, Govt. of Telangana",
    officialRole: "Chief Engineer (National Highways & State Corridors)",
    zone: "Telangana State Highway Command Cell",
    wardOrCircle: "Statewide Road Grid",
    nodalEmail: "ce-rb@telangana.gov.in",
    contactNumber: "+91 40 2345 0345",
    lat: 17.4065,
    lng: 78.4772,
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

/**
 * Haversine formula to compute great-circle distance in kilometers.
 */
function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

/**
 * Finds the nearest State or Municipal Authority based on user coordinates.
 */
export function getNearestAuthority(lat: number, lng: number): NearbyAuthority {
  if (!lat || !lng) {
    const defaultAuth = STATE_AND_MUNICIPAL_AUTHORITIES[0];
    return { ...defaultAuth, distanceKm: 1.2 };
  }

  let minDistance = Infinity;
  let nearest = STATE_AND_MUNICIPAL_AUTHORITIES[0];

  for (const auth of STATE_AND_MUNICIPAL_AUTHORITIES) {
    const dist = calculateDistanceKm(lat, lng, auth.lat, auth.lng);
    if (dist < minDistance) {
      minDistance = dist;
      nearest = auth;
    }
  }

  return {
    ...nearest,
    distanceKm: minDistance,
  };
}
