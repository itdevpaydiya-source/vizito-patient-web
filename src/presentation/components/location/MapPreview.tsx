import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// A small map with one pin (OpenStreetMap tiles, no API key). Used to show exactly where to go.
const PIN = L.divIcon({
  className: '',
  html: '<div style="width:22px;height:22px;border-radius:50% 50% 50% 0;background:#B45F28;transform:rotate(-45deg);border:3px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.35)"></div>',
  iconSize: [22, 22], iconAnchor: [11, 22],
});

const MapPreview: React.FC<{ lat: number; lng: number; label?: string; height?: number; zoom?: number }> = ({ lat, lng, label, height = 180, zoom = 16 }) => {
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!box.current) return;
    const map = L.map(box.current, { zoomControl: true, scrollWheelZoom: false, dragging: !L.Browser.mobile, attributionControl: true }).setView([lat, lng], zoom);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; OpenStreetMap contributors' }).addTo(map);
    const m = L.marker([lat, lng], { icon: PIN, keyboard: false }).addTo(map);
    if (label) m.bindTooltip(label, { direction: 'top', offset: [0, -20] });
    return () => { map.remove(); };
  }, [lat, lng, label, zoom]);
  return <div ref={box} role="img" aria-label={`Map showing ${label || 'the location'}`} data-lat={lat} data-lng={lng} style={{ height }} className="w-full rounded-xl overflow-hidden border border-slate-200 z-0" />;
};

export default MapPreview;
