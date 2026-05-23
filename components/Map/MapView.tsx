"use client";

import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { passColor, primaryPass, type Pass } from "@/lib/passColors";
import { sizeTier, sizeTierRadius } from "@/lib/sizeTier";
import type { Resort } from "./MapPage";

type DriveTime = {
  resort_id: number;
  origin_name: string;
  duration_seconds: number;
  distance_meters: number | null;
};

export type TripRoutePoint = {
  lat: number;
  lng: number;
  label: string;
  kind: "origin" | "resort";
  /** Primary pass key (ikon, epic, indy, mountain_collective,
   *  independent) — used to color the numbered trip-pin marker so it
   *  matches the resort's color on the rest of the map. Defaults to
   *  independent gray if omitted. */
  primaryPass?: string;
};

type Props = {
  resorts: Resort[];
  originName: string;
  driveTimeByResort: Map<number, Map<string, DriveTime>>;
  selectedId: number | null;
  onResortClick: (id: number) => void;
  /** Called once after Mapbox emits its 'load' event. Lets MapPage's
   *  branded loading overlay fade out the moment tiles are ready. The
   *  overlay also has its own 8s safety timeout in case the map fails
   *  to load (e.g. missing NEXT_PUBLIC_MAPBOX_TOKEN, blocked network). */
  onMapLoaded?: () => void;
  // Optional ordered list of points to draw as a route line + numbered
  // markers when the trip planner is open. First point is the origin.
  tripRoute?: TripRoutePoint[];
  // When the user picks a resort for a specific day in the planner, we
  // fly the camera to that resort so they see exactly where they're
  // headed instead of just a bigger bounds. The string token changes
  // each time a pick happens so MapView's effect re-runs even when the
  // coordinates happen to repeat.
  cameraTarget?: { lat: number; lng: number; token: string } | null;
  // Resort IDs included in the active trip plan. We bump these pins
  // visually (bigger radius, gold halo) so the user can tell at a
  // glance which resorts are in their trip vs available alternatives.
  tripResortIds?: number[];
  // Ephemeral dashed line drawn while the user hovers a candidate in
  // the picker. Lets them preview the direction/length of a leg before
  // committing.
  previewLeg?: { fromLat: number; fromLng: number; toLat: number; toLng: number } | null;
  // Bumping this number tells MapView to fitBounds the entire trip
  // route (origin + every resort + return-home leg). Used by the
  // "View full route" button on TripPlannerPanel.
  fitTripVersion?: number;
  // Google-Maps-style "you are here" blue dot. Rendered when the user
  // grants browser geolocation. Null = no dot.
  userLocation?: { lat: number; lng: number } | null;
  // Stage 33 — when true, disable map drag / zoom gestures entirely.
  // Used by MapPage to freeze the map while a full-bleed overlay
  // (search picker / filter drawer) is open. Without this, touches
  // on the overlay leak through to Mapbox's gesture recognizers no
  // matter how aggressively we stopPropagation in React, because
  // Mapbox attaches some listeners at window/document level. Killing
  // the gesture handler at the SOURCE is the only fully reliable fix.
  interactionDisabled?: boolean;
  /** Round 5 polish — when ?airport=DEN is active, MapPage passes
   *  the picked airport's lat/lng/label here so MapView can drop a
   *  ✈️ marker on the map. Null when no airport filter is set. */
  airportMarker?: { lat: number; lng: number; label: string; iata: string } | null;
};

const SOURCE_ID = "wynla-resorts";

// Initial bearing in degrees (0=north, 90=east) from point A to point B.
// Used to rotate the leg-midpoint chevron so it visually points along
// the route in the direction of travel.
function computeBearing(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const toDeg = (rad: number) => (rad * 180) / Math.PI;
  const dLng = toRad(lng2 - lng1);
  const y = Math.sin(dLng) * Math.cos(toRad(lat2));
  const x =
    Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) -
    Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(dLng);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}
const LAYER_CLUSTERS = "wynla-clusters";
const LAYER_CLUSTER_COUNT = "wynla-cluster-count";
const LAYER_LISTED = "wynla-listed-pins";
const LAYER_FEATURED = "wynla-featured-pins";
const LAYER_LABELS_HIGH = "wynla-pin-labels-high";
const LAYER_LABELS_MID = "wynla-pin-labels-mid";
const LAYER_LABELS_LOW = "wynla-pin-labels-low";

// Stage 33 — composite "importance" score for each resort. Drives BOTH
// pin radius AND which zoom level the label appears at, so the map
// reads as a hierarchy at-a-glance: name-brand resorts (Vail / Alta /
// Killington) dominate at low zoom, smaller resorts surface only as
// the user zooms into their region.
//
// Inputs are proxies for "how many skiers care about this resort":
//   - vertical_drop  (mountain physical scale)
//   - total_trails   (terrain breadth)
//   - total_acres    (skiable area)
//   - tier=featured  (hand-curated must-have)
//   - pass coverage  (Ikon/Epic = popular, Indy = mid)
//
// Score range roughly 0-200 (Vail/Killington ≈ 150-170, mid resort
// ≈ 60-80, tiny local hill ≈ 4-10). Numbers chosen so each input
// contributes meaningfully without one drowning others.
//
// Future: replace pass-affiliation proxy with real popularity once
// review-count + trip-share-count + view-count data accumulates.
function computeImportance(r: Resort): number {
  let score = 0;
  if (r.vertical_drop) score += r.vertical_drop / 100;
  if (r.total_trails) score += r.total_trails / 5;
  if (r.total_acres) score += r.total_acres / 100;
  if (r.tier === "featured") score += 30;
  const passes = new Set(r.passes ?? []);
  if (passes.has("ikon") || passes.has("epic")) score += 15;
  else if (passes.has("indy")) score += 8;
  return score;
}

