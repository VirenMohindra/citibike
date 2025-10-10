// Route Export Utilities
// Generate GPX and KML files from route data

import type { RouteInfo, StationWithStatus } from './types';
import { useAppStore } from './store';

/**
 * Export route as GPX (GPS Exchange Format)
 * Compatible with most GPS devices and cycling apps
 */
export function exportAsGPX(
  route: RouteInfo,
  startStation: StationWithStatus,
  endStation: StationWithStatus,
  waypoints: StationWithStatus[],
  routeName?: string
): string {
  const name = routeName || `Citibike: ${startStation.name} to ${endStation.name}`;
  const timestamp = new Date().toISOString();

  // Extract coordinates from route geometry
  const coordinates = route.geometry.coordinates as [number, number][];

  // Build waypoints string
  let waypointsXML = '';
  waypointsXML += `    <wpt lat="${startStation.lat}" lon="${startStation.lon}">
      <name>Start: ${escapeXML(startStation.name)}</name>
      <desc>Citibike Station</desc>
      <type>station</type>
    </wpt>\n`;

  waypoints.forEach((wp, index) => {
    waypointsXML += `    <wpt lat="${wp.lat}" lon="${wp.lon}">
      <name>Waypoint ${index + 1}: ${escapeXML(wp.name)}</name>
      <desc>Citibike Station</desc>
      <type>station</type>
    </wpt>\n`;
  });

  waypointsXML += `    <wpt lat="${endStation.lat}" lon="${endStation.lon}">
      <name>End: ${escapeXML(endStation.name)}</name>
      <desc>Citibike Station</desc>
      <type>station</type>
    </wpt>\n`;

  // Build track points string
  const trackPoints = coordinates
    .map(
      ([lon, lat]) => `        <trkpt lat="${lat}" lon="${lon}">
          <ele>0</ele>
        </trkpt>`
    )
    .join('\n');

  // Build complete GPX file
  const gpx = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="Citibike Route Planner" xmlns="http://www.topografix.com/GPX/1/1" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.topografix.com/GPX/1/1 http://www.topografix.com/GPX/1/1/gpx.xsd">
  <metadata>
    <name>${escapeXML(name)}</name>
    <desc>Cycling route planned with Citibike Route Planner</desc>
    <time>${timestamp}</time>
  </metadata>
${waypointsXML}
  <trk>
    <name>${escapeXML(name)}</name>
    <type>cycling</type>
    <trkseg>
${trackPoints}
    </trkseg>
  </trk>
</gpx>`;

  return gpx;
}

/**
 * Export route as KML (Keyhole Markup Language)
 * Compatible with Google Earth and Google Maps
 */
export function exportAsKML(
  route: RouteInfo,
  startStation: StationWithStatus,
  endStation: StationWithStatus,
  waypoints: StationWithStatus[],
  routeName?: string
): string {
  const name = routeName || `Citibike: ${startStation.name} to ${endStation.name}`;
  const timestamp = new Date().toISOString();

  // Extract coordinates from route geometry
  const coordinates = route.geometry.coordinates as [number, number][];

  // Build placemarks for stations
  let placemarks = '';
  placemarks += `    <Placemark>
      <name>Start: ${escapeXML(startStation.name)}</name>
      <description>Starting station</description>
      <styleUrl>#station-start</styleUrl>
      <Point>
        <coordinates>${startStation.lon},${startStation.lat},0</coordinates>
      </Point>
    </Placemark>\n`;

  waypoints.forEach((wp, index) => {
    placemarks += `    <Placemark>
      <name>Waypoint ${index + 1}: ${escapeXML(wp.name)}</name>
      <description>Waypoint station</description>
      <styleUrl>#station-waypoint</styleUrl>
      <Point>
        <coordinates>${wp.lon},${wp.lat},0</coordinates>
      </Point>
    </Placemark>\n`;
  });

  placemarks += `    <Placemark>
      <name>End: ${escapeXML(endStation.name)}</name>
      <description>Destination station</description>
      <styleUrl>#station-end</styleUrl>
      <Point>
        <coordinates>${endStation.lon},${endStation.lat},0</coordinates>
      </Point>
    </Placemark>\n`;

  // Build route path coordinates
  const pathCoordinates = coordinates.map(([lon, lat]) => `${lon},${lat},0`).join('\n          ');

  // Build complete KML file
  const kml = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>${escapeXML(name)}</name>
    <description>Cycling route planned with Citibike Route Planner on ${timestamp}</description>

    <!-- Styles -->
    <Style id="station-start">
      <IconStyle>
        <color>ff0066cc</color>
        <scale>1.2</scale>
        <Icon>
          <href>http://maps.google.com/mapfiles/kml/paddle/blu-circle.png</href>
        </Icon>
      </IconStyle>
    </Style>
    <Style id="station-waypoint">
      <IconStyle>
        <color>ff5c8bf6</color>
        <scale>1.0</scale>
        <Icon>
          <href>http://maps.google.com/mapfiles/kml/paddle/purple-circle.png</href>
        </Icon>
      </IconStyle>
    </Style>
    <Style id="station-end">
      <IconStyle>
        <color>ff4444ef</color>
        <scale>1.2</scale>
        <Icon>
          <href>http://maps.google.com/mapfiles/kml/paddle/red-circle.png</href>
        </Icon>
      </IconStyle>
    </Style>
    <Style id="route-path">
      <LineStyle>
        <color>ff0066cc</color>
        <width>4</width>
      </LineStyle>
    </Style>

    <!-- Stations -->
${placemarks}

    <!-- Route Path -->
    <Placemark>
      <name>Route Path</name>
      <description>Distance: ${formatDistanceForExport(route.distance)}, Duration: ${Math.round(route.duration / 60)} min</description>
      <styleUrl>#route-path</styleUrl>
      <LineString>
        <tessellate>1</tessellate>
        <coordinates>
          ${pathCoordinates}
        </coordinates>
      </LineString>
    </Placemark>
  </Document>
</kml>`;

  return kml;
}

/**
 * Download a file to the user's device
 */
export function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Format distance for export using user's preferred unit
 */
function formatDistanceForExport(meters: number): string {
  const distanceUnit = useAppStore.getState().distanceUnit;

  if (distanceUnit === 'miles') {
    const miles = meters / 1609.34;
    return `${miles.toFixed(2)} mi`;
  } else {
    const km = meters / 1000;
    return `${km.toFixed(2)} km`;
  }
}

/**
 * Escape XML special characters
 */
function escapeXML(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Generate a safe filename from route name
 */
export function generateFilename(
  startStation: StationWithStatus,
  endStation: StationWithStatus,
  extension: string
): string {
  const timestamp = new Date().toISOString().split('T')[0];
  const start = startStation.short_name || startStation.name.substring(0, 20);
  const end = endStation.short_name || endStation.name.substring(0, 20);
  const safeName = `citibike_${start}_to_${end}_${timestamp}`
    .replace(/[^a-z0-9_-]/gi, '_')
    .toLowerCase();
  return `${safeName}.${extension}`;
}
