'use client';

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import mapboxgl from 'mapbox-gl';
import Supercluster from 'supercluster';
import type { StationWithStatus } from '@/lib/types';
import { useAppStore } from '@/lib/store';
import { useI18n } from '@/lib/i18n';
import { useTheme } from '@/lib/theme-context';
import {
  COMMON_MAP_OPTIONS,
  CLUSTER_OPTIONS,
  getMapboxStyle,
  getDirectionsUrl,
  FIT_BOUNDS_OPTIONS,
  FLY_TO_OPTIONS,
} from '@/config/mapbox';
import 'mapbox-gl/dist/mapbox-gl.css';

interface MapProps {
  stations?: StationWithStatus[];
  routeProfile?: 'fastest' | 'safest' | 'scenic' | 'insane';
}

interface MarkerData {
  marker: mapboxgl.Marker;
  element: HTMLDivElement;
  station?: StationWithStatus;
  clusterId?: number;
  pointCount?: number;
}

type ClusterPoint = {
  type: 'Feature';
  properties: {
    cluster: boolean;
    station?: StationWithStatus;
    point_count?: number;
  };
  geometry: {
    type: 'Point';
    coordinates: [number, number];
  };
};

export default function MapComponent(props: MapProps = { stations: [], routeProfile: 'fastest' }) {
  const { stations = [], routeProfile = 'fastest' } = props || {};
  const { t } = useI18n();
  const { resolvedTheme } = useTheme();

  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markers = useRef<Map<string, MarkerData>>(new Map());
  const sharedPopup = useRef<mapboxgl.Popup | null>(null);
  const supercluster = useRef<Supercluster | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [zoom, setZoom] = useState(12);
  const [bounds, setBounds] = useState<mapboxgl.LngLatBounds | null>(null);
  const [initialPositionSet, setInitialPositionSet] = useState(false);
  const userLocationMarker = useRef<mapboxgl.Marker | null>(null);

  const {
    startStation,
    endStation,
    waypoints,
    setStartStation,
    setEndStation,
    hoveredStation,
    setHoveredStation,
    setRoute,
  } = useAppStore();

  // Initialize supercluster with station data
  useEffect(() => {
    if (stations.length === 0) return;

    const cluster = new Supercluster(CLUSTER_OPTIONS);

    // Convert stations to GeoJSON points
    const points: ClusterPoint[] = stations
      .filter((s) => s.is_installed)
      .map((station) => ({
        type: 'Feature' as const,
        properties: {
          cluster: false,
          station,
        },
        geometry: {
          type: 'Point' as const,
          coordinates: [station.lon, station.lat] as [number, number],
        },
      }));

    cluster.load(points);
    supercluster.current = cluster;

    console.log(`🗺️ Supercluster initialized with ${points.length} stations`);
  }, [stations]);

  // Helper function to calculate marker color
  const getMarkerColor = useCallback(
    (station: StationWithStatus, isStart: boolean, isEnd: boolean, isWaypoint: boolean) => {
      if (isStart) return '#3B82F6'; // blue-500
      if (isEnd) return '#EF4444'; // red-500
      if (isWaypoint) return '#8B5CF6'; // purple-500

      const bikesAvailable = station.num_bikes_available ?? 0;
      if (bikesAvailable > 5) return '#10B981'; // green-500
      if (bikesAvailable > 0) return '#F59E0B'; // amber-500
      return '#9CA3AF'; // gray-400
    },
    []
  );

  // Helper function to generate popup HTML
  const generatePopupHTML = useCallback(
    (station: StationWithStatus) => {
      const regularBikes = (station.num_bikes_available ?? 0) - (station.num_ebikes_available ?? 0);
      const isDark = resolvedTheme === 'dark';
      return `
      <div class="p-2 ${isDark ? 'bg-gray-800' : 'bg-white'}">
        <h3 class="font-semibold text-sm mb-1 ${isDark ? 'text-gray-100' : 'text-gray-900'}">${station.name}</h3>
        <div class="text-xs space-y-0.5">
          <div class="flex justify-between">
            <span class="${isDark ? 'text-gray-300' : 'text-gray-700'}">${t('map.station.regularBikes')}:</span>
            <span class="font-medium ${isDark ? 'text-gray-100' : 'text-gray-900'}">${regularBikes}</span>
          </div>
          <div class="flex justify-between">
            <span class="${isDark ? 'text-gray-300' : 'text-gray-700'}">${t('map.station.eBikes')}:</span>
            <span class="font-medium ${isDark ? 'text-gray-100' : 'text-gray-900'}">${station.num_ebikes_available ?? 0}</span>
          </div>
          <div class="flex justify-between">
            <span class="${isDark ? 'text-gray-300' : 'text-gray-700'}">${t('map.station.docksAvailable')}:</span>
            <span class="font-medium ${isDark ? 'text-gray-100' : 'text-gray-900'}">${station.num_docks_available ?? 0}</span>
          </div>
        </div>
      </div>
    `;
    },
    [t, resolvedTheme]
  );

  // Get clusters and points for current viewport
  const clustersAndPoints = useMemo(() => {
    if (!supercluster.current || !bounds) return [];

    const bbox: [number, number, number, number] = [
      bounds.getWest(),
      bounds.getSouth(),
      bounds.getEast(),
      bounds.getNorth(),
    ];

    return supercluster.current.getClusters(bbox, Math.floor(zoom));
  }, [bounds, zoom]);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    const mapStyle = getMapboxStyle(resolvedTheme === 'dark' ? 'dark' : 'light');

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: mapStyle,
      ...COMMON_MAP_OPTIONS,
    });

    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');
    map.current.addControl(new mapboxgl.AttributionControl({ compact: true }), 'bottom-right');

    // Create shared popup once
    sharedPopup.current = new mapboxgl.Popup({
      offset: 15,
      closeButton: false,
      closeOnClick: false,
      maxWidth: '300px',
      className: 'citibike-popup',
    });

    map.current.on('load', () => {
      setMapLoaded(true);
      if (map.current) {
        setBounds(map.current.getBounds());
        setZoom(map.current.getZoom());

        // Add source and layer for route
        map.current.addSource('route', {
          type: 'geojson',
          data: {
            type: 'Feature',
            properties: {},
            geometry: {
              type: 'LineString',
              coordinates: [],
            },
          },
        });

        map.current.addLayer({
          id: 'route',
          type: 'line',
          source: 'route',
          layout: {
            'line-join': 'round',
            'line-cap': 'round',
          },
          paint: {
            'line-color': '#3B82F6',
            'line-width': 5,
            'line-opacity': 0.75,
          },
        });
      }
    });

    // Update bounds and zoom on map movement
    map.current.on('moveend', () => {
      if (map.current) {
        setBounds(map.current.getBounds());
        setZoom(map.current.getZoom());
      }
    });

    map.current.on('zoomend', () => {
      if (map.current) {
        setZoom(map.current.getZoom());
      }
    });

    return () => {
      // eslint-disable-next-line react-hooks/exhaustive-deps
      const markersToClean = markers.current;
      markersToClean.forEach(({ marker }) => marker.remove());
      markersToClean.clear();
      sharedPopup.current?.remove();
      map.current?.remove();
      map.current = null;
    };
  }, [resolvedTheme]);

  // Update map style when theme changes
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    const mapStyle = getMapboxStyle(resolvedTheme === 'dark' ? 'dark' : 'light');

    try {
      if (map.current.isStyleLoaded()) {
        const currentStyle = map.current.getStyle();
        if (currentStyle && !currentStyle.sprite?.includes(resolvedTheme || 'light')) {
          map.current.setStyle(mapStyle);
        }
      }
    } catch (error) {
      console.error('Error updating map style:', error);
    }
  }, [resolvedTheme, mapLoaded]);

  // Geolocation + fallback to 26th & 3rd Ave station
  useEffect(() => {
    if (!mapLoaded || !map.current || initialPositionSet || stations.length === 0) return;

    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const coords: [number, number] = [position.coords.longitude, position.coords.latitude];

          if (map.current) {
            // Add user location marker
            if (userLocationMarker.current) {
              userLocationMarker.current.remove();
            }

            const el = document.createElement('div');
            el.className = 'user-location-marker';
            el.style.width = '20px';
            el.style.height = '20px';
            el.style.borderRadius = '50%';
            el.style.backgroundColor = '#4F46E5';
            el.style.border = '3px solid white';
            el.style.boxShadow =
              '0 0 0 1px rgba(79, 70, 229, 0.3), 0 0 10px rgba(79, 70, 229, 0.5)';
            el.style.zIndex = '1';

            userLocationMarker.current = new mapboxgl.Marker(el)
              .setLngLat(coords)
              .addTo(map.current);

            // Set z-index on the actual marker container
            const markerElement = userLocationMarker.current.getElement();
            if (markerElement) {
              markerElement.style.zIndex = '1';
            }

            map.current.flyTo({
              center: coords,
              ...FLY_TO_OPTIONS,
            });
            console.log('📍 Using user location:', coords);
          }
          setInitialPositionSet(true);
        },
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        (_error) => {
          console.log('📍 Geolocation denied/failed, using default station');

          const defaultStation = stations.find(
            (s) =>
              (s.name.toLowerCase().includes('26') && s.name.toLowerCase().includes('3 ave')) ||
              (s.name.toLowerCase().includes('e 26') && s.name.toLowerCase().includes('3')) ||
              s.name.toLowerCase().includes('26 st & 3 ave')
          );

          if (defaultStation && map.current) {
            map.current.flyTo({
              center: [defaultStation.lon, defaultStation.lat],
              ...FLY_TO_OPTIONS,
            });
            console.log('📍 Using default station:', defaultStation.name, [
              defaultStation.lon,
              defaultStation.lat,
            ]);
          }
          setInitialPositionSet(true);
        },
        {
          enableHighAccuracy: false,
          timeout: 5000,
          maximumAge: 300000,
        }
      );
    } else {
      const defaultStation = stations.find(
        (s) => s.name.toLowerCase().includes('26') && s.name.toLowerCase().includes('3 ave')
      );

      if (defaultStation && map.current) {
        map.current.flyTo({
          center: [defaultStation.lon, defaultStation.lat],
          ...FLY_TO_OPTIONS,
        });
        console.log('📍 No geolocation support, using default station:', defaultStation.name);
      }
      setInitialPositionSet(true);
    }
  }, [mapLoaded, stations, initialPositionSet]);

  // Render clusters and individual points
  useEffect(() => {
    if (!map.current || !mapLoaded || clustersAndPoints.length === 0) return;

    // Get current marker IDs
    const currentIds = new Set<string>();
    const clusterMarkers = new Set<string>();

    clustersAndPoints.forEach((feature) => {
      const [lng, lat] = feature.geometry.coordinates;
      const props = feature.properties;

      if (props.cluster) {
        // Cluster marker
        const clusterId = `cluster-${feature.id}`;
        currentIds.add(clusterId);
        clusterMarkers.add(clusterId);

        if (!markers.current.has(clusterId)) {
          // Create cluster marker
          const el = document.createElement('div');
          el.className = 'cluster-marker';
          el.style.width = '40px';
          el.style.height = '40px';
          el.style.borderRadius = '50%';
          el.style.backgroundColor = '#3B82F6';
          el.style.border = '3px solid white';
          el.style.boxShadow = '0 2px 8px rgba(0,0,0,0.3)';
          el.style.cursor = 'pointer';
          el.style.display = 'flex';
          el.style.alignItems = 'center';
          el.style.justifyContent = 'center';
          el.style.color = 'white';
          el.style.fontWeight = 'bold';
          el.style.fontSize = '14px';
          el.textContent = props.point_count?.toString() || '0';

          el.addEventListener('click', () => {
            if (map.current && supercluster.current) {
              const expansionZoom = Math.min(
                supercluster.current.getClusterExpansionZoom(feature.id as number),
                20
              );
              map.current.flyTo({
                center: [lng, lat],
                zoom: expansionZoom,
                duration: 500,
              });
            }
          });

          const marker = new mapboxgl.Marker(el).setLngLat([lng, lat]).addTo(map.current!);

          markers.current.set(clusterId, {
            marker,
            element: el,
            clusterId: feature.id as number,
            pointCount: props.point_count,
          });
        }
      } else if (props.station) {
        // Individual station marker
        const station = props.station;
        const markerId = `station-${station.station_id}`;
        currentIds.add(markerId);

        const isStart = startStation?.station_id === station.station_id;
        const isEnd = endStation?.station_id === station.station_id;
        const isWaypoint = waypoints.some((wp) => wp.station_id === station.station_id);

        if (!markers.current.has(markerId)) {
          // Create new marker with bike type indicator
          const color = getMarkerColor(station, isStart, isEnd, isWaypoint);
          const size = isStart || isEnd || isWaypoint ? '32px' : '24px';

          const el = document.createElement('div');
          el.className = 'marker';
          el.style.width = size;
          el.style.height = size;
          el.style.borderRadius = '50%';
          el.style.backgroundColor = color;
          el.style.border = '2px solid white';
          el.style.boxShadow = '0 2px 4px rgba(0,0,0,0.2)';
          el.style.cursor = 'pointer';
          el.style.display = 'flex';
          el.style.alignItems = 'center';
          el.style.justifyContent = 'center';
          el.style.transition = 'width 0.2s ease, height 0.2s ease';

          // Add bike type indicator (only for non-route stations)
          if (!isStart && !isEnd && !isWaypoint) {
            const regularBikes =
              (station.num_bikes_available ?? 0) - (station.num_ebikes_available ?? 0);
            const eBikes = station.num_ebikes_available ?? 0;

            // Create icon element
            const icon = document.createElement('div');
            icon.style.fontSize = '10px';
            icon.style.lineHeight = '1';
            icon.style.color = 'white';
            icon.style.fontWeight = 'bold';
            icon.style.textShadow = '0 1px 2px rgba(0,0,0,0.3)';

            if (regularBikes > 0 && eBikes > 0) {
              // Both types available - show split indicator
              icon.innerHTML = '⚡';
              icon.style.fontSize = '12px';
            } else if (eBikes > 0) {
              // Only e-bikes available
              icon.innerHTML = '⚡';
              icon.style.fontSize = '12px';
            } else if (regularBikes > 0) {
              // Only regular bikes available
              icon.innerHTML = '🚲';
              icon.style.fontSize = '11px';
            } else {
              // No bikes available
              icon.innerHTML = '∅';
              icon.style.fontSize = '10px';
              icon.style.color = '#6B7280';
            }

            el.appendChild(icon);
          }

          el.addEventListener('mouseenter', () => {
            setHoveredStation(station.station_id);

            if (sharedPopup.current && map.current) {
              sharedPopup.current
                .setLngLat([station.lon, station.lat])
                .setHTML(generatePopupHTML(station))
                .addTo(map.current);
            }
          });

          el.addEventListener('mouseleave', () => {
            setHoveredStation(null);
            sharedPopup.current?.remove();
          });

          el.addEventListener('click', (e) => {
            e.stopPropagation();

            if (!startStation) {
              setStartStation(station);
            } else if (!endStation && station.station_id !== startStation.station_id) {
              setEndStation(station);
            } else {
              setStartStation(null);
              setEndStation(null);
            }
          });

          const marker = new mapboxgl.Marker(el)
            .setLngLat([station.lon, station.lat])
            .addTo(map.current!);

          markers.current.set(markerId, { marker, element: el, station });
        } else {
          // Update existing marker appearance
          const markerData = markers.current.get(markerId);
          if (markerData) {
            const color = getMarkerColor(station, isStart, isEnd, isWaypoint);
            const size = isStart || isEnd || isWaypoint ? '32px' : '24px';

            markerData.element.style.backgroundColor = color;
            markerData.element.style.width = size;
            markerData.element.style.height = size;

            // Update bike type indicator
            if (!isStart && !isEnd && !isWaypoint) {
              const regularBikes =
                (station.num_bikes_available ?? 0) - (station.num_ebikes_available ?? 0);
              const eBikes = station.num_ebikes_available ?? 0;

              // Find or create icon element
              let icon = markerData.element.querySelector('div');
              if (!icon) {
                icon = document.createElement('div');
                icon.style.fontSize = '10px';
                icon.style.lineHeight = '1';
                icon.style.color = 'white';
                icon.style.fontWeight = 'bold';
                icon.style.textShadow = '0 1px 2px rgba(0,0,0,0.3)';
                markerData.element.appendChild(icon);
              }

              if (regularBikes > 0 && eBikes > 0) {
                icon.innerHTML = '⚡';
                icon.style.fontSize = '12px';
                icon.style.color = 'white';
              } else if (eBikes > 0) {
                icon.innerHTML = '⚡';
                icon.style.fontSize = '12px';
                icon.style.color = 'white';
              } else if (regularBikes > 0) {
                icon.innerHTML = '🚲';
                icon.style.fontSize = '11px';
                icon.style.color = 'white';
              } else {
                icon.innerHTML = '∅';
                icon.style.fontSize = '10px';
                icon.style.color = '#6B7280';
              }
            } else {
              // Remove icon for route stations
              const icon = markerData.element.querySelector('div');
              if (icon) {
                icon.remove();
              }
            }
          }
        }
      }
    });

    // Remove markers that are no longer visible
    markers.current.forEach((markerData, id) => {
      if (!currentIds.has(id)) {
        markerData.marker.remove();
        markers.current.delete(id);
      }
    });

    const clusterCount = Array.from(currentIds).filter((id) => id.startsWith('cluster-')).length;
    const stationCount = Array.from(currentIds).filter((id) => id.startsWith('station-')).length;
    console.log(
      `📍 Zoom ${Math.floor(zoom)}: ${clusterCount} clusters, ${stationCount} stations (${currentIds.size} total markers)`
    );
  }, [
    clustersAndPoints,
    startStation,
    endStation,
    waypoints,
    mapLoaded,
    zoom,
    getMarkerColor,
    generatePopupHTML,
    setHoveredStation,
    setStartStation,
    setEndStation,
  ]);

  // Handle hover state updates separately
  useEffect(() => {
    if (!mapLoaded) return;

    markers.current.forEach((markerData, id) => {
      if (id.startsWith('station-') && markerData.station) {
        const station = markerData.station;
        const isHovered = hoveredStation === station.station_id;
        const isStart = startStation?.station_id === station.station_id;
        const isEnd = endStation?.station_id === station.station_id;
        const isWaypoint = waypoints.some((wp) => wp.station_id === station.station_id);

        // Update size and z-index based on hover state
        const baseSize = isStart || isEnd || isWaypoint ? '32px' : '24px';
        const hoverSize = isStart || isEnd || isWaypoint ? '36px' : '28px';
        const size = isHovered ? hoverSize : baseSize;
        markerData.element.style.width = size;
        markerData.element.style.height = size;

        // Set z-index for proper layering
        // Use the marker's getElement() to get the actual DOM element
        const markerElement = markerData.marker.getElement();
        if (markerElement) {
          if (isHovered) {
            markerElement.style.zIndex = '1000';
          } else if (isStart || isEnd) {
            markerElement.style.zIndex = '500';
          } else if (isWaypoint) {
            markerElement.style.zIndex = '100';
          } else {
            markerElement.style.zIndex = '1';
          }
        }
      }
    });
  }, [hoveredStation, startStation, endStation, waypoints, mapLoaded]);

  // Draw route between stations
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    const source = map.current.getSource('route') as mapboxgl.GeoJSONSource;
    if (!source) return;

    if (startStation && endStation) {
      // Adjust routing parameters based on profile
      let routingProfile = 'cycling';
      let exclude = '';

      if (routeProfile === 'safest') {
        // Avoid major roads and prefer bike lanes
        exclude = '&exclude=motorway';
        routingProfile = 'cycling';
      } else if (routeProfile === 'scenic') {
        // Use walking profile for more scenic routes through parks
        routingProfile = 'walking';
      } else if (routeProfile === 'insane') {
        // Use walking profile for shortest direct path (ignores traffic rules)
        routingProfile = 'walking';
      }

      // Build coordinates string with waypoints
      let coordinates = `${startStation.lon},${startStation.lat}`;
      waypoints.forEach((wp) => {
        coordinates += `;${wp.lon},${wp.lat}`;
      });
      coordinates += `;${endStation.lon},${endStation.lat}`;

      // Fetch route from Mapbox Directions API with instructions
      const directionsUrl = getDirectionsUrl(routingProfile as 'cycling' | 'walking', coordinates, {
        exclude: exclude.replace('&exclude=', ''),
      });

      fetch(directionsUrl)
        .then((response) => response.json())
        .then((data) => {
          if (data.routes && data.routes[0]) {
            const route = data.routes[0];

            // Draw the route line
            source.setData({
              type: 'Feature',
              properties: {},
              geometry: route.geometry,
            });

            // Store route details including instructions
            if (route.legs && route.legs[0]) {
              const routeInfo = {
                distance: route.distance,
                duration: route.duration,
                geometry: route.geometry,
                steps:
                  route.legs[0].steps?.map(
                    (step: {
                      maneuver: {
                        instruction: string;
                        type: string;
                        modifier?: string;
                        bearing_after?: number;
                        location?: [number, number];
                      };
                      distance: number;
                      duration: number;
                    }) => ({
                      instruction: step.maneuver.instruction,
                      distance: step.distance,
                      duration: step.duration,
                      maneuver: {
                        type: step.maneuver.type,
                        modifier: step.maneuver.modifier,
                        bearing_after: step.maneuver.bearing_after,
                        location: step.maneuver.location,
                      },
                    })
                  ) || [],
              };
              setRoute(routeInfo);
            }
          }
        })
        .catch((error) => {
          console.error('Error fetching route:', error);
          // Fallback to straight line
          source.setData({
            type: 'Feature',
            properties: {},
            geometry: {
              type: 'LineString',
              coordinates: [
                [startStation.lon, startStation.lat],
                [endStation.lon, endStation.lat],
              ],
            },
          });
        });
    } else {
      // Clear route
      source.setData({
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'LineString',
          coordinates: [],
        },
      });
      setRoute(null);
    }
  }, [startStation, endStation, waypoints, mapLoaded, setRoute, routeProfile]);

  // Zoom to selected stations
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    if (startStation && endStation) {
      const bounds = new mapboxgl.LngLatBounds()
        .extend([startStation.lon, startStation.lat])
        .extend([endStation.lon, endStation.lat]);

      map.current.fitBounds(bounds, FIT_BOUNDS_OPTIONS);
    } else if (startStation) {
      map.current.flyTo({
        center: [startStation.lon, startStation.lat],
        ...FLY_TO_OPTIONS,
      });
    }
  }, [startStation, endStation, mapLoaded]);

  return <div ref={mapContainer} className="w-full h-full" />;
}
