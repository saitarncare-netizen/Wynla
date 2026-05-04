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
  tier: "featured" | "listed";
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

const STAR_SVG_WHITE =
  '<svg width="11" height="11" viewBox="0 0 24 24" fill="white" aria-hidden="true"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>';

// Build a DOM element used as a Mapbox custom marker. Featured tier gets a
// larger, opaque circle with a white star; Listed tier gets a smaller,
// semi-transparent dot. Both have hover transitions.
function createMarkerElement(color: string, isFeatured: boolean): HTMLDivElement {
  const el = document.createElement("div");
  el.className = isFeatured ? "wynla-pin wynla-pin--featured" : "wynla-pin wynla-pin--listed";
  el.style.cursor = "pointer";
  el.style.transition = "transform 200ms ease, opacity 200ms ease, box-shadow 200ms ease";
  el.style.willChange = "transform";

  if (isFeatured) {
    el.style.width = "30px";
    el.style.height = "30px";
    el.style.background = color;
    el.style.border = "2px solid #FFFFFF";
    el.style.borderRadius = "50%";
    el.style.boxShadow = "0 2px 6px rgba(0,0,0,0.28)";
    el.style.display = "flex";
    el.style.alignItems = "center";
    el.style.justifyContent = "center";
    el.innerHTML = STAR_SVG_WHITE;
  } else {
    el.style.width = "13px";
    el.style.height = "13px";
    el.style.background = color;
    el.style.border = "1.5px solid rgba(255,255,255,0.95)";
    el.style.borderRadius = "50%";
    el.style.opacity = "0.7";
    el.style.boxShadow = "0 1px 2px rgba(0,0,0,0.15)";
  }

  el.addEventListener("mouseenter", () => {
    if (isFeatured) {
      el.style.transform = "scale(1.18)";
      el.style.boxShadow = "0 4px 10px rgba(0,0,0,0.35)";
    } else {
      el.style.transform = "scale(1.5)";
      el.style.opacity = "1";
    }
  });
  el.addEventListener("mouseleave", () => {
    el.style.transform = "scale(1)";
    if (isFeatured) {
      el.style.boxShadow = "0 2px 6px rgba(0,0,0,0.28)";
    } else {
      el.style.opacity = "0.7";
    }
  });

  return el;
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
      // Centered to roughly cover the contiguous US Northeast + Midwest;
      // user can pan/zoom out to reach the West and Alaska.
      center: [-95, 40],
      zoom: 3.6,
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
      const isFeatured = resort.tier === "featured";
      const color = passColor(primaryPass(passes));
      const dt = driveTimeByResort.get(resort.id)?.get(originName);
      const driveTimeText = dt ? formatDriveTime(dt.duration_seconds) : null;

      const passBadges = passes.map((p) => passBadgeHtml(p)).join(" ");

      const popupHtml = `
        <div style="font-family: system-ui, -apple-system, sans-serif; padding: 4px 2px; min-width: 200px;">
          <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 4px;">
            ${
              isFeatured
                ? '<span style="display:inline-flex;align-items:center;font-size:10px;font-weight:700;color:#1E2952;background:#F5C443;padding:2px 6px;border-radius:4px;letter-spacing:0.04em;">★ FEATURED</span>'
                : ""
            }
          </div>
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

      const el = createMarkerElement(color, isFeatured);
      const marker = new mapboxgl.Marker({ element: el })
        .setLngLat([lng, lat])
        .setPopup(
          new mapboxgl.Popup({ offset: isFeatured ? 22 : 14, closeButton: false }).setHTML(popupHtml),
        )
        .addTo(map);
      markersRef.current.push(marker);
    });
  }, [resorts, originName, driveTimeByResort]);

  return <div ref={mapContainer} className="h-full w-full" />;
}
