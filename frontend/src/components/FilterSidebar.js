import React from 'react';
import { hazardsObj, relationshipsObj } from '../utils/constants';

const FilterSidebar = ({
  disasterTypes,
  adminLevel,
  spatialRef,
  setAdminLevel,
  setSelectedLocation,
  setFilterType1,
  setFilterType2,
  eventStartDate,
  setEventStartDate,
  eventEndDate,
  setEventEndDate,
  onSearch, // Add a prop for the search action
  distanceRange,
  setDistanceRange, // New props for the distance slider
}) => {
  const handleLocationChange = (e) => {
    const selectedLocation = e.target.value;
    setSelectedLocation(selectedLocation);

    // Reset the geojson data if no location is selected
    if (!selectedLocation) {
      console.log('No location selected, clearing location');
    } else {
      console.log('Selected Location:', selectedLocation);
    }
  };

  return (
    <div className="sidebar">
      <h2>Filters</h2>

      {/* First Row - Disaster Type Filters */}
    <div className="filter-row">
      <div className="filter-group">
        <label htmlFor="filter1">Disaster Type 1:</label>
        <select id="filter1" onChange={(e) => setFilterType1(e.target.value)}>
          <option value="">All</option>
          {disasterTypes.map((type, index) => (
            <option key={index} value={type.short_title}>
              {type.short_title}
            </option>
          ))}
        </select>
      </div>

      <div className="filter-group">
        <label htmlFor="filter2">Disaster Type 2:</label>
        <select id="filter2" onChange={(e) => setFilterType2(e.target.value)}>
          <option value="">All</option>
          {disasterTypes.map((type, index) => (
            <option key={index} value={type.short_title}>
              {type.short_title}
            </option>
          ))}
        </select>
      </div>
    </div>

    {/* Second Row - Event Date Range */}
    <div className="filter-row">
      <div className="filter-group">
        <label htmlFor="event-start-date">Start Date:</label>
        <input
          type="date"
          id="event-start-date"
          value={eventStartDate}
          onChange={(e) => setEventStartDate(e.target.value)}
        />
      </div>

      <div className="filter-group">
        <label htmlFor="event-end-date">End Date:</label>
        <input
          type="date"
          id="event-end-date"
          value={eventEndDate}
          onChange={(e) => setEventEndDate(e.target.value)}
        />
      </div>
    </div>

    {/* Third Row - Admin Level & Location */}
    <div className="filter-row">
      <div className="filter-group">
        <label htmlFor="admin-level">Admin Level:</label>
        <select
          id="admin-level"
          value={adminLevel}
          onChange={(e) => setAdminLevel(e.target.value)}
        >
          <option value="">Select Level</option>
          <option value="1">Level 1</option>
          <option value="2">Level 2</option>
          <option value="3">Level 3</option>
          <option value="4">Level 4</option>
          <option value="5">Level 5</option>
          <option value="6">Level 6</option>
        </select>
      </div>

      <div className="filter-group">
        <label htmlFor="location">Location:</label>
        <select id="location" onChange={handleLocationChange}>
          <option value="">Select Location</option>
          {spatialRef.map((location) => (
            <option key={location.id} value={location.id}>
              {location.elstatlektiko}
            </option>
          ))}
        </select>
      </div>
    </div>

      

      {/* Distance Range Slider */}
      <div className="filter-group distance-slider-box">
        <label>
          Distance Range: {distanceRange} meters
        </label>
        <input
          type="range"
          min="0"
          max="50000"
          step="1000"
          value={distanceRange}
          onChange={(e) => setDistanceRange(Number(e.target.value))}
        />
      </div>

      {/* Search Button */}
      <div className="filter-group">
        <button onClick={onSearch} className="search-button">
          Search
        </button>
      </div>
      {/* Graph Legend Box */}
      <div className="graph-legend">
        <div className="legend-section">
          <h4>Hazard Types</h4>
          {Object.entries(hazardsObj).map(([name, code]) => (
            <p key={code}>
              <strong>{code}</strong> - {name}
            </p>
          ))}
        </div>

        <div className="legend-section">
          <h4>Relationships</h4>
          {Object.entries(relationshipsObj).map(([code, description]) => (
            <p key={code}>
              <strong>{code}</strong> - {description}
            </p>
          ))}
        </div>
      </div>
    </div>
  );
};

export default FilterSidebar;
