'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import mapboxgl from 'mapbox-gl';
import type { Trip } from '@/lib/db/schema';
import type { Station } from '@/lib/types';
import { decodePolyline } from '@/lib/utils/polyline';
import { useTheme } from '@/lib/theme-context';
import { useI18n } from '@/lib/i18n';
import { COMMON_MAP_OPTIONS, FIT_BOUNDS_OPTIONS, getMapboxStyle } from '@/config/mapbox';
import TripReplayControls from './TripReplayControls';
import 'mapbox-gl/dist/mapbox-gl.css';

interface TripVisualizationMapProps {
  selectedTrip: Trip | null;
  viewMode?: 'trip' | 'heatmap';
  heatmapData?: GeoJSON.FeatureCollection;
}

export default function TripVisualizationMap({
  selectedTrip,
  viewMode = 'trip',
  heatmapData,
}: TripVisualizationMapProps) {
  const { t } = useI18n();
  const { resolvedTheme } = useTheme();
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [stations, setStations] = useState<Station[]>([]);
  const startMarker = useRef<mapboxgl.Marker | null>(null);
  const endMarker = useRef<mapboxgl.Marker | null>(null);
  const replayMarker = useRef<mapboxgl.Marker | null>(null);

  // Replay state - UI only (for rendering)
  const [isReplaying, setIsReplaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [replayProgress, setReplayProgress] = useState(0);
  const [replaySpeed, setReplaySpeed] = useState(2);
  const [routeCoordinates, setRouteCoordinates] = useState<[number, number][]>([]);

  // Playback state - Source of truth for all timing calculations (uses refs to avoid stale closures)
  const playbackStateRef = useRef({
    videoTime: 0, // Current position in trip (seconds)
    wallClockStart: 0, // When current playback segment started (ms)
    speed: 2, // Current speed multiplier
    isPlaying: false, // Are we actively playing?
  });

  // Helper function to generate popup HTML
  const generatePopupHTML = useCallback(
    (stationName: string, labelKey: 'map.station.start' | 'map.station.end') => {
      const isDark = resolvedTheme === 'dark';
      const label = t(labelKey);
      const displayStationName = stationName || t('common.unknownStation');
      return `
        <div class="p-2 ${isDark ? 'bg-gray-800' : 'bg-white'}">
          <h3 class="font-semibold text-sm mb-1 ${isDark ? 'text-gray-100' : 'text-gray-900'}">${label}</h3>
          <p class="text-xs ${isDark ? 'text-gray-300' : 'text-gray-700'}">${displayStationName}</p>
        </div>
      `;
    },
    [resolvedTheme, t]
  );

  // Fetch all stations for background layer
  useEffect(() => {
    async function loadStations() {
      try {
        const response = await fetch('/api/stations/info');
        if (response.ok) {
          const data = await response.json();
          setStations(data.stations || []);
        }
      } catch (error) {
        console.error('Failed to load stations:', error);
      }
    }
    void loadStations();
  }, []);

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

    map.current.on('load', () => {
      setMapLoaded(true);

      if (map.current) {
        // Add source and layer for background stations
        map.current.addSource('all-stations', {
          type: 'geojson',
          data: {
            type: 'FeatureCollection',
            features: [],
          },
        });

        // Add layer on top of base map but below labels
        const layers = map.current.getStyle().layers;
        // Find the first symbol layer (labels) to insert stations below them
        let firstSymbolId: string | undefined;
        for (const layer of layers || []) {
          if (layer.type === 'symbol') {
            firstSymbolId = layer.id;
            break;
          }
        }

        map.current.addLayer(
          {
            id: 'all-stations',
            type: 'circle',
            source: 'all-stations',
            paint: {
              'circle-radius': 5,
              'circle-color': '#94a3b8',
              'circle-opacity': 0.5,
              'circle-stroke-width': 1,
              'circle-stroke-color': '#64748b',
              'circle-stroke-opacity': 0.4,
            },
          },
          firstSymbolId
        );

        // Add source and layer for route
        map.current.addSource('trip-route', {
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
          id: 'trip-route',
          type: 'line',
          source: 'trip-route',
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

        // Add source and layer for heatmap
        map.current.addSource('trip-heatmap', {
          type: 'geojson',
          data: {
            type: 'FeatureCollection',
            features: [],
          },
        });

        map.current.addLayer({
          id: 'trip-heatmap',
          type: 'heatmap',
          source: 'trip-heatmap',
          layout: {
            visibility: 'none', // Hidden by default
          },
          paint: {
            // Increase weight as diameter decreases (zoom in)
            'heatmap-weight': ['interpolate', ['linear'], ['get', 'weight'], 0, 0, 10, 1],
            // Increase intensity as zoom level increases
            'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 0, 1, 15, 3],
            // Color ramp for heatmap. Domain is 0 (low) to 1 (high).
            // Begin color ramp at 0-stop with a 0-transparency color
            // to create a blur-like effect.
            'heatmap-color': [
              'interpolate',
              ['linear'],
              ['heatmap-density'],
              0,
              'rgba(33,102,172,0)',
              0.2,
              'rgb(103,169,207)',
              0.4,
              'rgb(209,229,240)',
              0.6,
              'rgb(253,219,199)',
              0.8,
              'rgb(239,138,98)',
              1,
              'rgb(178,24,43)',
            ],
            // Adjust the heatmap radius by zoom level
            'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 0, 2, 15, 30],
            // Transition from heatmap to circle layer by zoom level
            'heatmap-opacity': ['interpolate', ['linear'], ['zoom'], 7, 1, 15, 0.5],
          },
        });
      }
    });

    return () => {
      startMarker.current?.remove();
      endMarker.current?.remove();
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

  // Update station background layer when stations are loaded
  useEffect(() => {
    if (!map.current || !mapLoaded || stations.length === 0) return;

    const source = map.current.getSource('all-stations') as mapboxgl.GeoJSONSource;
    if (!source) return;

    const features = stations.map((station) => ({
      type: 'Feature' as const,
      properties: {
        id: station.station_id,
        name: station.name,
      },
      geometry: {
        type: 'Point' as const,
        coordinates: [station.lon, station.lat],
      },
    }));

    source.setData({
      type: 'FeatureCollection',
      features,
    });
  }, [stations, mapLoaded]);

  // Update heatmap data when provided
  useEffect(() => {
    if (!map.current || !mapLoaded || !heatmapData) return;

    const source = map.current.getSource('trip-heatmap') as mapboxgl.GeoJSONSource;
    if (!source) return;

    source.setData(heatmapData);
  }, [heatmapData, mapLoaded]);

  // Toggle layer visibility based on view mode
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    const isHeatmapMode = viewMode === 'heatmap';

    // Toggle trip-specific layers
    map.current.setLayoutProperty('trip-route', 'visibility', isHeatmapMode ? 'none' : 'visible');
    map.current.setLayoutProperty('all-stations', 'visibility', isHeatmapMode ? 'none' : 'visible');

    // Toggle heatmap layer
    map.current.setLayoutProperty('trip-heatmap', 'visibility', isHeatmapMode ? 'visible' : 'none');

    // Hide/show markers based on mode
    if (isHeatmapMode) {
      startMarker.current?.remove();
      endMarker.current?.remove();
    } else {
      // Re-add markers when switching back to trip mode if we have a selected trip with coordinates
      if (
        selectedTrip &&
        selectedTrip.startLat !== 0 &&
        selectedTrip.startLon !== 0 &&
        selectedTrip.endLat !== 0 &&
        selectedTrip.endLon !== 0
      ) {
        // Remove existing markers first
        void startMarker.current?.remove();
        void endMarker.current?.remove();

        // Create start marker (blue)
        const startEl = document.createElement('div');
        startEl.style.width = '32px';
        startEl.style.height = '32px';
        startEl.style.borderRadius = '50%';
        startEl.style.backgroundColor = '#3B82F6';
        startEl.style.border = '3px solid white';
        startEl.style.boxShadow = '0 2px 8px rgba(0,0,0,0.3)';
        startEl.style.display = 'flex';
        startEl.style.alignItems = 'center';
        startEl.style.justifyContent = 'center';
        startEl.style.color = 'white';
        startEl.style.fontWeight = 'bold';
        startEl.style.fontSize = '16px';
        startEl.textContent = 'A';

        startMarker.current = new mapboxgl.Marker(startEl)
          .setLngLat([selectedTrip.startLon, selectedTrip.startLat])
          .setPopup(
            new mapboxgl.Popup({
              offset: 25,
              className: 'citibike-popup',
              closeButton: false,
            }).setHTML(generatePopupHTML(selectedTrip.startStationName || '', 'map.station.start'))
          )
          .addTo(map.current);

        // Create end marker (red)
        const endEl = document.createElement('div');
        endEl.style.width = '32px';
        endEl.style.height = '32px';
        endEl.style.borderRadius = '50%';
        endEl.style.backgroundColor = '#EF4444';
        endEl.style.border = '3px solid white';
        endEl.style.boxShadow = '0 2px 8px rgba(0,0,0,0.3)';
        endEl.style.display = 'flex';
        endEl.style.alignItems = 'center';
        endEl.style.justifyContent = 'center';
        endEl.style.color = 'white';
        endEl.style.fontWeight = 'bold';
        endEl.style.fontSize = '16px';
        endEl.textContent = 'B';

        endMarker.current = new mapboxgl.Marker(endEl)
          .setLngLat([selectedTrip.endLon, selectedTrip.endLat])
          .setPopup(
            new mapboxgl.Popup({
              offset: 25,
              className: 'citibike-popup',
              closeButton: false,
            }).setHTML(generatePopupHTML(selectedTrip.endStationName || '', 'map.station.end'))
          )
          .addTo(map.current);
      }
    }
  }, [viewMode, mapLoaded, selectedTrip, generatePopupHTML]);

  // Update map with selected trip
  useEffect(() => {
    if (!map.current || !mapLoaded || !selectedTrip) return;

    const source = map.current.getSource('trip-route') as mapboxgl.GeoJSONSource;
    if (!source) return;

    // Check if we have actual coordinates
    const hasCoordinates =
      selectedTrip.startLat !== 0 &&
      selectedTrip.startLon !== 0 &&
      selectedTrip.endLat !== 0 &&
      selectedTrip.endLon !== 0;

    if (hasCoordinates) {
      // Remove old markers
      void startMarker.current?.remove();
      void endMarker.current?.remove();

      // Create start marker (blue)
      const startEl = document.createElement('div');
      startEl.style.width = '32px';
      startEl.style.height = '32px';
      startEl.style.borderRadius = '50%';
      startEl.style.backgroundColor = '#3B82F6';
      startEl.style.border = '3px solid white';
      startEl.style.boxShadow = '0 2px 8px rgba(0,0,0,0.3)';
      startEl.style.display = 'flex';
      startEl.style.alignItems = 'center';
      startEl.style.justifyContent = 'center';
      startEl.style.color = 'white';
      startEl.style.fontWeight = 'bold';
      startEl.style.fontSize = '16px';
      startEl.textContent = 'A';

      startMarker.current = new mapboxgl.Marker(startEl)
        .setLngLat([selectedTrip.startLon, selectedTrip.startLat])
        .setPopup(
          new mapboxgl.Popup({
            offset: 25,
            className: 'citibike-popup',
            closeButton: false,
          }).setHTML(generatePopupHTML(selectedTrip.startStationName || '', 'map.station.start'))
        )
        .addTo(map.current);

      // Create end marker (red)
      const endEl = document.createElement('div');
      endEl.style.width = '32px';
      endEl.style.height = '32px';
      endEl.style.borderRadius = '50%';
      endEl.style.backgroundColor = '#EF4444';
      endEl.style.border = '3px solid white';
      endEl.style.boxShadow = '0 2px 8px rgba(0,0,0,0.3)';
      endEl.style.display = 'flex';
      endEl.style.alignItems = 'center';
      endEl.style.justifyContent = 'center';
      endEl.style.color = 'white';
      endEl.style.fontWeight = 'bold';
      endEl.style.fontSize = '16px';
      endEl.textContent = 'B';

      endMarker.current = new mapboxgl.Marker(endEl)
        .setLngLat([selectedTrip.endLon, selectedTrip.endLat])
        .setPopup(
          new mapboxgl.Popup({
            offset: 25,
            className: 'citibike-popup',
            closeButton: false,
          }).setHTML(generatePopupHTML(selectedTrip.endStationName || '', 'map.station.end'))
        )
        .addTo(map.current);

      // Draw route
      if (selectedTrip.polyline) {
        // Decode polyline and draw actual route
        const coordinates = decodePolyline(selectedTrip.polyline);
        if (coordinates.length > 0) {
          source.setData({
            type: 'Feature',
            properties: {},
            geometry: {
              type: 'LineString',
              coordinates: coordinates,
            },
          });
        } else {
          // Fallback to straight line if polyline decode fails
          source.setData({
            type: 'Feature',
            properties: {},
            geometry: {
              type: 'LineString',
              coordinates: [
                [selectedTrip.startLon, selectedTrip.startLat],
                [selectedTrip.endLon, selectedTrip.endLat],
              ],
            },
          });
        }
      } else {
        // Draw straight line between start and end
        source.setData({
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'LineString',
            coordinates: [
              [selectedTrip.startLon, selectedTrip.startLat],
              [selectedTrip.endLon, selectedTrip.endLat],
            ],
          },
        });
      }

      // Fit map to show both markers
      const bounds = new mapboxgl.LngLatBounds()
        .extend([selectedTrip.startLon, selectedTrip.startLat])
        .extend([selectedTrip.endLon, selectedTrip.endLat]);

      map.current.fitBounds(bounds, FIT_BOUNDS_OPTIONS);
    } else {
      // Clear route and markers if no coordinates
      source.setData({
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'LineString',
          coordinates: [],
        },
      });

      startMarker.current?.remove();
      endMarker.current?.remove();
    }
  }, [selectedTrip, mapLoaded, generatePopupHTML]);

  // Extract and store route coordinates when trip changes
  useEffect(() => {
    if (!selectedTrip) {
      setRouteCoordinates([]);
      return;
    }

    // Try to use polyline first
    if (selectedTrip.polyline) {
      const coordinates = decodePolyline(selectedTrip.polyline);
      if (coordinates.length > 0) {
        setRouteCoordinates(coordinates);
        return;
      }
    }

    // Fallback to straight line if no polyline or decode failed
    if (
      selectedTrip.startLat !== 0 &&
      selectedTrip.startLon !== 0 &&
      selectedTrip.endLat !== 0 &&
      selectedTrip.endLon !== 0
    ) {
      setRouteCoordinates([
        [selectedTrip.startLon, selectedTrip.startLat],
        [selectedTrip.endLon, selectedTrip.endLat],
      ]);
    } else {
      setRouteCoordinates([]);
    }
  }, [selectedTrip]);

  // Format time helper (seconds to MM:SS)
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  // Helper: Update marker position for a given progress (0-1)
  const updateMarkerPosition = useCallback(
    (progressFraction: number) => {
      if (!map.current || routeCoordinates.length < 2) return;

      const routeIndex = Math.floor(progressFraction * (routeCoordinates.length - 1));
      const nextIndex = Math.min(routeIndex + 1, routeCoordinates.length - 1);
      const segmentProgress = (progressFraction * (routeCoordinates.length - 1)) % 1;

      const currentCoord = routeCoordinates[routeIndex];
      const nextCoord = routeCoordinates[nextIndex];

      if (!currentCoord || !nextCoord) return;

      // Interpolate between points
      const lng = currentCoord[0] + (nextCoord[0] - currentCoord[0]) * segmentProgress;
      const lat = currentCoord[1] + (nextCoord[1] - currentCoord[1]) * segmentProgress;

      // Update or create replay marker
      if (!replayMarker.current) {
        const markerEl = document.createElement('div');
        markerEl.style.width = '20px';
        markerEl.style.height = '20px';
        markerEl.style.borderRadius = '50%';
        markerEl.style.backgroundColor = '#10B981';
        markerEl.style.border = '3px solid white';
        markerEl.style.boxShadow = '0 2px 8px rgba(0,0,0,0.4), 0 0 0 4px rgba(16, 185, 129, 0.3)';
        markerEl.style.animation = 'pulse 1.5s ease-in-out infinite';

        // Add CSS animation for pulse effect
        if (!document.getElementById('replay-marker-animation')) {
          const style = document.createElement('style');
          style.id = 'replay-marker-animation';
          style.innerHTML = `
            @keyframes pulse {
              0%, 100% { box-shadow: 0 2px 8px rgba(0,0,0,0.4), 0 0 0 4px rgba(16, 185, 129, 0.3); }
              50% { box-shadow: 0 2px 8px rgba(0,0,0,0.4), 0 0 0 8px rgba(16, 185, 129, 0.2); }
            }
          `;
          document.head.appendChild(style);
        }

        replayMarker.current = new mapboxgl.Marker(markerEl)
          .setLngLat([lng, lat])
          .addTo(map.current);
      } else {
        replayMarker.current.setLngLat([lng, lat]);
      }
    },
    [routeCoordinates]
  );

  // Handle play/pause
  const handlePlayPause = useCallback(() => {
    if (!selectedTrip || routeCoordinates.length < 2) return;

    const state = playbackStateRef.current;

    if (state.isPlaying) {
      // Pause - save current video time
      const wallClockElapsed = (Date.now() - state.wallClockStart) / 1000;
      state.videoTime = state.videoTime + wallClockElapsed * state.speed;
      state.isPlaying = false;
      console.log('[TripReplay] PAUSED at', state.videoTime.toFixed(1), 'seconds');
      setIsPaused(true);
    } else {
      // Play or Resume
      state.wallClockStart = Date.now();
      state.isPlaying = true;
      console.log(
        '[TripReplay] PLAYING from',
        state.videoTime.toFixed(1),
        'seconds at',
        state.speed + 'x speed'
      );
      setIsReplaying(true);
      setIsPaused(false);
    }
  }, [selectedTrip, routeCoordinates]);

  // Handle reset
  const handleReset = useCallback(() => {
    const state = playbackStateRef.current;
    state.videoTime = 0;
    state.isPlaying = false;
    state.wallClockStart = 0;

    console.log('[TripReplay] RESET');
    setIsReplaying(false);
    setIsPaused(false);
    setReplayProgress(0);

    replayMarker.current?.remove();
    replayMarker.current = null;
  }, []);

  // Handle speed change
  const handleSpeedChange = useCallback((newSpeed: number) => {
    const state = playbackStateRef.current;
    const oldSpeed = state.speed;

    if (state.isPlaying) {
      // Save current video time, then reset wall clock for new speed
      const wallClockElapsed = (Date.now() - state.wallClockStart) / 1000;
      state.videoTime = state.videoTime + wallClockElapsed * state.speed;
      state.wallClockStart = Date.now();
      console.log(
        '[TripReplay] SPEED CHANGE:',
        oldSpeed + 'x →',
        newSpeed + 'x at',
        state.videoTime.toFixed(1),
        'seconds'
      );
    } else {
      console.log('[TripReplay] SPEED CHANGE (paused):', oldSpeed + 'x →', newSpeed + 'x');
    }

    state.speed = newSpeed;
    setReplaySpeed(newSpeed); // Update UI
  }, []);

  // Handle seek
  const handleSeek = useCallback(
    (newProgress: number) => {
      const tripDuration = selectedTrip?.duration || 0;
      const state = playbackStateRef.current;

      // Set new video time
      state.videoTime = (newProgress / 100) * tripDuration;
      state.wallClockStart = Date.now();

      console.log(
        '[TripReplay] SEEK to',
        newProgress.toFixed(1) + '%',
        '(' + state.videoTime.toFixed(1),
        'seconds)'
      );

      // Force immediate UI update using flushSync for instant visual feedback
      flushSync(() => {
        setReplayProgress(newProgress);
      });

      // Update marker position (works for both playing and paused)
      updateMarkerPosition(newProgress / 100);
    },
    [selectedTrip, updateMarkerPosition]
  );

  // Main animation loop - ref-based, no stale closures!
  useEffect(() => {
    if (!selectedTrip || routeCoordinates.length < 2) return;

    const tripDuration = selectedTrip.duration;
    if (!tripDuration) return;

    let frameId: number;
    let lastLogTime = 0;

    const animate = () => {
      const state = playbackStateRef.current;

      if (!state.isPlaying) return;

      // Calculate current video time
      const wallClockElapsed = (Date.now() - state.wallClockStart) / 1000;
      const currentVideoTime = state.videoTime + wallClockElapsed * state.speed;

      // Check if animation complete
      if (currentVideoTime >= tripDuration) {
        state.videoTime = tripDuration;
        state.isPlaying = false;
        console.log('[TripReplay] ANIMATION COMPLETE at', tripDuration, 'seconds');
        setReplayProgress(100);
        setIsReplaying(false);
        setIsPaused(false);
        replayMarker.current?.remove();
        replayMarker.current = null;
        return;
      }

      // Update progress bar
      const progress = (currentVideoTime / tripDuration) * 100;
      setReplayProgress(progress);

      // Update marker position
      updateMarkerPosition(currentVideoTime / tripDuration);

      // Debug log every 2 seconds of video time
      if (currentVideoTime - lastLogTime >= 2) {
        console.log(
          '[TripReplay] Progress:',
          progress.toFixed(1) + '%',
          '(' + currentVideoTime.toFixed(1) + 's /',
          tripDuration.toFixed(0) + 's)',
          'at',
          state.speed + 'x'
        );
        lastLogTime = currentVideoTime;
      }

      // Schedule next frame
      frameId = requestAnimationFrame(animate);
    };

    // Start animation if playing
    if (playbackStateRef.current.isPlaying) {
      console.log('[TripReplay] Animation loop STARTED for', tripDuration, 'second trip');
      frameId = requestAnimationFrame(animate);
    }

    // Cleanup
    return () => {
      if (frameId) {
        cancelAnimationFrame(frameId);
        console.log('[TripReplay] Animation loop STOPPED');
      }
    };
  }, [selectedTrip, routeCoordinates, updateMarkerPosition, isReplaying]); // Re-run when play state changes

  // Clean up replay when trip changes or view mode changes
  useEffect(() => {
    handleReset();
  }, [selectedTrip, viewMode, handleReset]);

  // Clean up on unmount
  useEffect(() => {
    const state = playbackStateRef.current;
    return () => {
      replayMarker.current?.remove();
      state.isPlaying = false;
    };
  }, []);

  // Calculate elapsed and total time for display
  const tripDuration = selectedTrip?.duration || 0;
  const elapsedTime = formatTime((replayProgress / 100) * tripDuration);
  const totalTime = formatTime(tripDuration);
  const canReplay =
    viewMode === 'trip' &&
    selectedTrip !== null &&
    routeCoordinates.length >= 2 &&
    selectedTrip.startLat !== 0 &&
    selectedTrip.startLon !== 0 &&
    selectedTrip.endLat !== 0 &&
    selectedTrip.endLon !== 0;

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainer} className="w-full h-full" />

      {/* Station Names Overlay - Quick reference for start/end stations (only in trip mode) */}
      {viewMode === 'trip' &&
        selectedTrip &&
        selectedTrip.startLat !== 0 &&
        selectedTrip.startLon !== 0 &&
        selectedTrip.endLat !== 0 &&
        selectedTrip.endLon !== 0 &&
        (selectedTrip.startStationName || selectedTrip.endStationName) && (
          <div className="absolute top-4 left-4 space-y-2 max-w-xs">
            {selectedTrip.startStationName && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg px-3 py-2 border border-gray-200 dark:border-gray-700 flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-blue-500 flex-shrink-0"></div>
                <p className="text-xs text-gray-700 dark:text-gray-300 font-medium">
                  {selectedTrip.startStationName}
                </p>
              </div>
            )}
            {selectedTrip.endStationName && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg px-3 py-2 border border-gray-200 dark:border-gray-700 flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500 flex-shrink-0"></div>
                <p className="text-xs text-gray-700 dark:text-gray-300 font-medium">
                  {selectedTrip.endStationName}
                </p>
              </div>
            )}
          </div>
        )}

      {/* No Route Data Overlay (only in trip mode) */}
      {viewMode === 'trip' &&
        selectedTrip &&
        (selectedTrip.startLat === 0 ||
          selectedTrip.startLon === 0 ||
          selectedTrip.endLat === 0 ||
          selectedTrip.endLon === 0) && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md text-center shadow-xl">
              <div className="text-4xl mb-4">🗺️</div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                {t('tripVisualizationMap.routeNotAvailable')}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {t('tripVisualizationMap.noLocationData')}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-500 mt-4">
                {t('tripVisualizationMap.futureUpdates')}
              </p>
            </div>
          </div>
        )}

      {/* No Trip Selected Overlay (only in trip mode) */}
      {viewMode === 'trip' && !selectedTrip && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md text-center shadow-xl">
            <div className="text-4xl mb-4">📍</div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
              {t('tripVisualizationMap.selectATrip')}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {t('tripVisualizationMap.chooseTrip')}
            </p>
          </div>
        </div>
      )}

      {/* Trip Replay Controls */}
      <TripReplayControls
        isReplaying={isReplaying}
        isPaused={isPaused}
        progress={replayProgress}
        speed={replaySpeed}
        canReplay={canReplay}
        elapsedTime={elapsedTime}
        totalTime={totalTime}
        onPlayPause={handlePlayPause}
        onReset={handleReset}
        onSpeedChange={handleSpeedChange}
        onSeek={handleSeek}
      />
    </div>
  );
}
