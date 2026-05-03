"use client";

import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { passColor, passLabel } from "@/lib/passColors";
import { formatDriveTime } from "@/lib/origins";

type Resort = {
  id: number;
  slug: string;
  name: string;
  state: string;
  region: string | null;
  latitude: number | string;
  longitude: number | string;
  pass: string;
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

      const dt = driveTimeByResort.get(resort.id)?.get(originName);
      const driveTimeText = dt ? formatDriveTime(dt.duration_seconds) : null;

      const popupHtml = `
        <div style="font-family: system-ui, -apple-system, sans-serif; padding: 4px 2px; min-width: 180px;">
          <div style="font-weight: 700; font-size: 14px; color: #1E2952; margin-bottom: 4px;">
            ${resort.name}
          </div>
          <div style="font-size: 12px; color: #6B7280; margin-bottom: 4px;">
            ${resort.state}${resort.region ? " · " + resort.region : ""}
          </div>
          ${
            driveTimeText
              ? `<div style="font-size: 12px; color: #2A2A2A; margin-bottom: 4px;">🚗 ${driveTimeText} from ${originName}</div>`
              : ""
          }
          <div style="font-size: 12px; color: ${passColor(resort.pass)}; font-weight: 500;">
            ${passLabel(resort.pass)}
          </div>
        </div>
      `;

      const marker = new mapboxgl.Marker({ color: passColor(resort.pass) })
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