// Stage 33 — smooth radius derived from importance instead of the
// old 3-tier step function. Range: 9px (tiny local) → 22px (Vail).
// Keeps everything visible (clickable target stays ≥ 9px) but lets
// big-brand resorts dominate the visual.
function importanceToRadius(importance: number): number {
  const clamped = Math.max(0, Math.min(200, importance));
  return 9 + (clamped / 200) * 13;
}

// Map a resort to its pin properties for the GeoJSON feature.
function resortToProperties(resort: Resort, dt: DriveTime | undefined) {
  const primary: Pass = primaryPass(resort.passes);
  const tier = sizeTier(resort.vertical_drop);
  const importance = computeImportance(resort);
  return {
    id: resort.id,
    slug: resort.slug,
    name: resort.name,
    state: resort.state,
    region: resort.region ?? "",
    passes: JSON.stringify(resort.passes ?? []),
    tier: resort.tier,
    primary_pass: primary,
    color: passColor(primary),
    size_tier: tier ?? "unknown",
    // Radius now interpolates on importance (smoother + brand-aware).
    // Old sizeTierRadius preserved here as a fallback for resorts
    // with absolutely no data; importanceToRadius defaults to 9px in
    // that case which still hits the 44×44 touch target with the
    // existing clickTolerance: 22 from map init.
    radius: importance > 0 ? importanceToRadius(importance) : sizeTierRadius(tier),
    importance,
    vertical_drop: resort.vertical_drop ?? -1,
    drive_seconds: dt?.duration_seconds ?? -1,
  };
}

