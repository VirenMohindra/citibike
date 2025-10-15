// Map Marker Renderers - Progressive Disclosure System
// Different marker rendering strategies based on zoom level
//
// CRITICAL FIX FOR FLOATING MARKERS:
// Containers have FIXED sizes that never change:
// - Route markers: 40x40px (start/end/waypoint)
// - Info markers: 70x80px (regular stations with BA info)
// This ensures Mapbox anchor calculations remain valid when toggling views

import type { StationReward, StationWithStatus } from '@/lib/types';

/**
 * Zoom level breakpoints for progressive disclosure
 * - FAR (<14): Simple colored dots
 * - MEDIUM (14-16): Compact info boxes with BA + bike count
 * - CLOSE (>16): Detailed cards with full breakdown
 */
export const ZOOM_BREAKPOINTS = {
  FAR: 14,
  MEDIUM: 16,
} as const;

export type MarkerType = 'simple' | 'compact' | 'detailed';

/**
 * Determine which marker type to render based on zoom level
 */
export function getMarkerType(zoom: number): MarkerType {
  if (zoom < ZOOM_BREAKPOINTS.FAR) return 'simple';
  if (zoom < ZOOM_BREAKPOINTS.MEDIUM) return 'compact';
  return 'detailed';
}

/**
 * Get marker color based on station availability
 */
export function getMarkerColor(
  station: StationWithStatus,
  isStart: boolean,
  isEnd: boolean,
  isWaypoint: boolean
): string {
  if (isStart) return '#3B82F6'; // blue-500
  if (isEnd) return '#EF4444'; // red-500
  if (isWaypoint) return '#8B5CF6'; // purple-500

  const bikesAvailable = station.num_bikes_available ?? 0;
  if (bikesAvailable > 5) return '#10B981'; // green-500
  if (bikesAvailable > 0) return '#F59E0B'; // amber-500
  return '#9CA3AF'; // gray-400
}

/**
 * Render a unified marker container that holds all three display types
 * Visibility is toggled via CSS classes based on zoom level
 * CRITICAL: This approach NEVER changes marker dimensions - only class names
 */
export function renderUnifiedMarker(
  station: StationWithStatus,
  isStart: boolean,
  isEnd: boolean,
  isWaypoint: boolean,
  markerType: MarkerType,
  reward?: StationReward
): HTMLDivElement {
  const container = document.createElement('div');
  container.className = `marker marker-container`;
  container.style.cursor = 'pointer';

  // Add data attributes for easy updates
  container.dataset.stationId = station.station_id;
  container.dataset.markerType = markerType;

  // Render the appropriate view based on markerType
  let view: HTMLDivElement;
  if (markerType === 'simple') {
    view = createSimpleView(station, isStart, isEnd, isWaypoint);
  } else if (markerType === 'compact') {
    view = createCompactView(station, isStart, isEnd, isWaypoint, reward);
  } else {
    view = createDetailedView(station, isStart, isEnd, isWaypoint, reward);
  }

  container.appendChild(view);
  return container;
}

/**
 * Create simple view (small colored dot)
 */
function createSimpleView(
  station: StationWithStatus,
  isStart: boolean,
  isEnd: boolean,
  isWaypoint: boolean
): HTMLDivElement {
  const el = document.createElement('div');
  const color = getMarkerColor(station, isStart, isEnd, isWaypoint);

  el.className = 'marker-view marker-simple';
  el.style.width = isStart || isEnd || isWaypoint ? '14px' : '10px';
  el.style.height = isStart || isEnd || isWaypoint ? '14px' : '10px';
  el.style.borderRadius = '50%';
  el.style.backgroundColor = color;
  el.style.border = '2px solid white';
  el.style.boxShadow = '0 1px 2px rgba(0,0,0,0.2)';

  return el;
}

/**
 * Create compact view (info box with BA + bike count)
 */
