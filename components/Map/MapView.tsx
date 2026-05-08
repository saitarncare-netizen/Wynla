"use client";

import { useEffect, useRef } from "react";
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

type Props = {
  resorts: Resort[];
  originName: string;
  driveTimeByResort: Map<number, Map<string, DriveTime>>;
  selectedId: number | null;
  onResortClick: (id: number) => void;
};

const SOURCE_ID = "wynla-resorts";
const LAYER_CLUSTERS = "wynla-clusters";
const LAYER_CLUSTER_COUNT = "wynla-cluster-count";
const LAYER_LISTED = "wynla-listed-pins";
const LAYER_FEATURED = "wynla-featured-pins";

// Map a resort to its pin properties for the GeoJSON feature.
function resortToProperties(resort: Resort, dt: DriveTime | undefined) {
  const primary: Pass = primaryPass(resort.passes);
  const tier = sizeTier(resort.vertical_drop);
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
    radius: sizeTierRadius(tier),
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
}: Props) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);

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

    const map = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/light-v11",
      // Force Mercator. Mapbox 3.x defaults to globe at low zoom, which
      // clips circle layers and shows the earth as a sphere.
      projection: "mercator",
      center: [-95, 40],
      zoom: 3.6,
      // 22 px halo around clicks/taps → effective 44×44 px touch target,
      // even when the visible circle is only 12 px (small size tier).
      clickTolerance: 22,
      // Disable rotate/pitch — flat US map UX, prevents accidental gestures
      pitchWithRotate: false,
      dragRotate: false,
    });
    map.touchZoomRotate.disableRotation();

    mapRef.current = map;
    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "top-right");

    // Setup runs once the basemap style is ready. In Mapbox 3.x the "load"
    // event can be unreliable under React strict-mode double-mount; "style.load"
    // fires earlier and consistently. We also run setup immediately if the
    // style was somehow already loaded by the time this effect mounts.
    const setup = () => {
      // Empty source — features added in the data effect below
      map.addSource(SOURCE_ID, {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
        cluster: true,
        clusterMaxZoom: 7,
        clusterRadius: 50,
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
      // Selected pin gets a wider navy stroke for visual feedback while panel is open.
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
          "circle-radius": ["get", "radius"],
          "circle-opacity": 0.85,
          "circle-stroke-width": [
            "case",
            ["boolean", ["feature-state", "selected"], false],
            3,
            1.5,
          ],
          "circle-stroke-color": [
            "case",
            ["boolean", ["feature-state", "selected"], false],
            "#1E2952",
            "#FFFFFF",
          ],
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
          "circle-radius": ["get", "radius"],
          "circle-stroke-width": [
            "case",
            ["boolean", ["feature-state", "selected"], false],
            4,
            2,
          ],
          "circle-stroke-color": [
            "case",
            ["boolean", ["feature-state", "selected"], false],
            "#1E2952",
            "#FFFFFF",
          ],
        },
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
      pinLayers.forEach((layerId) => {
        map.on("click", layerId, (e) => {
          const f = e.features?.[0];
          const id = f?.properties?.id;
          if (typeof id === "number") onResortClickRef.current(id);
        });
        map.on("mouseenter", layerId, () => {
          map.getCanvas().style.cursor = "pointer";
        });
        map.on("mouseleave", layerId, () => {
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

    // Source is added by the init effect's setup() — which runs on style.load
    // (or immediately if already loaded). If the source isn't ready yet,
    // re-attempt on style.load.
    if (map.getSource(SOURCE_ID)) apply();
    else map.once("style.load", apply);
  }, [resorts, originName, driveTimeByResort]);

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
    else map.once("style.load", apply);
  }, [selectedId, resorts]);

  return <div ref={mapContainer} className="h-full w-full" />;
}
