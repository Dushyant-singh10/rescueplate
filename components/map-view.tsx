"use client";

import dynamic from "next/dynamic";
import type { MapPin } from "./map-view-inner";

export type { MapPin };

// Leaflet touches `window` at import time, so it can't be server-rendered.
const MapViewInner = dynamic(() => import("./map-view-inner"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[320px] w-full items-center justify-center rounded-lg border text-sm text-muted-foreground">
      Loading map...
    </div>
  ),
});

export function MapView(props: { center: { lat: number; lng: number }; pins: MapPin[] }) {
  return <MapViewInner {...props} />;
}