function createCompactView(
  station: StationWithStatus,
  isStart: boolean,
  isEnd: boolean,
  isWaypoint: boolean,
  reward?: StationReward
): HTMLDivElement {
  const el = document.createElement('div');
  const color = getMarkerColor(station, isStart, isEnd, isWaypoint);
  const isDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;

  // For route stations, use colored circle
  if (isStart || isEnd || isWaypoint) {
    el.className = 'marker-view marker-compact marker-route';
    el.style.width = '32px';
    el.style.height = '32px';
    el.style.borderRadius = '50%';
    el.style.backgroundColor = color;
    el.style.border = '3px solid white';
    el.style.boxShadow = '0 2px 6px rgba(0,0,0,0.3)';
    return el;
  }

  // For regular stations, use info box
  el.className = 'marker-view marker-compact marker-info';
  el.style.width = '50px';
  el.style.height = '32px'; // Fixed height
  el.style.backgroundColor = isDark ? 'rgba(31, 41, 55, 0.98)' : 'rgba(255, 255, 255, 0.98)';
  el.style.borderRadius = '8px';
  el.style.display = 'flex';
  el.style.flexDirection = 'column';
  el.style.alignItems = 'center';
  el.style.justifyContent = 'center';
  el.style.padding = '3px 4px 2px 4px'; // Reduced bottom padding
  el.style.position = 'relative';

  // Add colored top border if BA points available
  if (reward && reward.points > 0) {
    const borderColor = reward.points >= 5 ? '#10B981' : reward.points >= 3 ? '#F97316' : '#F59E0B';
    el.style.border = isDark ? `2px solid rgba(255,255,255,0.15)` : `2px solid rgba(0,0,0,0.08)`;
    el.style.borderTop = `3px solid ${borderColor}`;
  } else {
    el.style.border = isDark ? '2px solid rgba(255,255,255,0.15)' : '2px solid rgba(0,0,0,0.08)';
  }

  el.style.boxShadow = isDark
    ? '0 6px 12px rgba(0,0,0,0.5), 0 2px 4px rgba(0,0,0,0.3)'
    : '0 4px 8px rgba(0,0,0,0.12), 0 2px 4px rgba(0,0,0,0.08)';

  // No badge for compact view - just the colored border is enough

  // Bike count
  const bikesAvailable = station.num_bikes_available ?? 0;
  const bikeCount = document.createElement('div');
  bikeCount.className = 'bike-count';
  bikeCount.style.fontSize = '16px';
  bikeCount.style.fontWeight = 'bold';
  bikeCount.style.color = isDark
    ? bikesAvailable > 0
      ? '#F9FAFB'
      : '#6B7280'
    : bikesAvailable > 0
      ? '#111827'
      : '#9CA3AF';
  bikeCount.textContent = `${bikesAvailable}`;
  el.appendChild(bikeCount);

  // Bike type icon (SVG)
  const regularBikes = bikesAvailable - (station.num_ebikes_available ?? 0);
  const eBikes = station.num_ebikes_available ?? 0;
  const bikeIcon = document.createElement('div');
  bikeIcon.style.lineHeight = '1';
  bikeIcon.style.marginTop = '1px';
  bikeIcon.style.display = 'flex';
  bikeIcon.style.alignItems = 'center';
  bikeIcon.style.justifyContent = 'center';

  if (regularBikes > 0 && eBikes > 0) {
    // Both types: show lightning bolt for e-bikes
    bikeIcon.innerHTML = `
      <svg width="10" height="10" fill="none" stroke="${isDark ? '#10B981' : '#059669'}" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M13 10V3L4 14h7v7l9-11h-7z"/>
      </svg>
    `;
  } else if (eBikes > 0) {
    // E-bikes only: show lightning bolt
    bikeIcon.innerHTML = `
      <svg width="10" height="10" fill="none" stroke="${isDark ? '#10B981' : '#059669'}" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M13 10V3L4 14h7v7l9-11h-7z"/>
      </svg>
    `;
  } else if (regularBikes > 0) {
    // Regular bikes only: show bike icon
    bikeIcon.innerHTML = `
      <svg width="10" height="10" fill="${isDark ? '#F9FAFB' : '#111827'}" viewBox="0 0 24 24">
        <path d="M15.5 5.5c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zM5 12c-2.8 0-5 2.2-5 5s2.2 5 5 5 5-2.2 5-5-2.2-5-5-5zm0 8.5c-1.9 0-3.5-1.6-3.5-3.5s1.6-3.5 3.5-3.5 3.5 1.6 3.5 3.5-1.6 3.5-3.5 3.5zm5.8-10l2.4-2.4.8.8c1.3 1.3 3 2.1 5.1 2.1V9c-1.5 0-2.7-.6-3.6-1.5l-1.9-1.9c-.5-.4-1-.6-1.6-.6s-1.1.2-1.4.6L7.8 8.4c-.4.4-.6.9-.6 1.4 0 .6.2 1.1.6 1.4L11 14v5h2v-6.2l-2.2-2.3zM19 12c-2.8 0-5 2.2-5 5s2.2 5 5 5 5-2.2 5-5-2.2-5-5-5zm0 8.5c-1.9 0-3.5-1.6-3.5-3.5s1.6-3.5 3.5-3.5 3.5 1.6 3.5 3.5-1.6 3.5-3.5 3.5z"/>
      </svg>
    `;
  }

  if (bikeIcon.innerHTML) {
    el.appendChild(bikeIcon);
  }

  return el;
}