export default function MapView({
  resorts,
  originName,
  driveTimeByResort,
  selectedId,
  onResortClick,
  tripRoute,
  cameraTarget,
  tripResortIds,
  previewLeg,
  fitTripVersion,
  userLocation,
  interactionDisabled = false,
  onMapLoaded,
  airportMarker,
}: Props) {
  // Keep a stable ref to the latest onMapLoaded so the once-fired load
  // listener can call the freshest callback without re-binding.
  const onMapLoadedRef = useRef(onMapLoaded);
  useEffect(() => {
    onMapLoadedRef.current = onMapLoaded;
  }, [onMapLoaded]);
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const tripMarkersRef = useRef<mapboxgl.Marker[]>([]);
  const userLocationMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const airportMarkerRef = useRef<mapboxgl.Marker | null>(null);
  // Stage 19.2 fix — flips true once the map has fully loaded (style +
  // initial sources). Every downstream effect (tripRoute, previewLeg,
  // tripResortIds, fitTripVersion, cameraTarget) gates on this so it
  // can safely call addSource/addLayer/setFeatureState without racing
  // mapbox's loading state. Previously each effect did its own
  // `if (map.isStyleLoaded()) apply(); else map.once("style.load",
  // apply)` dance — but `once` is single-fire, so any effect that ran
  // AFTER the initial style.load saw isStyleLoaded() return false (a
  // known mapbox quirk where the flag stays false during ongoing
  // source loads), registered a NEW once handler, and that handler
  // never fired because style.load doesn't replay. Net: trip line +
  // pin highlights stopped working after the very first paint.
  const [mapReady, setMapReady] = useState(false);

  // Keep a stable ref to the latest click handler so the map listeners
  // (registered once) always see the freshest callback without re-registering.
  const onResortClickRef = useRef(onResortClick);
  useEffect(() => {
    onResortClickRef.current = onResortClick;
  }, [onResortClick]);

  // Init map once
  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;

    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    if (!token) {
      console.error("Missing NEXT_PUBLIC_MAPBOX_TOKEN");
      return;
    }
    mapboxgl.accessToken = token;

    // Stage 33 — restore the saved camera (center + zoom) from
    // sessionStorage so back-navigating from /resort/[slug] lands the
    // user where they were on the map, not at the default US-wide
    // view. Session-scoped so closing the tab clears it. Saved on
    // every map moveend below.
    const SAVED_VIEW_KEY = "wynla_map_view_v1";
    let initialCenter: [number, number] = [-95, 40];
    let initialZoom = 3.6;
    try {
      if (typeof window !== "undefined") {
        const raw = window.sessionStorage.getItem(SAVED_VIEW_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as {
            center?: [number, number];
            zoom?: number;
          };
          if (
            Array.isArray(parsed.center) &&
            parsed.center.length === 2 &&
            Number.isFinite(parsed.center[0]) &&
            Number.isFinite(parsed.center[1]) &&
            typeof parsed.zoom === "number" &&
            Number.isFinite(parsed.zoom)
          ) {
            initialCenter = parsed.center;
            initialZoom = parsed.zoom;
          }
        }
      }
    } catch {
      // Malformed JSON / sessionStorage disabled — fall through to defaults.
    }

    const map = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/light-v11",
      // Stage 33 — back to flat mercator. Users zooming out (especially
      // after closing search) were seeing the globe view and reading it
      // as a visual bug ("the map turned into a circle"). Flat is the
      // expected look for a US-only trip-planning map.
      projection: "mercator",
      center: initialCenter,
      zoom: initialZoom,
      // 22 px halo around clicks/taps → effective 44×44 px touch target,
      // even when the visible circle is only 12 px (small size tier).
      clickTolerance: 22,
      // Disable rotate/pitch — flat US map UX, prevents accidental gestures
      pitchWithRotate: false,
      dragRotate: false,
    });
    map.touchZoomRotate.disableRotation();

    // Persist camera on every moveend so we can restore on next mount.
    map.on("moveend", () => {
      try {
        if (typeof window === "undefined") return;
        const c = map.getCenter();
        const z = map.getZoom();
        window.sessionStorage.setItem(
          SAVED_VIEW_KEY,
          JSON.stringify({ center: [c.lng, c.lat], zoom: z }),
        );
      } catch {
        // Storage quota / disabled — best-effort.
      }
    });

    mapRef.current = map;
    // Stage 33 — dropped mapbox NavigationControl (+/- zoom buttons).
    // On mobile they clashed with the floating header pills + the
    // recently-viewed strip; users zoom via pinch-gesture anyway.
    // Re-add per-viewport if we ever want explicit zoom UI back.

    // Setup runs once the basemap style is ready. In Mapbox 3.x the "load"
    // event can be unreliable under React strict-mode double-mount; "style.load"
    // fires earlier and consistently. We also run setup immediately if the
    // style was somehow already loaded by the time this effect mounts.
    const setup = () => {
      // Empty source — features added in the data effect below.
      // Stage 21.1: aggressive de-clustering. Was clusterMaxZoom 7 /
      // radius 50 — meant state-level views (zoom 5-6) showed huge
      // clusters with only counts, hiding which pass each resort
      // belongs to. Now clusters disappear at zoom 5 so the dense
      // East-coast resorts spread out into individual pass-colored
      // pins at any "planning" zoom level.
      map.addSource(SOURCE_ID, {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
        cluster: true,
        clusterMaxZoom: 4,
        clusterRadius: 28,
      });

      // Cluster bubbles: light navy with white border, count label on top
      map.addLayer({
        id: LAYER_CLUSTERS,
        type: "circle",
        source: SOURCE_ID,
        filter: ["has", "point_count"],
        paint: {
          "circle-color": "#1E2952",
          "circle-opacity": 0.85,
          "circle-stroke-width": 2,
          "circle-stroke-color": "#FFFFFF",
          "circle-radius": [
            "step",
            ["get", "point_count"],
            16,   // <10 → 16px
            10,
            22,   // 10-50 → 22px
            50,
            28,   // 50+ → 28px
          ],
        },
      });
      map.addLayer({
        id: LAYER_CLUSTER_COUNT,
        type: "symbol",
        source: SOURCE_ID,
        filter: ["has", "point_count"],
        layout: {
          "text-field": ["get", "point_count_abbreviated"],
          "text-size": 12,
          "text-allow-overlap": true,
          "text-font": ["DIN Pro Bold", "Arial Unicode MS Bold"],
        },
        paint: {
          "text-color": "#FFFFFF",
        },
      });

      // Listed-tier pins: size by vertical_drop (12/16/20 px), color by primary pass.
      // Selected pin gets a wider navy stroke for visual feedback while panel
      // is open. Hovered pin grows by 1.25× and gets a thicker white stroke
      // — a Stripe/Linear-style touch that signals "this is interactive".
      map.addLayer({
        id: LAYER_LISTED,
        type: "circle",
        source: SOURCE_ID,
        filter: [
          "all",
          ["!", ["has", "point_count"]],
          ["==", ["get", "tier"], "listed"],
        ],
        paint: {
          "circle-color": ["get", "color"],
          "circle-radius": [
            "case",
            ["boolean", ["feature-state", "in_trip"], false],
            ["*", ["get", "radius"], 1.5],
            ["boolean", ["feature-state", "hover"], false],
            ["*", ["get", "radius"], 1.25],
            ["get", "radius"],
          ],
          "circle-opacity": 0.85,
          "circle-stroke-width": [
            "case",
            ["boolean", ["feature-state", "in_trip"], false],
            3.5,
            ["boolean", ["feature-state", "selected"], false],
            3,
            ["boolean", ["feature-state", "hover"], false],
            2.5,
            1.5,
          ],
          "circle-stroke-color": [
            "case",
            ["boolean", ["feature-state", "in_trip"], false],
            "#D4A84B",
            ["boolean", ["feature-state", "selected"], false],
            "#1E2952",
            "#FFFFFF",
          ],
          "circle-radius-transition": { duration: 150 },
          "circle-stroke-width-transition": { duration: 150 },
        },
      });

      // Featured-tier pins: same vertical-drop-based size tier as listed pins,
      // full opacity, slightly wider white border (2 px vs 1.5 px)
      map.addLayer({
        id: LAYER_FEATURED,
        type: "circle",
        source: SOURCE_ID,
        filter: [
          "all",
          ["!", ["has", "point_count"]],
          ["==", ["get", "tier"], "featured"],
        ],
        paint: {
          "circle-color": ["get", "color"],
          "circle-radius": [
            "case",
            ["boolean", ["feature-state", "in_trip"], false],
            ["*", ["get", "radius"], 1.5],
            ["boolean", ["feature-state", "hover"], false],
            ["*", ["get", "radius"], 1.25],
            ["get", "radius"],
          ],
          "circle-stroke-width": [
            "case",
            ["boolean", ["feature-state", "in_trip"], false],
            4,
            ["boolean", ["feature-state", "selected"], false],
            4,
            ["boolean", ["feature-state", "hover"], false],
            3,
            2,
          ],
          "circle-stroke-color": [
            "case",
            ["boolean", ["feature-state", "in_trip"], false],
            "#D4A84B",
            ["boolean", ["feature-state", "selected"], false],
            "#1E2952",
            "#FFFFFF",
          ],
          "circle-radius-transition": { duration: 150 },
          "circle-stroke-width-transition": { duration: 150 },
        },
      });

      // Stage 33 — labels split into THREE layers by importance so the
      // map reads as a brand hierarchy. Each tier has its own minzoom:
      //
      //   high  (importance ≥ 50)  → visible from zoom 4.5+ (US-wide view)
      //   mid   (importance 20-50) → visible from zoom 6+   (region view)
      //   low   (importance < 20)  → visible from zoom 8+   (state/close)
      //
      // At any zoom, symbol-sort-key on `importance` ensures the most
      // popular surviving resort wins collision (Mapbox lower sort-key
      // = higher priority, so we negate). Net result: scan the US
      // and only see Vail/Killington/Alta etc; zoom in and smaller
      // local hills surface in their region.
      const sharedLabelLayout = {
        "text-field": ["get", "name"] as unknown as mapboxgl.ExpressionSpecification,
        "text-font": ["DIN Pro Bold", "Arial Unicode MS Bold"],
        "text-variable-anchor": [
          "top",
          "bottom",
          "left",
          "right",
          "top-left",
          "top-right",
          "bottom-left",
          "bottom-right",
        ],
        "text-radial-offset": 1.1,
        "text-justify": "auto" as const,
        "text-allow-overlap": false,
        "text-optional": true,
        "text-max-width": 8,
        "text-padding": 3,
        "symbol-sort-key": ["-", 0, ["get", "importance"]] as unknown as mapboxgl.ExpressionSpecification,
      } satisfies Partial<mapboxgl.SymbolLayerSpecification["layout"]>;

      const sharedLabelPaint = {
        "text-color": "#0F1530",
        "text-halo-color": "#FFFFFF",
        "text-halo-width": 1.8,
        "text-halo-blur": 0.4,
      } satisfies mapboxgl.SymbolLayerSpecification["paint"];

      // HIGH tier — name-brand resorts visible at every zoom
      map.addLayer({
        id: LAYER_LABELS_HIGH,
        type: "symbol",
        source: SOURCE_ID,
        filter: [
          "all",
          ["!", ["has", "point_count"]],
          [">=", ["get", "importance"], 50],
        ],
        minzoom: 4.5,
        layout: {
          ...sharedLabelLayout,
          "text-size": [
            "interpolate",
            ["linear"],
            ["zoom"],
            4.5, 10,
            6, 11,
            8, 12,
            10, 13,
            14, 15,
          ],
        },
        paint: sharedLabelPaint,
      });

      // MID tier — mid-size regional resorts, surface at state-zoom
      map.addLayer({
        id: LAYER_LABELS_MID,
        type: "symbol",
        source: SOURCE_ID,
        filter: [
          "all",
          ["!", ["has", "point_count"]],
          [">=", ["get", "importance"], 20],
          ["<", ["get", "importance"], 50],
        ],
        minzoom: 6,
        layout: {
          ...sharedLabelLayout,
          "text-size": [
            "interpolate",
            ["linear"],
            ["zoom"],
            6, 9,
            8, 11,
            10, 12,
            14, 14,
          ],
        },
        paint: sharedLabelPaint,
      });

      // LOW tier — small local hills, only when zoomed in close
      map.addLayer({
        id: LAYER_LABELS_LOW,
        type: "symbol",
        source: SOURCE_ID,
        filter: [
          "all",
          ["!", ["has", "point_count"]],
          ["<", ["get", "importance"], 20],
        ],
        minzoom: 8,
        layout: {
          ...sharedLabelLayout,
          "text-size": [
            "interpolate",
            ["linear"],
            ["zoom"],
            8, 9,
            10, 11,
            14, 13,
          ],
        },
        paint: sharedLabelPaint,
      });

      // Cluster click → zoom in
      map.on("click", LAYER_CLUSTERS, (e) => {
        const features = map.queryRenderedFeatures(e.point, { layers: [LAYER_CLUSTERS] });
        const clusterId = features[0]?.properties?.cluster_id as number | undefined;
        const geom = features[0]?.geometry;
        if (clusterId == null || !geom || geom.type !== "Point") return;
        const src = map.getSource(SOURCE_ID) as mapboxgl.GeoJSONSource;
        src.getClusterExpansionZoom(clusterId, (err, zoom) => {
          if (err || zoom == null) return;
          map.easeTo({
            center: geom.coordinates as [number, number],
            zoom,
          });
        });
      });

      // Pin click → notify parent (which opens the side panel / bottom sheet).
      // Stage 4.1 used a Mapbox popup here; that's now handled by ResortPanel.
      const pinLayers = [LAYER_LISTED, LAYER_FEATURED];
      let hoveredFeatureId: number | null = null;
      pinLayers.forEach((layerId) => {
        map.on("click", layerId, (e) => {
          const f = e.features?.[0];
          const id = f?.properties?.id;
          if (typeof id === "number") onResortClickRef.current(id);
        });
        // Hover state: track the feature under the cursor and toggle its
        // hover feature-state. Pin radius/stroke smoothly scale via the
        // paint expressions defined on each layer.
        map.on("mousemove", layerId, (e) => {
          const f = e.features?.[0];
          const id = f?.properties?.id;
          if (typeof id !== "number") return;
          if (hoveredFeatureId === id) return;
          if (hoveredFeatureId != null) {
            map.setFeatureState(
              { source: SOURCE_ID, id: hoveredFeatureId },
              { hover: false },
            );
          }
          hoveredFeatureId = id;
          map.setFeatureState(
            { source: SOURCE_ID, id },
            { hover: true },
          );
          map.getCanvas().style.cursor = "pointer";
        });
        map.on("mouseleave", layerId, () => {
          if (hoveredFeatureId != null) {
            map.setFeatureState(
              { source: SOURCE_ID, id: hoveredFeatureId },
              { hover: false },
            );
            hoveredFeatureId = null;
          }
          map.getCanvas().style.cursor = "";
        });
      });
      map.on("mouseenter", LAYER_CLUSTERS, () => {
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", LAYER_CLUSTERS, () => {
        map.getCanvas().style.cursor = "";
      });

      if (process.env.NODE_ENV === "development" && typeof window !== "undefined") {
        (window as unknown as { __map: mapboxgl.Map }).__map = map;
      }
    };

    if (map.isStyleLoaded()) setup();
    else map.on("style.load", setup);

    // Flip mapReady once the map's "load" event fires — that's the
    // signal that style + initial sources are fully loaded and it's
    // safe to add/remove sources & layers from any downstream effect.
    // Idempotent: only set once. If load already fired before we
    // register (rare, but possible under StrictMode double-mount), we
    // catch up via map.loaded(). Also fires the parent's onMapLoaded
    // callback so the branded loading overlay can fade out.
    const onLoad = () => {
      setMapReady(true);
      onMapLoadedRef.current?.();
    };
    if (map.loaded()) onLoad();
    else map.once("load", onLoad);

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Update GeoJSON data when filtered resorts change
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const apply = () => {
      const src = map.getSource(SOURCE_ID) as mapboxgl.GeoJSONSource | undefined;
      if (!src) return;

      const features = resorts
        .map((resort) => {
          const lng = Number(resort.longitude);
          const lat = Number(resort.latitude);
          if (!Number.isFinite(lng) || !Number.isFinite(lat)) return null;
          const dt = driveTimeByResort.get(resort.id)?.get(originName);
          return {
            type: "Feature" as const,
            id: resort.id,
            geometry: { type: "Point" as const, coordinates: [lng, lat] },
            properties: resortToProperties(resort, dt),
          };
        })
        .filter((f): f is NonNullable<typeof f> => f !== null);

      src.setData({ type: "FeatureCollection", features });
    };

    // Source is added by the init effect's setup() once mapReady. We
    // gate this effect on mapReady too so it doesn't run before the
    // source exists.
    if (mapRef.current?.getSource(SOURCE_ID)) apply();
  }, [resorts, originName, driveTimeByResort, mapReady]);

  // Sync the "selected" feature-state so the matching pin gets a navy halo.
  // Mapbox lets us toggle one boolean per feature without re-emitting the
  // whole GeoJSON, which is much cheaper than re-rendering 451 features.
  // Also pan the map so the selected pin sits clear of the panel: on desktop
  // the panel covers the right ~380 px, so we shift the camera left by half
  // the panel width to keep the pin visually centered in the *visible* area.
  const lastSelectedRef = useRef<number | null>(null);
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const apply = () => {
      const prev = lastSelectedRef.current;
      if (prev != null) {
        map.setFeatureState({ source: SOURCE_ID, id: prev }, { selected: false });
      }
      if (selectedId != null) {
        map.setFeatureState({ source: SOURCE_ID, id: selectedId }, { selected: true });

        // Find the feature in the source data + pan camera. Skip if the
        // pin is already visible in the unobstructed area to avoid jarring
        // motion when the user clicked on-screen.
        const resort = resorts.find((r) => r.id === selectedId);
        if (resort) {
          const lng = Number(resort.longitude);
          const lat = Number(resort.latitude);
          if (Number.isFinite(lng) && Number.isFinite(lat)) {
            const isDesktop = window.matchMedia("(min-width: 768px)").matches;
            map.easeTo({
              center: [lng, lat],
              // Desktop: panel covers right 380 px → shift center left so pin
              // ends up around 35% from left edge (visually centered in the
              // ~1180 px visible area).
              padding: isDesktop
                ? { right: 380, top: 0, bottom: 0, left: 0 }
                : { right: 0, top: 0, bottom: 380, left: 0 },
              duration: 600,
            });
          }
        }
      }
      lastSelectedRef.current = selectedId;
    };
    if (map.getSource(SOURCE_ID)) apply();
  }, [selectedId, resorts, mapReady]);

  // Trip-route overlay: when the planner is open we draw a connecting
  // line between the origin and each resort in plan order, plus a small
  // numbered marker per stop so the order on the map matches the panel.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    const ROUTE_SRC = "wynla-trip-route";
    const ROUTE_LAYER = "wynla-trip-route-line";

    const apply = () => {
      // Tear down previous markers and route every time — it's a small
      // dataset (≤11 stops) so this is cheaper than diffing.
      for (const m of tripMarkersRef.current) m.remove();
      tripMarkersRef.current = [];
      if (map.getLayer(ROUTE_LAYER)) map.removeLayer(ROUTE_LAYER);
      if (map.getSource(ROUTE_SRC)) map.removeSource(ROUTE_SRC);

      if (!tripRoute || tripRoute.length < 2) return;

      const coords = tripRoute.map((p) => [p.lng, p.lat] as [number, number]);
      map.addSource(ROUTE_SRC, {
        type: "geojson",
        data: {
          type: "Feature",
          properties: {},
          geometry: { type: "LineString", coordinates: coords },
        },
      });
      map.addLayer({
        id: ROUTE_LAYER,
        type: "line",
        source: ROUTE_SRC,
        layout: { "line-cap": "round", "line-join": "round" },
        paint: {
          "line-color": "#1E2952",
          "line-width": 3,
          "line-opacity": 0.7,
          "line-dasharray": [2, 1.5],
        },
      });

      // Numbered stop markers. Origin gets "🏠"; each resort day i gets
      // "1", "2", … so the map reads in trip order at a glance. Round 5
      // polish: the resort pins are colored by their primary pass (Ikon
      // yellow / Epic orange / etc.) instead of uniform navy so users
      // can see at a glance which pass each trip stop is on. Origin
      // stays navy. Bigger size + outer white ring + drop shadow makes
      // trip pins dominate over surrounding non-trip circles.
      tripRoute.forEach((p, i) => {
        const el = document.createElement("div");
        el.style.cursor = "pointer";
        if (p.kind === "origin") {
          el.className =
            "flex h-9 w-9 items-center justify-center rounded-full border-[3px] border-white bg-wn-navy text-[13px] font-extrabold text-white";
          el.style.boxShadow =
            "0 0 0 2px rgba(15,21,48,0.35), 0 4px 10px rgba(15,21,48,0.35)";
          el.textContent = "🏠";
        } else {
          const pk = p.primaryPass ?? "independent";
          const bg = passColor(pk);
          // Ikon yellow + Independent gray both fail WCAG with white
          // text. Use the wn-navy ink color for them so the number is
          // always readable. Everything else gets white.
          const fg = pk === "ikon" || pk === "independent" ? "#0F1530" : "#FFFFFF";
          el.className =
            "flex h-9 w-9 items-center justify-center rounded-full border-[3px] border-white text-[13px] font-extrabold";
          el.style.backgroundColor = bg;
          el.style.color = fg;
          // Outer gold halo + drop shadow so the pin glows over the
          // base resort circle below it.
          el.style.boxShadow =
            "0 0 0 2px rgba(212,168,75,0.85), 0 4px 10px rgba(15,21,48,0.45)";
          el.textContent = String(i);
        }
        el.title = p.label;
        const marker = new mapboxgl.Marker({ element: el, anchor: "center" })
          .setLngLat([p.lng, p.lat])
          .addTo(map);
        tripMarkersRef.current.push(marker);
      });

      // Direction arrows at each leg midpoint. The bearing puts a
      // chevron pointing along the line so the user sees travel
      // direction at a glance ("east → west" vs "west → east"). Hidden
      // on legs shorter than ~30 km because the chevron would crowd
      // the endpoint markers.
      for (let i = 0; i < tripRoute.length - 1; i++) {
        const a = tripRoute[i];
        const b = tripRoute[i + 1];
        const midLng = (a.lng + b.lng) / 2;
        const midLat = (a.lat + b.lat) / 2;
        const bearing = computeBearing(a.lat, a.lng, b.lat, b.lng);
        const el = document.createElement("div");
        el.className =
          "flex h-5 w-5 items-center justify-center rounded-full border border-white bg-wn-navy/85 text-[10px] font-bold text-white shadow";
        el.style.transform = `rotate(${bearing - 90}deg)`;
        el.textContent = "▶";
        el.title = `${a.label} → ${b.label}`;
        const marker = new mapboxgl.Marker({ element: el, anchor: "center" })
          .setLngLat([midLng, midLat])
          .addTo(map);
        tripMarkersRef.current.push(marker);
      }

      // NB: NO auto-fitBounds here — Stage 19 fix. Stage 17 added
      // pendingStop to tripRoute, which fires this effect on every
      // pick. Pairing it with fitBounds caused a tug-of-war with the
      // cameraTarget flyTo (which zooms into the picked resort), so
      // the user lost the "zoom in to the new resort" behavior. The
      // explicit fitTripVersion effect below is the only path that
      // still fits the whole route — triggered by the user clicking
      // "View full route on map" in the trip planner footer.
    };

    apply();

    return () => {
      // Cleanup runs on unmount AND on every tripRoute change before the
      // next apply() runs. Apply() handles its own removal so the cleanup
      // here mostly matters when the component itself unmounts.
      for (const m of tripMarkersRef.current) m.remove();
      tripMarkersRef.current = [];
      if (mapRef.current) {
        if (mapRef.current.getLayer(ROUTE_LAYER)) mapRef.current.removeLayer(ROUTE_LAYER);
        if (mapRef.current.getSource(ROUTE_SRC)) mapRef.current.removeSource(ROUTE_SRC);
      }
    };
  }, [tripRoute, mapReady]);

  // Sync in_trip feature-state for the resort source so trip pins get
  // the bigger gold-haloed paint. Diffs against the previous render so
  // we only flip the changed pins, never re-flip the whole map.
  const lastTripIdsRef = useRef<Set<number>>(new Set());
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    const apply = () => {
      if (!map.getSource(SOURCE_ID)) return;
      const next = new Set(tripResortIds ?? []);
      const prev = lastTripIdsRef.current;
      for (const id of prev) {
        if (!next.has(id)) {
          map.setFeatureState({ source: SOURCE_ID, id }, { in_trip: false });
        }
      }
      for (const id of next) {
        if (!prev.has(id)) {
          map.setFeatureState({ source: SOURCE_ID, id }, { in_trip: true });
        }
      }
      lastTripIdsRef.current = next;
    };
    apply();
  }, [tripResortIds, mapReady]);

  // Preview leg — ephemeral dashed line from the previous resort to a
  // candidate the user is hovering inside the picker. Helps them see
  // the direction/length of a leg before committing to the pick.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    const PREVIEW_SRC = "wynla-preview-leg";
    const PREVIEW_LAYER = "wynla-preview-leg-line";
    const apply = () => {
      if (map.getLayer(PREVIEW_LAYER)) map.removeLayer(PREVIEW_LAYER);
      if (map.getSource(PREVIEW_SRC)) map.removeSource(PREVIEW_SRC);
      if (!previewLeg) return;
      map.addSource(PREVIEW_SRC, {
        type: "geojson",
        data: {
          type: "Feature",
          properties: {},
          geometry: {
            type: "LineString",
            coordinates: [
              [previewLeg.fromLng, previewLeg.fromLat],
              [previewLeg.toLng, previewLeg.toLat],
            ],
          },
        },
      });
      map.addLayer({
        id: PREVIEW_LAYER,
        type: "line",
        source: PREVIEW_SRC,
        layout: { "line-cap": "round", "line-join": "round" },
        paint: {
          "line-color": "#D4A84B",
          "line-width": 2.5,
          "line-opacity": 0.85,
          "line-dasharray": [1, 1.2],
        },
      });
    };
    apply();
    return () => {
      if (mapRef.current) {
        if (mapRef.current.getLayer(PREVIEW_LAYER)) mapRef.current.removeLayer(PREVIEW_LAYER);
        if (mapRef.current.getSource(PREVIEW_SRC)) mapRef.current.removeSource(PREVIEW_SRC);
      }
    };
  }, [previewLeg, mapReady]);

  // "View full route" — fit the camera around the entire trip line
  // when the user explicitly asks for an overview. Triggered by the
  // button on TripPlannerPanel that bumps fitTripVersion.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    if (!fitTripVersion) return;
    if (!tripRoute || tripRoute.length < 2) return;
    const apply = () => {
      const isDesktop = window.matchMedia("(min-width: 768px)").matches;
      const coords = tripRoute.map((p) => [p.lng, p.lat] as [number, number]);
      const bounds = coords.reduce(
        (b, c) => b.extend(c),
        new mapboxgl.LngLatBounds(coords[0], coords[0]),
      );
      map.fitBounds(bounds, {
        padding: isDesktop
          ? { top: 80, bottom: 60, left: 60, right: 440 }
          : { top: 80, bottom: 360, left: 40, right: 40 },
        duration: 700,
        // Stage 19.9 — was maxZoom: 8 which still pinched short trips
        // (NYC→CT, ~80mi) into a tight regional close-up. zoom 6
        // shows roughly state-level (Northeast US fits in viewport)
        // so the user can see surrounding candidate resorts while
        // planning the next stop. Long trips that already span more
        // ground than maxZoom:6 would render at hit fitBounds's
        // natural fit (maxZoom is only an upper limit).
        maxZoom: 6,
      });
    };
    apply();
  }, [fitTripVersion, tripRoute, mapReady]);

  // Camera-follow effect: when the trip planner reports that a specific
  // resort just became the focus (e.g. user picked Day 3 = Loveland),
  // fly the camera over to it. Token in the prop changes per pick so
  // re-picking the same resort still triggers a fly. Skips when no
  // target is set or the map's still loading style.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    if (!cameraTarget) return;
    const apply = () => {
      const isDesktop = window.matchMedia("(min-width: 768px)").matches;
      map.flyTo({
        center: [cameraTarget.lng, cameraTarget.lat],
        // Stage 33 — dropped from zoom 9 → 7. After we removed the
        // explicit +/- zoom controls (Stage 33 earlier), users had no
        // visible way to zoom out of the deep auto-zoom; "screen
        // freezes at this scale" reports came in. Zoom 7 keeps the
        // regional context (neighboring resorts visible) so pinch-out
        // is rarely needed.
        zoom: 7,
        padding: isDesktop
          ? { right: 440, top: 0, bottom: 0, left: 0 }
          : { bottom: 360, top: 0, left: 0, right: 0 },
        duration: 700,
      });
    };
    apply();
  }, [cameraTarget, mapReady]);

  // "You are here" blue dot — Google Maps style. A DOM marker (rather
  // than a circle layer) so we can use CSS @keyframes for the halo
  // pulse animation. Renders only when the user has granted geolocation
  // and the parent passes their lat/lng down.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    // Tear down when location goes away (user switches back to a city).
    if (!userLocation) {
      if (userLocationMarkerRef.current) {
        userLocationMarkerRef.current.remove();
        userLocationMarkerRef.current = null;
      }
      return;
    }
    // Reuse the existing marker if we already have one — just move it.
    if (userLocationMarkerRef.current) {
      userLocationMarkerRef.current.setLngLat([userLocation.lng, userLocation.lat]);
      return;
    }
    const el = document.createElement("div");
    el.className = "wynla-user-loc-marker";
    el.setAttribute("aria-label", "Your location");
    el.innerHTML = `
      <div class="wynla-user-loc-halo"></div>
      <div class="wynla-user-loc-dot"></div>
    `;
    const marker = new mapboxgl.Marker({ element: el, anchor: "center" })
      .setLngLat([userLocation.lng, userLocation.lat])
      .addTo(map);
    userLocationMarkerRef.current = marker;
    return () => {
      marker.remove();
      if (userLocationMarkerRef.current === marker) {
        userLocationMarkerRef.current = null;
      }
    };
  }, [userLocation, mapReady]);

  // Airport marker — Round 5 polish. When the ?airport=DEN filter is
  // active MapPage hands us the airport's coordinates and we drop a
  // ✈️ pin distinct from any resort circle. Uses a DOM marker so the
  // emoji renders cross-platform without needing to add a sprite to
  // the Mapbox style.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    if (!airportMarker) {
      if (airportMarkerRef.current) {
        airportMarkerRef.current.remove();
        airportMarkerRef.current = null;
      }
      return;
    }
    // Reuse existing marker if we have one — just move it.
    if (airportMarkerRef.current) {
      airportMarkerRef.current.setLngLat([airportMarker.lng, airportMarker.lat]);
      return;
    }
    const el = document.createElement("div");
    el.setAttribute("aria-label", `Airport: ${airportMarker.label} (${airportMarker.iata})`);
    el.title = `${airportMarker.label} (${airportMarker.iata})`;
    el.style.cssText = [
      "display:flex",
      "align-items:center",
      "justify-content:center",
      "width:34px",
      "height:34px",
      "border-radius:9999px",
      "background:#ffffff",
      "border:2px solid #1E2952",
      "box-shadow:0 0 0 3px rgba(91,175,230,0.35), 0 4px 10px rgba(15,21,48,0.35)",
      "font-size:18px",
      "line-height:1",
      "cursor:default",
      "pointer-events:none",
    ].join(";");
    el.textContent = "✈️";
    const marker = new mapboxgl.Marker({ element: el, anchor: "center" })
      .setLngLat([airportMarker.lng, airportMarker.lat])
      .addTo(map);
    airportMarkerRef.current = marker;
    return () => {
      marker.remove();
      if (airportMarkerRef.current === marker) {
        airportMarkerRef.current = null;
      }
    };
  }, [airportMarker, mapReady]);

  // Stage 33 — freeze all Mapbox interaction handlers when the parent
  // signals a full-bleed overlay is open (search picker / filter
  // drawer). Disables drag pan, scroll/pinch zoom, double-tap zoom,
  // box zoom, keyboard. Re-enabled when interactionDisabled goes false.
  // This is the source-level fix for the long-running "map pans when
  // I scroll the drawer" bug — works no matter where Mapbox attaches
  // its listeners because we kill the handlers themselves, not the
  // event propagation.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    if (interactionDisabled) {
      map.dragPan.disable();
      map.scrollZoom.disable();
      map.touchZoomRotate.disable();
      map.doubleClickZoom.disable();
      map.boxZoom.disable();
      map.keyboard.disable();
    } else {
      map.dragPan.enable();
      map.scrollZoom.enable();
      map.touchZoomRotate.enable();
      map.doubleClickZoom.enable();
      map.boxZoom.enable();
      map.keyboard.enable();
    }
  }, [interactionDisabled, mapReady]);

  return (
    <>
      <style>{`
        .wynla-user-loc-marker {
          position: relative;
          width: 22px;
          height: 22px;
          pointer-events: none;
        }
        .wynla-user-loc-dot {
          position: absolute;
          inset: 0;
          margin: auto;
          width: 14px;
          height: 14px;
          border-radius: 9999px;
          background: #1A73E8;
          border: 2px solid #ffffff;
          box-shadow: 0 1px 4px rgba(15,21,48,0.35);
        }
        .wynla-user-loc-halo {
          position: absolute;
          inset: 0;
          margin: auto;
          width: 22px;
          height: 22px;
          border-radius: 9999px;
          background: rgba(26,115,232,0.25);
          animation: wynla-user-loc-pulse 2s ease-out infinite;
        }
        @keyframes wynla-user-loc-pulse {
          0%   { transform: scale(0.6); opacity: 0.85; }
          100% { transform: scale(2.4); opacity: 0; }
        }
      `}</style>
      {/* Stage 33 — pointer-events:none when interaction is disabled.
          Nuclear belt-and-suspenders alongside the Mapbox handler disable
          above: kills every touch/click/wheel at the DOM level so no
          event ever reaches Mapbox's listeners. Pin clicks etc are
          unaffected when interactionDisabled=false (the default). */}
      <div
        ref={mapContainer}
        className="h-full w-full"
        style={
          interactionDisabled
            ? { pointerEvents: "none", touchAction: "none" }
            : undefined
        }
      />
    </>
  );
}
