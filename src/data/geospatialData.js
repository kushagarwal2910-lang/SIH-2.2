/**
 * Geospatial Vector Datasets for North Indian Ocean Domain (0°N - 25°N, 50°E - 95°E)
 * Includes Indian Subcontinent Coastline, Islands, and the Official Indian EEZ Boundary.
 */

// 1. Indian Mainland Coastline Vector Coordinates [lon, lat]
export const INDIA_COASTLINE = [
  // West Coast (Gujarat to Kanyakumari)
  [68.18, 23.85], [68.85, 23.10], [69.20, 22.85], [69.75, 22.45], [69.05, 22.25],
  [69.60, 21.60], [70.20, 20.90], [71.00, 20.75], [71.85, 21.05], [72.20, 21.75],
  [72.65, 21.50], [72.85, 21.15], [72.80, 20.00], [72.82, 19.00], [73.00, 18.00],
  [73.30, 16.50], [73.80, 15.50], [74.20, 14.50], [74.75, 13.50], [75.25, 12.00],
  [75.80, 11.25], [76.25, 9.95],  [76.60, 8.80],  [77.55, 8.08], // Kanyakumari

  // East Coast (Kanyakumari to West Bengal)
  [78.15, 8.80],  [78.80, 9.30],  [79.20, 9.80],  [79.85, 10.35], [79.85, 11.20],
  [80.25, 13.08], [80.15, 14.50], [80.50, 15.80], [81.50, 16.30], [82.25, 16.90],
  [83.30, 17.70], [84.20, 18.50], [85.10, 19.40], [86.70, 20.50], [87.50, 21.50],
  [88.30, 21.65], [89.00, 21.80],
];

// 2. Sri Lanka Coastline [lon, lat]
export const SRI_LANKA_COASTLINE = [
  [79.70, 9.75], [80.30, 9.85], [80.90, 9.00], [81.30, 8.60], [81.85, 7.40],
  [81.80, 6.70], [81.00, 5.90], [80.20, 6.05], [79.80, 6.95], [79.80, 8.00],
  [79.70, 9.75],
];

// 3. Andaman & Nicobar Archipelago [lon, lat]
export const ANDAMAN_ISLANDS = [
  [92.80, 13.50], [93.00, 13.10], [92.75, 12.50], [92.70, 11.70], [92.60, 11.50],
  [92.80, 11.60], [92.95, 12.30], [93.10, 13.30], [92.80, 13.50],
];

export const NICOBAR_ISLANDS = [
  [92.70, 9.20], [92.90, 8.50], [93.60, 7.30], [93.85, 6.80],
  [93.70, 7.10], [92.80, 8.20], [92.70, 9.20],
];

// 4. Lakshadweep Archipelago [lon, lat]
export const LAKSHADWEEP_ISLANDS = [
  [71.90, 12.30], [72.20, 11.75], [72.65, 10.55], [73.00, 10.05],
  [73.65, 10.85], [72.75, 11.20], [71.90, 12.30],
];

// 5. Official Indian Exclusive Economic Zone (EEZ) Boundary Polygon [lon, lat]
// (200 Nautical Mile sovereign ocean frontier: ~2.37 million sq km)
export const INDIA_EEZ_BOUNDARY = [
  // Western EEZ (Arabian Sea frontier)
  [65.50, 23.50], [66.00, 22.00], [67.00, 20.50], [68.00, 19.00], [69.00, 17.50],
  [70.00, 15.00], [70.50, 13.00], [71.00, 11.00], [71.50, 9.00],  [72.50, 7.00],
  [73.50, 5.50],  [75.00, 4.50],  [77.00, 5.00],  [78.50, 6.00],

  // Southern tip & Palk Strait delimitation with Sri Lanka
  [79.50, 7.50],  [80.00, 8.50],  [80.50, 9.50],

  // Eastern EEZ (Bay of Bengal frontier)
  [82.00, 10.00], [83.50, 11.50], [85.00, 13.50], [86.50, 15.50], [88.00, 17.50],
  [89.50, 19.00], [90.00, 20.50], [89.50, 21.50],

  // Andaman & Nicobar EEZ Frontier
  [90.50, 14.50], [91.00, 13.00], [91.20, 10.50], [91.50, 8.00],  [92.50, 5.50],
  [94.50, 5.00],  [95.50, 6.50],  [95.20, 9.00],  [94.80, 11.50], [94.50, 14.00],
];

// 6. Prominent Marine Research Hubs & INCOIS Stations
export const KEY_STATIONS = [
  { name: 'INCOIS HQ', city: 'Hyderabad', lat: 17.54, lon: 78.38, role: 'Ocean State Forecast Center' },
  { name: 'NIOT HQ', city: 'Chennai', lat: 12.93, lon: 80.23, role: 'Moored Buoy & Glider Ops' },
  { name: 'NIO HQ', city: 'Goa', lat: 15.45, lon: 73.80, role: 'Oceanographic Research' },
  { name: 'CIFT / CMFRI', city: 'Kochi', lat: 9.97, lon: 76.28, role: 'Fisheries Advisory' },
];
