"use client";

import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import { passColor, primaryPass } from "@/lib/passColors";
import { sizeTier, sizeTierRadius } from "@/lib/sizeTier";

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

type Props = {
  resorts: Resort[];
};

const SOURCE_ID = "wynla-alaska";

// Bounds covering the populated parts of Alaska where ski areas exist
// (Anchorage region, Fairbanks, Juneau, Eaglecrest). Skips the Aleutians.
const ALASKA_BOUNDS: mapboxgl.LngLatBoundsLike = [
  [-168, 53],
  [-130, 71],
];

export default function AlaskaInset({ resorts }: Props) {
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);

  const akResorts = resorts.filter((r) => r.state === "AK");

  useEffect(() => {
    if (!container.current || mapRef.current) return;
    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    if (!token) return;
    mapboxgl.accessToken = token;

    const map = new mapboxgl.Map({
      container: container.current,
      style: "mapbox://styles/mapbox/outdoors-v12",
      bounds: ALASKA_BOUNDS,
      interactive: false,
      attributionControl: false,
    });
    mapRef.current = map;

    const setup = () => {
      map.addSource(SOURCE_ID, {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });
      map.addLayer({
        id: "ak-pins",
        type: "circle",
        source: SOURCE_ID,
        paint: {
          "circle-color": ["get", "color"],
          "circle-radius": ["get", "radius"],
          "circle-stroke-width": 1.5,
          "circle-stroke-color": "#FFFFFF",
          "circle-opacity": 0.9,
        },
      });
    };
    if (map.isStyleLoaded()) setup();
    else map.on("style.load", setup);

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Refresh pin data when filtered resorts change
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const apply = () => {
      const src = map.getSource(SOURCE_ID) as mapboxgl.GeoJSONSource | undefined;
      if (!src) return;
      const features = akResorts
        .map((r) => {
          const lng = Number(r.longitude);
          const lat = Number(r.latitude);
          if (!Number.isFinite(lng) || !Number.isFinite(lat)) return null;
          const tier = sizeTier(r.vertical_drop);
          return {
            type: "Feature" as const,
            geometry: { type: "Point" as const, coordinates: [lng, lat] },
            properties: {
              color: passColor(primaryPass(r.passes)),
              radius: sizeTierRadius(tier),
            },
          };
        })
        .filter((f): f is NonNullable<typeof f> => f !== null);
      src.setData({ type: "FeatureCollection", features });
    };
    if (map.getSource(SOURCE_ID)) apply();
    else map.once("style.load", apply);
  }, [akResorts]);

  // If no Alaska resorts pass the current filter, hide the inset entirely
  if (akResorts.length === 0) return null;

  return (
    <div
      className="pointer-events-auto absolute bottom-3 left-3 z-10 overflow-hidden rounded-md border border-wn-charcoal/20 bg-white/95 shadow-md backdrop-blur-sm sm:bottom-4 sm:left-4"
      style={{
        width: "var(--ak-w, 200px)",
        height: "var(--ak-h, 150px)",
      }}
    >
      <style>{`
        @media (max-width: 640px) {
          [data-ak-inset] { --ak-w: 120px !important; --ak-h: 90px !important; }
        }
      `}</style>
      <div data-ak-inset className="relative h-full w-full">
        <div ref={container} className="h-full w-full" />
        <div className="pointer-events-none absolute left-1.5 top-1 text-[9px] font-bold tracking-wider text-wn-navy/80">
          ALASKA · {akResorts.length}
        </div>
      </div>
    </div>
  );
}
