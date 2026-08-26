"use client";

import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

export type MapPin = {
  id: string;
  lat: number;
  lng: number;
  label: string;
};

function pinIcon(color: string) {
  return L.divIcon({
    className: "",
    html: `<div style="width:14px;height:14px;border-radius:50%;background:${color};border:2px solid white;box-shadow:0 0 2px rgba(0,0,0,0.5);"></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });
}

export default function MapViewInner({
  center,
  pins,
}: {
  center: { lat: number; lng: number };
  pins: MapPin[];
}) {
  return (
    <MapContainer
      center={[center.lat, center.lng]}
      zoom={11}
      style={{ height: "320px", width: "100%", borderRadius: "0.5rem" }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Marker position={[center.lat, center.lng]} icon={pinIcon("#2563eb")}>
        <Popup>Your location</Popup>
      </Marker>
      {pins.map((pin) => (
        <Marker key={pin.id} position={[pin.lat, pin.lng]} icon={pinIcon("#dc2626")}>
          <Popup>{pin.label}</Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
