"use client";

import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { passColor, passBadgeHtml, primaryPass, type Pass } from "@/lib/passColors";
import { sizeTier, sizeTierRadius } from "@/lib/sizeTier";
import { formatDriveTime } from "@/lib/origins";

type Resort = {
  id: number;
  slug: string;
  name: string;
  state: string;
  region: string | null;
  latitude: number | string;
  longitude: number | string;
  passes: string[];
  tier: "featured" | "listed";
  vertical_drop: number | null;
};

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
};

const SOURCE_ID = "wynla-resorts";
const LAYER_CLUSTERS = "wynla-clusters";
const LAYER_CLUSTER_COUNT = "wynla-cluster-count";
const LAYER_LISTED = "wynla-listed-pins";
const LAYER_FEATURED = "wynla-featured-pins";
const LAYER_FEATURED_STAR = "wynla-featured-star";

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

function buildPopupHtml(props: {
  name: string;
  state: string;
  region: string;
  passes: string;
  tier: string;
  vertical_drop: number;
  drive_seconds: number;
  slug: string;
}, originName: string): string {
  const passes: string[] = JSON.parse(props.passes || "[]");
  const isFeatured = props.tier === "featured";
  const passBadges = passes.map((p) => passBadgeHtml(p)).join(" ");
  const driveTimeText =
    props.drive_seconds > 0 ? formatDriveTime(props.drive_seconds) : null;
  const vertText =
    props.vertical_drop > 0 ? `${props.vertical_drop.toLocaleString()} ft vert` : "—";

  return `
    <div style="font-family: system-ui, -apple-system, sans-serif; padding: 4px 2px; min-width: 200px;">
      ${
        isFeatured
          ? '<div style="margin-bottom: 4px;"><span style="display:inline-flex;align-items:center;font-size:10px;font-weight:700;color:#1E2952;background:#F5C443;padding:2px 6px;border-radius:4px;letter-spacing:0.04em;">★ FEATURED</span></div>'
          : ""
      }
      <div style="font-weight: 700; font-size: 14px; color: #1E2952; margin-bottom: 4px;">
        ${props.name}
      </div>
      <div style="font-size: 12px; color: #6B7280; margin-bottom: 6px;">
        ${props.state}${props.region ? " · " + props.region : ""} · ${vertText}
      </div>
      ${
        driveTimeText
          ? `<div style="font-size: 12px; color: #2A2A2A; margin-bottom: 8px;">🚗 ${driveTimeText} from ${originName}</div>`
          : ""
      }
      <div style="display: flex; flex-wrap: wrap; gap: 4px; margin-bottom: 10px;">
        ${passBadges}
      </div>
      <a href="/resort/${props.slug}"
         style="display:inline-flex;align-items:center;gap:4px;font-size:12px;font-weight:600;color:#1E2952;text-decoration:none;border-bottom:1px solid #1E2952;padding-bottom:1px;">
        View details →
      </a>
    </div>
  `;
}

export default function MapView({
  resorts,
  originName,
  driveTimeByResort,
}: Props) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const popupRef = useRef<mapboxgl.Popup | null>(null);

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

      // Listed-tier pins: size by vertical_drop (12/16/20 px), color by primary pass
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
          "circle-stroke-width": 1.5,
          "circle-stroke-color": "#FFFFFF",
        },
      });

      // Featured-tier pins: always 30 px (radius 15), full opacity, white border
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
          "circle-radius": 15,
          "circle-stroke-width": 2,
          "circle-stroke-color": "#FFFFFF",
        },
      });

      // White star ★ on top of featured pins
      map.addLayer({
        id: LAYER_FEATURED_STAR,
        type: "symbol",
        source: SOURCE_ID,
        filter: [
          "all",
          ["!", ["has", "point_count"]],
          ["==", ["get", "tier"], "featured"],
        ],
        layout: {
          "text-field": "★",
          "text-size": 16,
          "text-allow-overlap": true,
          "text-anchor": "center",
        },
        paint: {
          "text-color": "#FFFFFF",
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

      // Pin click → popup
      const pinLayers = [LAYER_LISTED, LAYER_FEATURED, LAYER_FEATURED_STAR];
      pinLayers.forEach((layerId) => {
        map.on("click", layerId, (e) => {
          const f = e.features?.[0];
          if (!f || !f.properties || f.geometry.type !== "Point") return;
          popupRef.current?.remove();
          popupRef.current = new mapboxgl.Popup({ offset: 16, closeButton: false })
            .setLngLat(f.geometry.coordinates as [number, number])
            .setHTML(buildPopupHtml(f.properties as Parameters<typeof buildPopupHtml>[0], originName))
            .addTo(map);
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
      popupRef.current?.remove();
      popupRef.current = null;
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  return <div ref={mapContainer} className="h-full w-full" />;
}
