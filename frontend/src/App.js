// App.js
import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import './assets/css/App.css';
import * as XLSX from 'xlsx';
import FilterSidebar from './components/FilterSidebar';
import MapView from './components/MapView';
import TableView from './components/TableView';
import ImportView from './components/ImportView';
import GraphView from './components/GraphView';
import { exportToExcel } from "./utils/exportData";

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

function App() {
  // States for filter inputs (pending changes)
  const [disasterTypes, setDisasterTypes] = useState([]);
  const [adminLevel, setAdminLevel] = useState('');
  const [spatialRef, setSpatialRef] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState('');
  const [filterType1, setFilterType1] = useState('');
  const [filterType2, setFilterType2] = useState('');
  const [eventStartDate, setEventStartDate] = useState('');
  const [eventEndDate, setEventEndDate] = useState('');

  // State for data returned from the backend
  const [filteredPoints, setFilteredPoints] = useState([]);
  const [selectedLocationGeoJson, setSelectedLocationGeoJson] = useState(null);

  // States for selected point and comparison results
  const [selectedPoint, setSelectedPoint] = useState(null);
  const [compareResults, setCompareResults] = useState(null);

  // State for relationships loaded from the Excel file
  const [relationships, setRelationships] = useState([]);

  // State for distance range (used in table view, etc.)
  const [distanceRange, setDistanceRange] = useState(10000);

  // This state will store the filters the user has applied by clicking Search.
  // Using these for API calls prevents unnecessary runs when the user is simply typing.
  const [appliedFilters, setAppliedFilters] = useState({
    filterType1: '',
    filterType2: '',
    eventStartDate: '',
    eventEndDate: '',
    selectedLocation: ''
  });

  // Current view: map, table, import, or graph
  const [view, setView] = useState('map');

  useEffect(() => {
    document.title = `Disaster Events Library - ${view.charAt(0).toUpperCase() + view.slice(1)}`;
  }, [view]);
  
  // Fetch disaster types on component mount
  useEffect(() => {
    axios
      .get(`${API_BASE_URL}/api/disasterTypes`)
      .then((response) => setDisasterTypes(response.data))
      .catch((error) => console.error('Error fetching disaster types:', error));
  }, []);

  // Fetch spatialRef when the admin level changes
  useEffect(() => {
    if (adminLevel) {
      axios
        .get(`${API_BASE_URL}/api/spatialRef/${adminLevel}`)
        .then((response) => setSpatialRef(response.data))
        .catch((error) => console.error('Error fetching spatialRef:', error));
    } else {
      setSpatialRef([]); // Reset spatialRef if adminLevel is cleared
    }
  }, [adminLevel]);

  // Fetch relationships from the Excel file on mount
  useEffect(() => {
    const fetchRelationships = async () => {
      try {
        const response = await fetch(`${process.env.PUBLIC_URL}/assets/Hazard_cascades_PROC_v2.xlsx`);
        if (!response.ok) throw new Error('Failed to fetch the Excel file.');
        const arrayBuffer = await response.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const sheetData = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
        setRelationships(sheetData);
      } catch (error) {
        console.error('Error reading the relationships file:', error);
      }
    };

    fetchRelationships();
  }, []);

  // Fetch filtered points and selected location's polygon when the Search button is clicked.
  // Also update the appliedFilters state so that subsequent operations use these values.
  const fetchFilteredPoints = useCallback(() => {

    // Clear any previously selected point and comparison results
    setSelectedPoint(null);
    setCompareResults(null);

    axios
      .get(`${API_BASE_URL}/api/disasterEvents/filtered`, {
        params: {
          disasterType1: filterType1,
          disasterType2: filterType2,
          eventStartDate,
          eventEndDate,
          selectedLocation
        }
      })
      .then((response) => {
        setFilteredPoints(response.data);
        // Save the filters that were used at the time of search
        setAppliedFilters({
          filterType1,
          filterType2,
          eventStartDate,
          eventEndDate,
          selectedLocation
        });
      })
      .catch((error) => console.error('Error fetching filtered points:', error));

    // Fetch the selected location's polygon if a location is selected
    if (selectedLocation) {
      axios
        .get(`${API_BASE_URL}/api/spatialRef/locationPolygon/${selectedLocation}`)
        .then((response) => {
          setSelectedLocationGeoJson(response.data.geojson);
        })
        .catch((error) => console.error('Error fetching location geojson:', error));
    } else {
      setSelectedLocationGeoJson(null);
    }
  }, [filterType1, filterType2, eventStartDate, eventEndDate, selectedLocation]);

  // Handle selecting a point on the map or table
  const handlePointSelect = (point) => {
    setSelectedPoint(point);
    setCompareResults(null);
  };

  // Perform comparison calculations.
  const handleCompare = useCallback(async (point) => {
    const targetPoint = point || selectedPoint;
    if (!targetPoint) return;

    try {
      setCompareResults([]); // Clear previous results
      const response = await axios.get(`${API_BASE_URL}/api/disasterEvents/compared`, {
        params: {
          disasterType1: appliedFilters.filterType1,
          disasterType2: appliedFilters.filterType2,
          eventStartDate: appliedFilters.eventStartDate,
          eventEndDate: appliedFilters.eventEndDate,
          selectedLocation: appliedFilters.selectedLocation,
          selectedPointId: targetPoint.id
        }
      });

      setCompareResults(response.data);
    } catch (error) {
      console.error('Error performing comparison:', error);
      alert('Failed to perform comparison. Please try again.');
    }
  }, [selectedPoint, appliedFilters]);

  // Trigger a comparison only when the selected point changes (or when appliedFilters update)
  useEffect(() => {
    if (selectedPoint) {
      handleCompare(selectedPoint);
    }
    // We intentionally do not include filter states here to avoid extra calls.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPoint, appliedFilters]);


  // Render the current view based on the selected tab
  const renderView = () => {
    switch (view) {
      case 'map':
        return (
          <MapView
            filteredPoints={filteredPoints}
            selectedLocationGeoJson={selectedLocationGeoJson}
            onPointSelect={handlePointSelect}
            selectedPoint={selectedPoint}
          />
        );
      case 'table':
        return (
          <TableView
            filteredPoints={filteredPoints}
            selectedPoint={selectedPoint}
            compareResults={compareResults}
            distanceRange={distanceRange}
            onPointSelect={handlePointSelect}
          />
        );
      case 'import':
        return <ImportView />;
      case 'graph':
        return (
          <GraphView
            selectedPoint={selectedPoint}
            setSelectedPoint={setSelectedPoint}
            compareResults={compareResults}
            setCompareResults={setCompareResults}
            relationships={relationships}
            distanceRange={distanceRange}
            setView={setView}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="app-container">
      {/* Header */}
      <header className="header">
        {`Disaster Events Library - ${view.charAt(0).toUpperCase() + view.slice(1)}`}
      </header>

      <div className="main-section">
        {/* Sidebar for filtering */}
        <FilterSidebar
          disasterTypes={disasterTypes}
          adminLevel={adminLevel}
          spatialRef={spatialRef}
          setAdminLevel={setAdminLevel}
          setSelectedLocation={setSelectedLocation}
          setFilterType1={setFilterType1}
          setFilterType2={setFilterType2}
          eventStartDate={eventStartDate}
          setEventStartDate={setEventStartDate}
          eventEndDate={eventEndDate}
          setEventEndDate={setEventEndDate}
          onSearch={fetchFilteredPoints}
          distanceRange={distanceRange}
          setDistanceRange={setDistanceRange}
        />

        {/* Main content area */}
        <div className="main-content">
          <div className="view-selector">
            <button
              onClick={() => setView('map')}
              className={view === 'map' ? 'active-button' : 'button'}
            >
              Map
            </button>
            <button
              onClick={() => setView('table')}
              className={view === 'table' ? 'active-button' : 'button table-button'}
              disabled={filteredPoints.length === 0}
            >
              Table
            </button>
            <button
              onClick={() => setView('graph')}
              className={view === 'graph' ? 'active-button' : 'button graph-button'}
              disabled={!selectedPoint}
            >
              Graph
            </button>
            <button
              onClick={() => setView('import')}
              className={view === 'import' ? 'active-button' : 'button'}
            >
              Import
            </button>
            <button
              onClick={() => exportToExcel(filteredPoints, selectedPoint, compareResults, distanceRange)}
              className="button export-button"
              disabled={filteredPoints.length === 0 && (!compareResults || compareResults.length === 0)}
            >
              Export
            </button>
          </div>

          <div className="view-container">{renderView()}</div>
        </div>
      </div>
    </div>
  );
}

export default App;
