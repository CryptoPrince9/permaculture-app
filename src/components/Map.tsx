import { useState, useRef, useEffect, memo } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, LayersControl, FeatureGroup, useMap, Polygon } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet-draw/dist/leaflet.draw.css";
import L from 'leaflet';
import { LatLngExpression } from "leaflet";
import { EditControl } from "react-leaflet-draw";

// @ts-ignore
delete L.Icon.Default.prototype._getIconUrl;

L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const customIcon = new L.Icon({
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

interface MapProps {
  onLocationSelect: (
    location: { lat: number; lng: number },
    areaInfo?: { area: number; dimensions: string } | null,
    boundaryCoords?: Array<{ lat: number; lng: number }> | null
  ) => void;
  location: { lat: number; lng: number } | null;
  boundaryCoords?: Array<{ lat: number; lng: number }> | null;
}

function ChangeView({ center }: { center: LatLngExpression | null }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.setView(center, 13);
    }
  }, [center, map]);
  return null;
}

// Safely flatten nested Leaflet LatLng structures
const flattenLatLngs = (arr: any): L.LatLng[] => {
  if (!arr) return [];
  if (Array.isArray(arr)) {
    if (arr.length === 0) return [];
    if (arr[0] instanceof L.LatLng || (typeof arr[0] === 'object' && arr[0] !== null && 'lat' in arr[0])) {
      return arr as L.LatLng[];
    }
    // recurse
    return flattenLatLngs(arr[0]);
  }
  return [];
};

function MapComponent({ onLocationSelect, location, boundaryCoords }: MapProps) {
  // Default to a central location (e.g., London)
  const defaultCenter: LatLngExpression = [51.505, -0.09];

  const _onCreated = (e: any) => {
    try {
      const { layerType, layer } = e;
      console.log("Layer created of type:", layerType);
      
      let latlng;
      let area = 0;
      let dimensions = "Single point";
      
      let boundary: Array<{ lat: number, lng: number }> | null = null;
      if (layer && typeof layer.getLatLng === 'function') {
        latlng = layer.getLatLng();
        if (layerType === 'circle') {
          const radius = layer.getRadius();
          area = Math.PI * radius * radius;
          dimensions = `Radius: ${radius.toFixed(1)}m (Dia: ${(radius * 2).toFixed(1)}m)`;
          
          // Approximate circle as a 12-sided polygon for boundary coordinates
          const circlePoints = [];
          for (let i = 0; i < 12; i++) {
            const angle = (i * 30 * Math.PI) / 180;
            const dLat = (radius * Math.sin(angle)) / 111320;
            const dLng = (radius * Math.cos(angle)) / (111320 * Math.cos((latlng.lat * Math.PI) / 180));
            circlePoints.push({ lat: latlng.lat + dLat, lng: latlng.lng + dLng });
          }
          boundary = circlePoints;
        } else if (layerType === 'circlemarker') {
          dimensions = "Point marker";
        } else {
          dimensions = "Pin Drop";
        }
      } else if (layer && typeof layer.getBounds === 'function') {
        const bounds = layer.getBounds();
        latlng = bounds.getCenter();
        
        const northEast = bounds.getNorthEast();
        const southWest = bounds.getSouthWest();
        const northWest = L.latLng(northEast.lat, southWest.lng);
        
        const width = northWest.distanceTo(northEast);
        const height = northWest.distanceTo(southWest);
        dimensions = `${width.toFixed(1)}m x ${height.toFixed(1)}m`;
        
        if (layerType === 'rectangle') {
          area = width * height;
          const rawLatLngs = layer.getLatLngs ? layer.getLatLngs() : null;
          const flatLatLngs = flattenLatLngs(rawLatLngs);
          if (flatLatLngs.length > 0) {
            boundary = flatLatLngs.map(p => ({ lat: p.lat, lng: p.lng }));
          }
        } else if (layerType === 'polygon') {
          const rawLatLngs = layer.getLatLngs ? layer.getLatLngs() : null;
          const flatLatLngs = flattenLatLngs(rawLatLngs);
          
          if (flatLatLngs.length >= 3) {
            let calcArea = 0;
            const radius = 6378137;
            const len = flatLatLngs.length;
            for (let i = 0; i < len; i++) {
              const p1 = flatLatLngs[i];
              const p2 = flatLatLngs[(i + 1) % len];
              if (p1 && p2 && typeof p1.lat === 'number' && typeof p1.lng === 'number' && typeof p2.lat === 'number' && typeof p2.lng === 'number') {
                const radLat1 = (p1.lat * Math.PI) / 180;
                const radLat2 = (p2.lat * Math.PI) / 180;
                const radLng1 = (p1.lng * Math.PI) / 180;
                const radLng2 = (p2.lng * Math.PI) / 180;
                calcArea += (radLng2 - radLng1) * (2 + Math.sin(radLat1) + Math.sin(radLat2));
              }
            }
            area = Math.abs((calcArea * radius * radius) / 2);
            boundary = flatLatLngs.map(p => ({ lat: p.lat, lng: p.lng }));
          } else {
            area = width * height * 0.75;
          }
        } else if (layerType === 'polyline') {
          dimensions = `Length: ${width.toFixed(1)}m`;
        }
      }
      
      if (latlng) {
        console.log(`Calculated position for ${layerType}: lat=${latlng.lat}, lng=${latlng.lng}, area=${area}, dim=${dimensions}`);
        
        // Remove the drawn layer so React can render it based on the updated state
        if (layer && typeof layer.remove === 'function') {
          layer.remove();
        }
        
        onLocationSelect({ lat: latlng.lat, lng: latlng.lng }, area > 0 ? { area, dimensions } : null, boundary);
      }
    } catch (err) {
      console.error("Error handling Leaflet layer creation:", err);
    }
  };

  const centerToUse: LatLngExpression = location ? [location.lat, location.lng] : defaultCenter;

  return (
    <MapContainer center={centerToUse} zoom={13} scrollWheelZoom={true} style={{ height: "500px", width: "100%", borderRadius: "0.5rem" }}>
      <ChangeView center={location ? [location.lat, location.lng] : null} />
      <TileLayer
        attribution='Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
        url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
      />

      {location && location.lat != null && location.lng != null && (
        <Marker position={[location.lat, location.lng]} icon={customIcon}>
          <Popup>Selected Location: {location.lat.toFixed(4)}, {location.lng.toFixed(4)}</Popup>
        </Marker>
      )}

      {boundaryCoords && boundaryCoords.length >= 3 && (
        <Polygon
          positions={boundaryCoords.map(c => [c.lat, c.lng])}
          pathOptions={{ color: '#16a34a', fillColor: '#22c55e', fillOpacity: 0.2, weight: 3 }}
        />
      )}

      <FeatureGroup>
        <EditControl
          position="topright"
          onCreated={_onCreated}
          draw={{
            rectangle: true,
            polyline: true,
            circle: true,
            circlemarker: true,
            marker: true,
            polygon: true
          }}
        />
      </FeatureGroup>
    </MapContainer>
  );
}

// Wrap in React.memo to prevent unnecessary and risky Leaflet-draw remounts on parent state updates
export default memo(MapComponent);
