// MapView.js
import React from 'react';
import { MapContainer, TileLayer, Marker, GeoJSON, Tooltip, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Default marker icon (blue)
const DefaultIcon = L.icon({
  iconUrl: `${process.env.PUBLIC_URL}/assets/icons/marker-icon-blue.png`,
  shadowUrl: `${process.env.PUBLIC_URL}/assets/icons/marker-shadow.png`,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

// Selected marker icon (red)
const SelectedIcon = L.icon({
  iconUrl: `${process.env.PUBLIC_URL}/assets/icons/marker-icon-red.png`,
  shadowUrl: `${process.env.PUBLIC_URL}/assets/icons/marker-shadow.png`,
  iconSize: [31, 51],
  iconAnchor: [15, 51],
});

const MapView = ({ filteredPoints, selectedLocationGeoJson, onPointSelect, selectedPoint }) => {
  const greeceCenter = [39.0742, 21.8243]; // Center of the map on Greece
  const zoomLevel = 7;

  const parsedGeoJson = selectedLocationGeoJson
    ? JSON.parse(selectedLocationGeoJson)
    : null;

  // Custom component to handle map clicks (deselect)
  const MapClickHandler = () => {
    useMapEvents({
      click: () => {
        onPointSelect(null); // Deselect when clicking on the map
      },
    });
    return null;
  };

  return (
    <MapContainer center={greeceCenter} zoom={zoomLevel} className="map-container" style={{ height: '100%', width: '100%' }}>
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution="&copy; OpenStreetMap contributors"
      />

      {/* Handle map clicks */}
      <MapClickHandler />

      {/* Render the selected location's polygon or point */}
      {parsedGeoJson && selectedLocationGeoJson !== 'Select Location' && (
        <GeoJSON
          key={selectedLocationGeoJson} // Use a unique key to force re-rendering
          data={parsedGeoJson}
          style={() => ({
            color: 'blue',
            weight: 3,
            fillOpacity: 0.2,
          })}
        />
      )}

      {/* Render disaster event points */}
      {filteredPoints.map((point) => {
        const geojson = JSON.parse(point.geojson);
        const position = [geojson.coordinates[1], geojson.coordinates[0]]; // Lat/Lon

        const isSelected = selectedPoint && selectedPoint.id === point.id;

        return (
          <Marker
            key={point.id}
            position={position}
            icon={isSelected ? SelectedIcon : DefaultIcon}
            eventHandlers={{
              click: () => {
                onPointSelect(point); // Update selectedPoint in App.js
              },
            }}
          >
            <Tooltip
              direction="top"
              offset={[0, -35]}
              opacity={1}
              // Tooltip appears on hover
            >
              <div>
                <strong>Location:</strong> {point.elstatlektiko}
                <br />
                <strong>Disaster Type:</strong> {point.disaster_type}
                <br />
                <strong>Event Date:</strong> {point.eventdate}
                <br />
                <strong>Alert Start:</strong> {point.alertstartdate || 'N/A'}
                <br />
                <strong>Alert End:</strong> {point.alertenddate || 'N/A'}
              </div>
            </Tooltip>
          </Marker>
        );
      })}
    </MapContainer>
  );
};

export default MapView;
