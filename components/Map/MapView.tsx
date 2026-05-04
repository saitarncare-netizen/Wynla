"use client";

import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { passColor, passBadgeHtml } from "@/lib/passColors";
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

// First pass in the array is treated as the "primary" pass for pin color.
// Convention: store passes in priority order (most-recognizable first).
function primaryPass(passes: string[] | null | undefined): string {
  return passes?.[0] ?? "independent";
}

export default function MapView({
  resorts,
  originName,
  driveTimeByResort,
}: Props) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);

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
      style: "mapbox://styles/mapbox/outdoors-v12",
      center: [-73.5, 42.5],
      zoom: 6.2,
    });
    mapRef.current = map;
    map.addControl(new mapboxgl.NavigationControl(), "top-right");

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Update markers whenever the filtered resorts list changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    resorts.forEach((resort) => {
      const lng = Number(resort.longitude);
      const lat = Number(resort.latitude);
      if (!Number.isFinite(lng) || !Number.isFinite(lat)) return;

      const passes = resort.passes ?? [];
      const dt = driveTimeByResort.get(resort.id)?.get(originName);
      const driveTimeText = dt ? formatDriveTime(dt.duration_seconds) : null;

      const passBadges = passes.map((p) => passBadgeHtml(p)).join(" ");

      const popupHtml = `
        <div style="font-family: system-ui, -apple-system, sans-serif; padding: 4px 2px; min-width: 200px;">
          <div style="font-weight: 700; font-size: 14px; color: #1E2952; margin-bottom: 4px;">
            ${resort.name}
          </div>
          <div style="font-size: 12px; color: #6B7280; margin-bottom: 8px;">
            ${resort.state}${resort.region ? " · " + resort.region : ""}
          </div>
          ${
            driveTimeText
              ? `<div style="font-size: 12px; color: #2A2A2A; margin-bottom: 8px;">🚗 ${driveTimeText} from ${originName}</div>`
              : ""
          }
          <div style="display: flex; flex-wrap: wrap; gap: 4px;">
            ${passBadges}
          </div>
        </div>
      `;

      const marker = new mapboxgl.Marker({ color: passColor(primaryPass(passes)) })
        .setLngLat([lng, lat])
        .setPopup(
          new mapboxgl.Popup({ offset: 25, closeButton: false }).setHTML(
            popupHtml,
          ),
        )
        .addTo(map);
      markersRef.current.push(marker);
    });
  }, [resorts, originName, driveTimeByResort]);

  return <div ref={mapContainer} className="h-full w-full" />;
}
