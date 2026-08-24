/**
 * Mini-map of the current result set.
 *
 * Leaflet against the standard public OpenStreetMap tile server — no API key,
 * no account, no tile-provider SDK. This is the only component in the app that
 * makes a network request at all, and it's the one the spec explicitly allows.
 *
 * `CircleMarker` rather than the default pin on purpose: Leaflet's default
 * marker resolves its icon from image URLs that bundlers famously mangle, and a
 * vector dot both avoids that entirely and stays legible when 200 of them
 * overlap in Dublin.
 *
 * This module is the lazy-loaded half of `MapPanel`, so Leaflet and its CSS land
 * in a separate chunk instead of the initial bundle.
 */

import "leaflet/dist/leaflet.css";

import type { LatLngBoundsExpression } from "leaflet";
import { useEffect, useMemo } from "react";
import {
  CircleMarker,
  MapContainer,
  TileLayer,
  Tooltip,
  useMap,
} from "react-leaflet";
import { formatEuro } from "@/lib/field-meta";
import type { DemoListing } from "@/lib/types";

/** Plotting every one of 300 listings is pointless at map scale and costs a lot
 *  of SVG nodes; the visible sample is representative of the result set. */
const MAX_MARKERS = 200;

/** Roughly the island of Ireland — the fallback view when nothing matches. */
const IRELAND: LatLngBoundsExpression = [
  [51.4, -10.6],
  [55.4, -5.4],
];

function FitToResults({ listings }: { listings: DemoListing[] }) {
  const map = useMap();

  useEffect(() => {
    if (listings.length === 0) {
      map.fitBounds(IRELAND, { padding: [12, 12] });
      return;
    }
    const bounds = listings.map(
      (listing) => [listing.lat, listing.lng] as [number, number],
    );
    map.fitBounds(bounds, { padding: [28, 28], maxZoom: 12 });
  }, [listings, map]);

  return null;
}

export default function ResultsMap({ listings }: { listings: DemoListing[] }) {
  const plotted = useMemo(() => listings.slice(0, MAX_MARKERS), [listings]);

  return (
    <MapContainer
      bounds={IRELAND}
      scrollWheelZoom={false}
      className="h-full w-full"
      attributionControl
    >
      <TileLayer
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution="© OpenStreetMap contributors"
        maxZoom={18}
      />
      <FitToResults listings={plotted} />
      {plotted.map((listing) => (
        <CircleMarker
          key={listing.id}
          center={[listing.lat, listing.lng]}
          radius={6}
          pathOptions={{
            color: "#0d1c23",
            weight: 1.5,
            fillColor: "#edb01f",
            fillOpacity: 0.85,
          }}
        >
          <Tooltip direction="top" offset={[0, -6]} opacity={1}>
            <span className="font-semibold">
              {formatEuro(listing.price_eur)}
            </span>
            {" · "}
            {listing.beds} bed {listing.property_type.toLowerCase()}
            <br />
            {listing.town}, Co. {listing.county}
          </Tooltip>
        </CircleMarker>
      ))}
    </MapContainer>
  );
}
