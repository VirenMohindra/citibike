'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import type { StationWithStatus } from '@/lib/types';
import { useAppStore } from '@/lib/store';
import { useI18n } from '@/lib/i18n';
import { useTheme } from '@/lib/theme-context';
import { useBikeAngelRewards } from '@/lib/hooks/useBikeAngelRewards';
import { useCity } from '@/lib/hooks/useCity';
import {
  COMMON_MAP_OPTIONS,
  FIT_BOUNDS_OPTIONS,
  FLY_TO_OPTIONS,
  getDirectionsUrl,
  getMapboxStyle,
} from '@/config/mapbox';
import {
  getMarkerType,
  type MarkerType,
  renderUnifiedMarker,
  updateMarkerType,
} from './marker-renderers';
import { getRadiusForZoom } from '@/lib/utils/distance';
import 'mapbox-gl/dist/mapbox-gl.css';
import './map-markers.css';

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
  markerType?: MarkerType; // Track which renderer was used
}

type ViewportStation = {
  type: 'Feature';
  properties: {
    cluster: false;
    station: StationWithStatus;
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
  const { cityConfig } = useCity();

  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markers = useRef<Map<string, MarkerData>>(new Map());
  const sharedPopup = useRef<mapboxgl.Popup | null>(null);
  const stationsRef = useRef<StationWithStatus[]>(stations); // Stage 5: Ref for event delegation
  const [mapLoaded, setMapLoaded] = useState(false);
  const [zoom, setZoom] = useState(cityConfig.defaultZoom);
  const [bounds, setBounds] = useState<mapboxgl.LngLatBounds | null>(null);
  const [mapCenter, setMapCenter] = useState<{ lat: number; lon: number }>(cityConfig.mapCenter);
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
    setMapBounds,
    setMapCenter: setMapCenterStore,
    setMapZoom: setMapZoomStore,
    citibikeUser,
    showBikeAngelRewards,
    showVisibleOnly,
  } = useAppStore();

  // Fetch Bike Angel rewards (only if user is authenticated AND feature is enabled)
  const { rewards: bikeAngelRewards } = useBikeAngelRewards({
    lat: mapCenter.lat,
    lon: mapCenter.lon,
    radius: 2.0,
    enabled: !!citibikeUser && showBikeAngelRewards,
  });

  // Keep stationsRef up to date for event delegation (Stage 5 optimization)
  useEffect(() => {
    stationsRef.current = stations;
  }, [stations]);

  // DEBUG: Helper function to create a circle polygon (for visualizing the radius)
  const createCirclePolygon = useCallback(
    (center: { lat: number; lon: number }, radiusMeters: number, points = 64) => {
      const coords: [number, number][] = [];
      const distancePerDegree = 111.32; // km per degree at equator
      const radiusKm = radiusMeters / 1000; // Convert meters to km for calculation

      for (let i = 0; i < points; i++) {
        const angle = (i / points) * 2 * Math.PI;
        const dx = radiusKm * Math.cos(angle);
        const dy = radiusKm * Math.sin(angle);

        // Approximate lat/lon offset (works well for small distances)
        const lat = center.lat + dy / distancePerDegree;
        const lon = center.lon + dx / (distancePerDegree * Math.cos((center.lat * Math.PI) / 180));

        coords.push([lon, lat]);
      }

      // Close the polygon
      coords.push(coords[0]);

      return coords;
    },
    []
  );

  // Helper function to generate popup HTML
  const generatePopupHTML = useCallback(
    (station: StationWithStatus) => {
      const regularBikes = (station.num_bikes_available ?? 0) - (station.num_ebikes_available ?? 0);
      const isDark = resolvedTheme === 'dark';
      const reward = showBikeAngelRewards ? bikeAngelRewards.get(station.station_id) : undefined;
      const hasBikeAngel = reward && reward.points > 0;

      // Determine BA color based on points
      const baColor = '#000'; // black text
      let baBgColor = '#FEF3C7'; // Light amber
      if (reward && reward.points >= 5) {
        baBgColor = '#D1FAE5'; // Light green
      } else if (reward && reward.points >= 3) {
        baBgColor = '#FFEDD5'; // Light orange
      }

      return `
      <div class="p-2.5 ${isDark ? 'bg-gray-800' : 'bg-white'}">
        <h3 class="font-semibold text-sm mb-2 ${isDark ? 'text-gray-100' : 'text-gray-900'}">${station.name}</h3>
        ${
          hasBikeAngel
            ? `
        <div class="mb-2 px-2 py-1.5 rounded" style="background-color: ${baBgColor}; border-left: 3px solid ${baColor}">
          <div class="flex items-center justify-between">
            <span class="text-xs font-semibold" style="color: ${baColor}">Bike Angel Rewards</span>
          </div>
          ${
            reward.pickupPoints || reward.dropoffPoints
              ? `
          <div class="flex gap-3 mt-1 text-[11px]" style="color: ${baColor};">
            ${reward.pickupPoints ? `<span>⬆ ${reward.pickupPoints} pts pickup</span>` : ''}
            ${reward.dropoffPoints ? `<span>⬇ ${reward.dropoffPoints} pts dropoff</span>` : ''}
          </div>
          `
              : ''
          }
        </div>
        `
            : ''
        }

        <div class="text-xs space-y-1">
          <div class="flex justify-between items-center">
            <span class="${isDark ? 'text-gray-400' : 'text-gray-600'}">${t('map.station.regularBikes')}</span>
            <span class="font-semibold ${isDark ? 'text-gray-100' : 'text-gray-900'}">${regularBikes}</span>
          </div>
          <div class="flex justify-between items-center">
            <span class="${isDark ? 'text-gray-400' : 'text-gray-600'}">${t('map.station.eBikes')}</span>
            <span class="font-semibold ${isDark ? 'text-gray-100' : 'text-gray-900'}">${station.num_ebikes_available ?? 0}</span>
          </div>
          <div class="flex justify-between items-center">
            <span class="${isDark ? 'text-gray-400' : 'text-gray-600'}">${t('map.station.docksAvailable')}</span>
            <span class="font-semibold ${isDark ? 'text-gray-100' : 'text-gray-900'}">${station.num_docks_available ?? 0}</span>
          </div>
        </div>
      </div>
    `;
    },
    [t, resolvedTheme, showBikeAngelRewards, bikeAngelRewards]
  );

  // PERFORMANCE: Memoize GeoJSON features for GPU layers (Stage 4 optimization)
  const geoJsonFeatures = useMemo(() => {
    if (stations.length === 0) return [];

    return stations
      .filter((s) => s.is_installed)
      .map((station) => {
        const reward = bikeAngelRewards.get(station.station_id);

        return {
          type: 'Feature' as const,
          id: station.station_id,
          properties: {
            station_id: station.station_id,
            name: station.name,
            num_bikes_available: station.num_bikes_available ?? 0,
            num_ebikes_available: station.num_ebikes_available ?? 0,
            num_docks_available: station.num_docks_available ?? 0,
            // BikeAngel reward data
            ba_points: reward?.points ?? 0,
            ba_pickup_points: reward?.pickupPoints ?? 0,
            ba_dropoff_points: reward?.dropoffPoints ?? 0,
          },
          geometry: {
            type: 'Point' as const,
            coordinates: [station.lon, station.lat] as [number, number],
          },
        };
      });
  }, [stations, bikeAngelRewards]);

  // Get visible stations in current viewport (for DOM marker rendering)
  const visibleStations = useMemo((): ViewportStation[] => {
    if (!bounds || stations.length === 0) return [];

    // Filter stations within viewport bounds
    return stations
      .filter((s) => s.is_installed)
      .filter((s) => {
        return (
          s.lon >= bounds.getWest() &&
          s.lon <= bounds.getEast() &&
          s.lat >= bounds.getSouth() &&
          s.lat <= bounds.getNorth()
        );
      })
      .map((station) => ({
        type: 'Feature' as const,
        properties: {
          cluster: false as const,
          station,
        },
        geometry: {
          type: 'Point' as const,
          coordinates: [station.lon, station.lat] as [number, number],
        },
      }));
  }, [bounds, stations]);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    const mapStyle = getMapboxStyle(resolvedTheme === 'dark' ? 'dark' : 'light');

    // Convert city maxBounds to Mapbox format
    const maxBounds: mapboxgl.LngLatBoundsLike = [
      [cityConfig.maxBounds[0], cityConfig.maxBounds[1]], // Southwest
      [cityConfig.maxBounds[2], cityConfig.maxBounds[3]], // Northeast
    ];

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: mapStyle,
      ...COMMON_MAP_OPTIONS,
      maxBounds, // Apply city-specific bounds
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

        // DEBUG: Add source and layer for 2km radius circle
        map.current.addSource('debug-circle', {
          type: 'geojson',
          data: {
            type: 'Feature',
            properties: {},
            geometry: {
              type: 'Polygon',
              coordinates: [[]],
            },
          },
        });

        map.current.addLayer({
          id: 'debug-circle-fill',
          type: 'fill',
          source: 'debug-circle',
          paint: {
            'fill-color': '#9333EA', // Purple
            'fill-opacity': 0.1,
          },
        });

        map.current.addLayer({
          id: 'debug-circle-outline',
          type: 'line',
          source: 'debug-circle',
          paint: {
            'line-color': '#9333EA', // Purple
            'line-width': 2,
            'line-opacity': 0.5,
          },
        });

        // Add stations GeoJSON source WITHOUT clustering (user preference)
        map.current.addSource('stations', {
          type: 'geojson',
          data: {
            type: 'FeatureCollection',
            features: [],
          },
          cluster: false, // No clustering - show all individual stations
          maxzoom: 16, // Optimize tile generation (don't generate tiles above zoom 16)
        });

        // Simple dots (zoom 11-15, all stations)
        // Clear hierarchy: Yellow = BA points, Green = E-bikes, Amber = Classic bikes, Gray = Unavailable
        // Overlaps with DOM markers at zoom 14-15 to ensure no gaps
        map.current.addLayer({
          id: 'stations-simple',
          type: 'circle',
          source: 'stations',
          minzoom: 11,
          maxzoom: 15,
          paint: {
            'circle-radius': 6,
            'circle-color': [
              'case',
              // Priority 1: Bike Angel points (yellow)
              ['>', ['get', 'ba_points'], 0],
              '#EAB308', // Yellow for BA points
              // Priority 2: E-bikes available (green)
              ['>', ['get', 'num_ebikes_available'], 0],
              '#10B981', // Green for e-bikes
              // Priority 3: Classic bikes available (amber)
              ['>', ['get', 'num_bikes_available'], 0],
              '#F59E0B', // Amber for classic bikes
              // Priority 4: No bikes (gray)
              '#9CA3AF', // Gray for unavailable
            ],
            'circle-stroke-width': 2,
            'circle-stroke-color': '#fff',
            'circle-opacity': 0.95,
          },
        });

        // Note: At zoom 14+, we use DOM markers for compact/detailed views
        // No need for a GPU text layer - DOM markers provide better styling and BA indicators

        // EVENT DELEGATION (Stage 5 optimization) - Handle interactions on GPU layers
        // This replaces thousands of per-marker event listeners with just a few map-level listeners

        // Handle clicks on stations at far zoom (zoom 11-14, simple dots)
        // At zoom > 14, DOM markers handle interactions
        const handleStationClick = (e: mapboxgl.MapLayerMouseEvent) => {
          if (!map.current) return;
          const features = map.current.queryRenderedFeatures(e.point, {
            layers: ['stations-simple'],
          });
          if (features.length === 0) return;

          const stationId = features[0].properties?.station_id;
          if (!stationId) return;

          // Find the full station object from ref (always has latest data)
          const station = stationsRef.current.find((s) => s.station_id === stationId);
          if (!station) return;

          // Handle station selection
          if (!startStation) {
            setStartStation(station);
          } else if (!endStation && station.station_id !== startStation.station_id) {
            setEndStation(station);
          } else {
            setStartStation(null);
            setEndStation(null);
          }
        };

        map.current.on('click', 'stations-simple', handleStationClick);

        // Handle hover on unclustered stations - show popup
        const handleStationMouseEnter = (e: mapboxgl.MapLayerMouseEvent) => {
          if (!map.current || !sharedPopup.current) return;
          map.current.getCanvas().style.cursor = 'pointer';

          const features = map.current.queryRenderedFeatures(e.point, {
            layers: ['stations-simple'],
          });
          if (features.length === 0) return;

          const stationId = features[0].properties?.station_id;
          if (!stationId) return;

          // Find the full station object from ref (always has latest data)
          const station = stationsRef.current.find((s) => s.station_id === stationId);
          if (!station) return;

          setHoveredStation(stationId);
          sharedPopup.current
            .setLngLat([station.lon, station.lat])
            .setHTML(generatePopupHTML(station))
            .addTo(map.current);
        };

        const handleStationMouseLeave = () => {
          if (!map.current) return;
          map.current.getCanvas().style.cursor = '';
          setHoveredStation(null);
          sharedPopup.current?.remove();
        };

        map.current.on('mouseenter', 'stations-simple', handleStationMouseEnter);
        map.current.on('mouseleave', 'stations-simple', handleStationMouseLeave);
      }
    });

    // Update bounds and zoom on map movement
    map.current.on('moveend', () => {
      if (map.current) {
        const mapBounds = map.current.getBounds();
        if (mapBounds) {
          setBounds(mapBounds);
          const currentZoom = map.current.getZoom();
          setZoom(currentZoom);
          const center = map.current.getCenter();
          setMapCenter({ lat: center.lat, lon: center.lng });

          // Sync bounds, center, and zoom to Zustand store for StationSelector's visible-only filter
          setMapBounds({
            north: mapBounds.getNorth(),
            south: mapBounds.getSouth(),
            east: mapBounds.getEast(),
            west: mapBounds.getWest(),
          });
          setMapCenterStore({ lat: center.lat, lon: center.lng });
          setMapZoomStore(currentZoom);
        }
      }
    });

    map.current.on('zoomend', () => {
      if (map.current) {
        const currentZoom = map.current.getZoom();
        setZoom(currentZoom);
        setMapZoomStore(currentZoom);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount, theme changes handled separately

  // Update map style when theme changes (preserve zoom/center)
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    const mapStyle = getMapboxStyle(resolvedTheme === 'dark' ? 'dark' : 'light');

    try {
      if (map.current.isStyleLoaded()) {
        const currentStyle = map.current.getStyle();
        if (currentStyle && !currentStyle.sprite?.includes(resolvedTheme || 'light')) {
          // Preserve current camera position
          const currentCenter = map.current.getCenter();
          const currentZoom = map.current.getZoom();
          const currentBearing = map.current.getBearing();
          const currentPitch = map.current.getPitch();

          // Change style
          map.current.setStyle(mapStyle);

          // Restore camera position after style loads
          map.current.once('styledata', () => {
            if (map.current) {
              map.current.jumpTo({
                center: currentCenter,
                zoom: currentZoom,
                bearing: currentBearing,
                pitch: currentPitch,
              });

              // Re-add route layer after style change
              if (!map.current.getSource('route')) {
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

              // DEBUG: Re-add debug circle layers after style change
              if (!map.current.getSource('debug-circle')) {
                map.current.addSource('debug-circle', {
                  type: 'geojson',
                  data: {
                    type: 'Feature',
                    properties: {},
                    geometry: {
                      type: 'Polygon',
                      coordinates: [[]],
                    },
                  },
                });

                map.current.addLayer({
                  id: 'debug-circle-fill',
                  type: 'fill',
                  source: 'debug-circle',
                  paint: {
                    'fill-color': '#9333EA',
                    'fill-opacity': 0.1,
                  },
                });

                map.current.addLayer({
                  id: 'debug-circle-outline',
                  type: 'line',
                  source: 'debug-circle',
                  paint: {
                    'line-color': '#9333EA',
                    'line-width': 2,
                    'line-opacity': 0.5,
                  },
                });
              }
            }
          });
        }
      }
    } catch (error) {
      console.error('Error updating map style:', error);
    }
  }, [resolvedTheme, mapLoaded]);

  // Reset map position and bounds when city changes
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    // Update maxBounds for the new city
    const maxBounds: mapboxgl.LngLatBoundsLike = [
      [cityConfig.maxBounds[0], cityConfig.maxBounds[1]], // Southwest
      [cityConfig.maxBounds[2], cityConfig.maxBounds[3]], // Northeast
    ];
    map.current.setMaxBounds(maxBounds);

    // Fly to new city center
    map.current.flyTo({
      center: [cityConfig.mapCenter.lon, cityConfig.mapCenter.lat],
      zoom: cityConfig.defaultZoom,
      duration: 1000,
    });
    setInitialPositionSet(false);
  }, [cityConfig, mapLoaded]);

  // Geolocation + fallback to city center
  useEffect(() => {
    if (!mapLoaded || !map.current || initialPositionSet || stations.length === 0) return;

    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const coords: [number, number] = [position.coords.longitude, position.coords.latitude];

          // Check if user location is within city bounds
          const [west, south, east, north] = cityConfig.maxBounds;
          const isWithinBounds =
            coords[0] >= west && coords[0] <= east && coords[1] >= south && coords[1] <= north;

          if (map.current) {
            if (isWithinBounds) {
              // User is in the selected city - use their location
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
            } else {
              // User is outside selected city - use city center instead
              map.current.flyTo({
                ...FLY_TO_OPTIONS,
                center: [cityConfig.mapCenter.lon, cityConfig.mapCenter.lat],
                zoom: cityConfig.defaultZoom,
              });
            }
          }
          setInitialPositionSet(true);
        },
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        (_error) => {
          if (map.current) {
            map.current.flyTo({
              ...FLY_TO_OPTIONS,
              center: [cityConfig.mapCenter.lon, cityConfig.mapCenter.lat],
              zoom: cityConfig.defaultZoom,
            });
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
      if (map.current) {
        map.current.flyTo({
          ...FLY_TO_OPTIONS,
          center: [cityConfig.mapCenter.lon, cityConfig.mapCenter.lat],
          zoom: cityConfig.defaultZoom,
        });
      }
      setInitialPositionSet(true);
    }
  }, [mapLoaded, stations, initialPositionSet, cityConfig]);

  // Render visible station markers - HYBRID APPROACH (Stage 3: Performance optimization)
  // Only use DOM markers for zoom > 16 (detailed view) or route stations
  // GPU layers handle zoom < 16
  useEffect(() => {
    if (!map.current || !mapLoaded || visibleStations.length === 0) return;

    // Get route station IDs (always need DOM markers)
    const routeStationIds = new Set<string>();
    if (startStation) routeStationIds.add(startStation.station_id);
    if (endStation) routeStationIds.add(endStation.station_id);
    waypoints.forEach((wp) => routeStationIds.add(wp.station_id));

    // Determine which stations need DOM markers
    const needsDOMMarker = (stationId: string) => {
      // Route stations always get DOM markers
      if (routeStationIds.has(stationId)) return true;
      // At zoom > 14, all visible stations get DOM markers (compact or detailed view)
      // This ensures BA indicators are visible at medium zoom
      if (zoom > 14) return true;
      return false;
    };

    // Get current marker IDs that should be visible
    const currentIds = new Set<string>();

    visibleStations.forEach((feature) => {
      const station = feature.properties.station;
      const markerId = `station-${station.station_id}`;

      if (!needsDOMMarker(station.station_id)) {
        // Station should use GPU layer rendering, not DOM marker
        // Remove DOM marker if it exists
        if (markers.current.has(markerId)) {
          markers.current.get(markerId)?.marker.remove();
          markers.current.delete(markerId);
        }
        return;
      }

      currentIds.add(markerId);

      const isStart = startStation?.station_id === station.station_id;
      const isEnd = endStation?.station_id === station.station_id;
      const isWaypoint = waypoints.some((wp) => wp.station_id === station.station_id);

      if (!markers.current.has(markerId)) {
        // Create new unified marker container (holds single view that changes on zoom)
        const currentMarkerType = getMarkerType(zoom);
        const reward = bikeAngelRewards.get(station.station_id);

        const el = renderUnifiedMarker(
          station,
          isStart,
          isEnd,
          isWaypoint,
          currentMarkerType,
          reward
        );

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

        const marker = new mapboxgl.Marker({
          element: el,
          anchor: 'center',
        })
          .setLngLat([station.lon, station.lat])
          .addTo(map.current!);

        markers.current.set(markerId, {
          marker,
          element: el,
          station,
          markerType: currentMarkerType,
        });
      } else {
        // Marker exists - update its view if zoom crossed a breakpoint
        const markerData = markers.current.get(markerId);
        if (markerData && markerData.station) {
          const requiredMarkerType = getMarkerType(zoom);

          // Update marker view if zoom level changed
          if (markerData.markerType !== requiredMarkerType) {
            const reward = bikeAngelRewards.get(station.station_id);
            updateMarkerType(
              markerData.element,
              requiredMarkerType,
              station,
              isStart,
              isEnd,
              isWaypoint,
              reward
            );
            markerData.markerType = requiredMarkerType;
          }
        }
      }
    });

    // Remove markers that are no longer visible or no longer need DOM rendering
    markers.current.forEach((markerData, id) => {
      if (!currentIds.has(id)) {
        markerData.marker.remove();
        markers.current.delete(id);
      }
    });
  }, [
    visibleStations,
    mapLoaded,
    generatePopupHTML,
    setHoveredStation,
    setStartStation,
    setEndStation,
    startStation,
    endStation,
    waypoints,
    zoom,
    bikeAngelRewards,
  ]);

  // Update GeoJSON source with memoized station data (PERFORMANCE OPTIMIZATION - Stage 1 + 4)
  useEffect(() => {
    if (!map.current || !mapLoaded || geoJsonFeatures.length === 0) return;

    const source = map.current.getSource('stations') as mapboxgl.GeoJSONSource;
    if (!source) return;

    // Use pre-calculated memoized features (Stage 4 optimization)
    source.setData({
      type: 'FeatureCollection',
      features: geoJsonFeatures,
    });
  }, [geoJsonFeatures, mapLoaded]);

  // Update all markers when Bike Angel toggle changes
  useEffect(() => {
    if (!mapLoaded) return;

    markers.current.forEach((markerData, id) => {
      if (id.startsWith('station-') && markerData.station && markerData.markerType) {
        const station = markerData.station;
        const isStart = startStation?.station_id === station.station_id;
        const isEnd = endStation?.station_id === station.station_id;
        const isWaypoint = waypoints.some((wp) => wp.station_id === station.station_id);
        const reward = showBikeAngelRewards ? bikeAngelRewards.get(station.station_id) : undefined;

        // Re-render marker with or without rewards
        updateMarkerType(
          markerData.element,
          markerData.markerType,
          station,
          isStart,
          isEnd,
          isWaypoint,
          reward
        );
      }
    });
  }, [showBikeAngelRewards, bikeAngelRewards, mapLoaded, startStation, endStation, waypoints]);

  // Handle z-index layering for hover and route stations
  useEffect(() => {
    if (!mapLoaded) return;

    markers.current.forEach((markerData, id) => {
      if (id.startsWith('station-') && markerData.station) {
        const station = markerData.station;
        const isHovered = hoveredStation === station.station_id;
        const isStart = startStation?.station_id === station.station_id;
        const isEnd = endStation?.station_id === station.station_id;
        const isWaypoint = waypoints.some((wp) => wp.station_id === station.station_id);

        // Update z-index for proper layering
        // (CSS handles hover scaling, BA info is built into markers)
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

      // Fetch route from Mapbox Directions API
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

  // DEBUG: Update the radius circle when mapCenter, zoom, or showVisibleOnly changes
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    const source = map.current.getSource('debug-circle') as mapboxgl.GeoJSONSource;
    if (!source) return;

    if (showVisibleOnly && mapCenter) {
      // Calculate dynamic radius based on zoom level (in meters)
      const radiusMeters = getRadiusForZoom(zoom);

      // Show the circle - generate polygon coordinates
      const circleCoords = createCirclePolygon(mapCenter, radiusMeters);

      source.setData({
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'Polygon',
          coordinates: [circleCoords],
        },
      });
    } else {
      // Hide the circle - set empty geometry
      source.setData({
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'Polygon',
          coordinates: [[]],
        },
      });
    }
  }, [mapCenter, showVisibleOnly, mapLoaded, createCirclePolygon, zoom]);

  return <div ref={mapContainer} className="w-full h-full" />;
}