/**
 * Create detailed view (large card with full breakdown)
 */
function createDetailedView(
  station: StationWithStatus,
  isStart: boolean,
  isEnd: boolean,
  isWaypoint: boolean,
  reward?: StationReward
): HTMLDivElement {
  const el = document.createElement('div');
  const color = getMarkerColor(station, isStart, isEnd, isWaypoint);
  const isDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;

  // For route stations, use larger colored circle
  if (isStart || isEnd || isWaypoint) {
    el.className = 'marker-view marker-detailed marker-route';
    el.style.width = '40px';
    el.style.height = '40px';
    el.style.borderRadius = '50%';
    el.style.backgroundColor = color;
    el.style.border = '3px solid white';
    el.style.boxShadow = '0 3px 8px rgba(0,0,0,0.3)';
    el.style.display = 'flex';
    el.style.alignItems = 'center';
    el.style.justifyContent = 'center';

    // Add label
    const label = document.createElement('div');
    label.style.fontSize = '12px';
    label.style.fontWeight = 'bold';
    label.style.color = 'white';
    label.textContent = isStart ? 'S' : isEnd ? 'E' : 'W';
    el.appendChild(label);

    return el;
  }

  // For regular stations, use detailed card
  el.className = 'marker-view marker-detailed marker-info';
  el.style.width = 'auto'; // Auto width to fit content
  el.style.minWidth = '60px';
  el.style.maxWidth = '90px';
  el.style.backgroundColor = isDark ? 'rgba(31, 41, 55, 0.98)' : 'rgba(255, 255, 255, 0.98)';
  el.style.borderRadius = '8px';
  el.style.position = 'relative';
  el.style.overflow = 'visible'; // Allow badge and arrow to show outside
  el.style.border = isDark ? '2px solid rgba(255,255,255,0.15)' : '2px solid rgba(0,0,0,0.08)';
  el.style.boxShadow = isDark
    ? '0 8px 16px rgba(0,0,0,0.5), 0 3px 6px rgba(0,0,0,0.3)'
    : '0 6px 12px rgba(0,0,0,0.12), 0 2px 4px rgba(0,0,0,0.08)';

  // Create inner content wrapper
  const contentWrapper = document.createElement('div');
  contentWrapper.style.display = 'flex';
  contentWrapper.style.flexDirection = 'column';
  contentWrapper.style.alignItems = 'center';
  contentWrapper.style.justifyContent = 'center';
  contentWrapper.style.padding = '4px 6px';
  contentWrapper.style.gap = '3px';
  contentWrapper.style.boxSizing = 'border-box';

  // Add arrow indicator pointing to exact location
  const arrow = document.createElement('div');
  arrow.style.position = 'absolute';
  arrow.style.bottom = '-8px';
  arrow.style.left = '50%';
  arrow.style.transform = 'translateX(-50%)';
  arrow.style.width = '0';
  arrow.style.height = '0';
  arrow.style.borderLeft = '8px solid transparent';
  arrow.style.borderRight = '8px solid transparent';
  arrow.style.borderTop = isDark
    ? '8px solid rgba(31, 41, 55, 0.98)'
    : '8px solid rgba(255, 255, 255, 0.98)';
  arrow.style.filter = 'drop-shadow(0 2px 3px rgba(0,0,0,0.2))';
  arrow.style.pointerEvents = 'none';
  el.appendChild(arrow);

  // BA reward badge - positioned above the card
  if (reward && reward.points > 0) {
    const baBadge = document.createElement('div');
    baBadge.style.position = 'absolute';
    baBadge.style.top = '-10px';
    baBadge.style.left = '50%';
    baBadge.style.transform = 'translateX(-50%)';
    baBadge.style.fontSize = '11px';
    baBadge.style.fontWeight = 'bold';
    baBadge.style.color = '#fff';
    baBadge.style.backgroundColor =
      reward.points >= 5 ? '#10B981' : reward.points >= 3 ? '#F97316' : '#F59E0B';
    baBadge.style.borderRadius = '5px';
    baBadge.style.padding = '3px 6px';
    baBadge.style.lineHeight = '1';
    baBadge.style.whiteSpace = 'nowrap';
    baBadge.style.zIndex = '10';
    baBadge.style.boxShadow = '0 2px 6px rgba(0,0,0,0.25)';

    // Show directional indicators if both pickup and dropoff are available
    if (reward.pickupPoints && reward.dropoffPoints) {
      if (reward.pickupPoints === reward.dropoffPoints) {
        baBadge.textContent = `⬆⬇ ${reward.pickupPoints}`;
      } else {
        baBadge.textContent = `⬆${reward.pickupPoints} ⬇${reward.dropoffPoints}`;
      }
    } else if (reward.pickupPoints) {
      baBadge.textContent = `⬆ ${reward.pickupPoints}`;
    } else if (reward.dropoffPoints) {
      baBadge.textContent = `⬇ ${reward.dropoffPoints}`;
    } else {
      baBadge.textContent = `${reward.points}`;
    }

    el.appendChild(baBadge);
  }

  // Bike type breakdown - horizontal layout (side by side)
  const regularBikes = (station.num_bikes_available ?? 0) - (station.num_ebikes_available ?? 0);
  const eBikes = station.num_ebikes_available ?? 0;
  const docksAvailable = station.num_docks_available ?? 0;

  // Create a container for all bike info (horizontal row)
  const bikeInfoContainer = document.createElement('div');
  bikeInfoContainer.style.display = 'flex';
  bikeInfoContainer.style.flexDirection = 'row';
  bikeInfoContainer.style.alignItems = 'center';
  bikeInfoContainer.style.justifyContent = 'center';
  bikeInfoContainer.style.gap = '4px';
  bikeInfoContainer.style.flexWrap = 'nowrap';

  // E-bikes (icon + number horizontal)
  if (eBikes > 0 || regularBikes === 0) {
    const eBikeItem = document.createElement('div');
    eBikeItem.style.display = 'flex';
    eBikeItem.style.alignItems = 'center';
    eBikeItem.style.gap = '1px';
    eBikeItem.innerHTML = `
      <svg width="9" height="9" fill="none" stroke="${isDark ? (eBikes > 0 ? '#10B981' : '#6B7280') : eBikes > 0 ? '#059669' : '#9CA3AF'}" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M13 10V3L4 14h7v7l9-11h-7z"/>
      </svg>
      <span style="font-weight: 600; font-size: 10px; color: ${isDark ? (eBikes > 0 ? '#F9FAFB' : '#6B7280') : eBikes > 0 ? '#111827' : '#9CA3AF'}">${eBikes}</span>
    `;
    bikeInfoContainer.appendChild(eBikeItem);
  }

  // Regular bikes (icon + number horizontal)
  if (regularBikes > 0 || eBikes === 0) {
    const regularItem = document.createElement('div');
    regularItem.style.display = 'flex';
    regularItem.style.alignItems = 'center';
    regularItem.style.gap = '1px';
    regularItem.innerHTML = `
      <svg width="9" height="9" fill="${isDark ? (regularBikes > 0 ? '#F9FAFB' : '#6B7280') : regularBikes > 0 ? '#111827' : '#9CA3AF'}" viewBox="0 0 24 24">
        <path d="M15.5 5.5c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zM5 12c-2.8 0-5 2.2-5 5s2.2 5 5 5 5-2.2 5-5-2.2-5-5-5zm0 8.5c-1.9 0-3.5-1.6-3.5-3.5s1.6-3.5 3.5-3.5 3.5 1.6 3.5 3.5-1.6 3.5-3.5 3.5zm5.8-10l2.4-2.4.8.8c1.3 1.3 3 2.1 5.1 2.1V9c-1.5 0-2.7-.6-3.6-1.5l-1.9-1.9c-.5-.4-1-.6-1.6-.6s-1.1.2-1.4.6L7.8 8.4c-.4.4-.6.9-.6 1.4 0 .6.2 1.1.6 1.4L11 14v5h2v-6.2l-2.2-2.3zM19 12c-2.8 0-5 2.2-5 5s2.2 5 5 5 5-2.2 5-5-2.2-5-5-5zm0 8.5c-1.9 0-3.5-1.6-3.5-3.5s1.6-3.5 3.5-3.5 3.5 1.6 3.5 3.5-1.6 3.5-3.5 3.5z"/>
      </svg>
      <span style="font-weight: 600; font-size: 10px; color: ${isDark ? (regularBikes > 0 ? '#F9FAFB' : '#6B7280') : regularBikes > 0 ? '#111827' : '#9CA3AF'}">${regularBikes}</span>
    `;
    bikeInfoContainer.appendChild(regularItem);
  }

  // Docks (icon + number horizontal)
  const docksItem = document.createElement('div');
  docksItem.style.display = 'flex';
  docksItem.style.alignItems = 'center';
  docksItem.style.gap = '1px';
  docksItem.innerHTML = `
    <svg width="8" height="8" fill="none" stroke="${isDark ? '#9CA3AF' : '#6B7280'}" stroke-width="2" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z"/>
    </svg>
    <span style="font-weight: 600; font-size: 9px; color: ${isDark ? '#9CA3AF' : '#6B7280'}">${docksAvailable}</span>
  `;
  bikeInfoContainer.appendChild(docksItem);

  // Append bike info to content wrapper
  contentWrapper.appendChild(bikeInfoContainer);

  // Append content wrapper to main element
  el.appendChild(contentWrapper);

  return el;
}

/**
 * Update marker to show correct view for zoom level
 * CRITICAL: Replaces the child view but keeps the same Mapbox marker instance
 */
export function updateMarkerType(
  container: HTMLDivElement,
  newType: MarkerType,
  station: StationWithStatus,
  isStart: boolean,
  isEnd: boolean,
  isWaypoint: boolean,
  reward?: StationReward
): void {
  // Update data attribute
  container.dataset.markerType = newType;

  // Clear existing view
  container.innerHTML = '';

  // Render new view
  let view: HTMLDivElement;
  if (newType === 'simple') {
    view = createSimpleView(station, isStart, isEnd, isWaypoint);
  } else if (newType === 'compact') {
    view = createCompactView(station, isStart, isEnd, isWaypoint, reward);
  } else {
    view = createDetailedView(station, isStart, isEnd, isWaypoint, reward);
  }

  container.appendChild(view);
}
