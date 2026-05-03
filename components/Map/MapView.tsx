"use client";

import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { passColor, passLabel } from "@/lib/passColors";

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

type Props = {
  resorts: Resort[];
};

export default function MapView({ resorts }: Props) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);

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

    resorts.forEach((resort) => {
      const lng = Number(resort.longitude);
      const lat = Number(resort.latitude);
      if (!Number.isFinite(lng) || !Number.isFinite(lat)) return;

      const popupHtml = `
        <div style="font-family: system-ui, -apple-system, sans-serif; padding: 4px 2px;">
          <div style="font-weight: 700; font-size: 14px; color: #1E2952; margin-bottom: 4px;">
            ${resort.name}
          </div>
          <div style="font-size: 12px; color: #6B7280;">
            ${resort.state}${resort.region ? " · " + resort.region : ""}
          </div>
          <div style="font-size: 12px; color: ${passColor(resort.pass)}; font-weight: 500; margin-top: 4px;">
            ${passLabel(resort.pass)}
          </div>
        </div>
      `;

      new mapboxgl.Marker({ color: passColor(resort.pass) })
        .setLngLat([lng, lat])
        .setPopup(new mapboxgl.Popup({ offset: 25, closeButton: false }).setHTML(popupHtml))
        .addTo(map);
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [resorts]);

  return <div ref={mapContainer} className="h-full w-full" />;
}
