import React, { useState } from "react";

const TableView = ({ filteredPoints, selectedPoint, compareResults, distanceRange, onPointSelect }) => {
  const validCompareResults = compareResults || [];
  const isComparisonMode = !!selectedPoint;

  // Sorting state
  const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" });

  // Sorting function
  const handleSort = (columnKey) => {
    let direction = "asc";
    if (sortConfig.key === columnKey && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key: columnKey, direction });
  };

  // Function to truncate long text
  const truncateText = (text, length = 50) => {
    if (!text) return "N/A";
    return text.length > length ? text.substring(0, length) + "..." : text;
  };

  // **Filter by distance (only in comparison mode)**
  const filteredResults = isComparisonMode
    ? validCompareResults.filter(event => event.distance_meters !== undefined && event.distance_meters <= distanceRange)
    : filteredPoints;

  // **Apply sorting after filtering**
  const sortedResults = [...filteredResults].sort((a, b) => {
    if (!sortConfig.key) return 0;

    let valueA = a[sortConfig.key];
    let valueB = b[sortConfig.key];

    // Handle dates
    if (sortConfig.key.includes("date")) {
      valueA = new Date(valueA).getTime();
      valueB = new Date(valueB).getTime();
    }

    // Handle numbers
    if (typeof valueA === "number" && typeof valueB === "number") {
      return sortConfig.direction === "asc" ? valueA - valueB : valueB - valueA;
    }

    // Default string comparison
    valueA = valueA ? valueA.toString().toLowerCase() : "";
    valueB = valueB ? valueB.toString().toLowerCase() : "";

    return sortConfig.direction === "asc" ? valueA.localeCompare(valueB) : valueB.localeCompare(valueA);
  });

  return (
    <div className="table-container">
      <div className="table-wrapper">
        <table className="disaster-events-table">
          <thead>
            <tr>
              <th onClick={() => handleSort("id")}>ID</th>
              <th onClick={() => handleSort("elstatlektiko")}>Location</th>
              <th onClick={() => handleSort("spatialref_source")}>Spatial Ref Source</th>
              <th onClick={() => handleSort("disaster_type")}>Disaster Type</th>
              <th onClick={() => handleSort("eventdate")}>Event Date</th>
              <th onClick={() => handleSort("eventenddate")}>Event End Date</th>
              <th onClick={() => handleSort("alertstartdate")}>Alert Start</th>
              <th onClick={() => handleSort("alertenddate")}>Alert End</th>
              <th onClick={() => handleSort("publishdate")}>Publish Date</th>
              <th onClick={() => handleSort("index_n")}>Index N</th>
              <th onClick={() => handleSort("index_from")}>Index From</th>
              <th onClick={() => handleSort("ada")}>ADA</th>
              <th onClick={() => handleSort("infosource")}>Info Source</th>
              <th onClick={() => handleSort("infosourcetype")}>Source Type</th>
              <th onClick={() => handleSort("infosourcepublisher")}>Source Publisher</th>
              <th onClick={() => handleSort("infosourcelink")}>Source Link</th>
              <th onClick={() => handleSort("infosourcenotes")}>Source Notes</th>
              <th onClick={() => handleSort("notes")}>Notes</th>
              <th onClick={() => handleSort("discoverydate")}>Discovery Date</th>
              <th onClick={() => handleSort("discoverymethod")}>Discovery Method</th>
              <th onClick={() => handleSort("confidence")}>Confidence</th>
              <th onClick={() => handleSort("discoverytool")}>Discovery Tool</th>
              <th onClick={() => handleSort("discoverylog")}>Discovery Log</th>
              <th onClick={() => handleSort("discoverynotes")}>Discovery Notes</th>
              {isComparisonMode && <th onClick={() => handleSort("distance_meters")}>Distance (meters)</th>}
              {isComparisonMode && <th onClick={() => handleSort("days_difference")}>Days Difference</th>}
            </tr>
          </thead>
          <tbody>
            {/* Selected event row */}
            {isComparisonMode && selectedPoint && (
              <tr key={selectedPoint.id} className="selected-event">
                <td>{selectedPoint.id}</td>
                <td>{selectedPoint.elstatlektiko}</td>
                <td>{selectedPoint.spatialref_source}</td>
                <td>{selectedPoint.disaster_type}</td>
                <td>{selectedPoint.eventdate ? new Date(selectedPoint.eventdate).toLocaleDateString() : "N/A"}</td>
                <td>{selectedPoint.eventenddate ? new Date(selectedPoint.eventenddate).toLocaleDateString() : "N/A"}</td>
                <td>{selectedPoint.alertstartdate ? new Date(selectedPoint.alertstartdate).toLocaleDateString() : "N/A"}</td>
                <td>{selectedPoint.alertenddate ? new Date(selectedPoint.alertenddate).toLocaleDateString() : "N/A"}</td>
                <td>{selectedPoint.publishdate ? new Date(selectedPoint.publishdate).toLocaleDateString() : "N/A"}</td>
                <td>{selectedPoint.index_n}</td>
                <td>{selectedPoint.index_from}</td>
                <td>{selectedPoint.ada}</td>
                <td>{truncateText(selectedPoint.infosource)}</td>
                <td>{selectedPoint.infosourcetype}</td>
                <td>{selectedPoint.infosourcepublisher}</td>
                <td>
                  {selectedPoint.infosourcelink ? (
                    <a href={selectedPoint.infosourcelink} target="_blank" rel="noopener noreferrer">
                      Link
                    </a>
                  ) : "N/A"}
                </td>
                <td>{truncateText(selectedPoint.infosourcenotes)}</td>
                <td>{truncateText(selectedPoint.notes)}</td>
                <td>{selectedPoint.discoverydate ? new Date(selectedPoint.discoverydate).toLocaleDateString() : "N/A"}</td>
                <td>{selectedPoint.discoverymethod}</td>
                <td>{selectedPoint.confidence}</td>
                <td>{selectedPoint.discoverytool}</td>
                <td>{truncateText(selectedPoint.discoverylog)}</td>
                <td>{truncateText(selectedPoint.discoverynotes)}</td>
                {isComparisonMode && <td>-</td>}
                {isComparisonMode && <td>-</td>}
              </tr>
            )}

            {/* Sorted and filtered rows */}
            {sortedResults.map((event) => (
              <tr key={event.id} className={selectedPoint?.id === event.id ? "selected-event" : ""}>
                <td onClick={() => onPointSelect(event)} style={{ cursor: "pointer", fontWeight: "bold" }}>{event.id}</td>
                <td>{event.elstatlektiko}</td>
                <td>{event.spatialref_source}</td>
                <td>{event.disaster_type}</td>
                <td>{event.eventdate ? new Date(event.eventdate).toLocaleDateString() : "N/A"}</td>
                <td>{event.eventenddate ? new Date(event.eventenddate).toLocaleDateString() : "N/A"}</td>
                <td>{event.alertstartdate ? new Date(event.alertstartdate).toLocaleDateString() : "N/A"}</td>
                <td>{event.alertenddate ? new Date(event.alertenddate).toLocaleDateString() : "N/A"}</td>
                <td>{event.publishdate ? new Date(event.publishdate).toLocaleDateString() : "N/A"}</td>
                <td>{event.index_n}</td>
                <td>{event.index_from}</td>
                <td>{event.ada}</td>
                <td>{truncateText(event.infosource)}</td>
                <td>{event.infosourcetype}</td>
                <td>{event.infosourcepublisher}</td>
                <td><a href={event.infosourcelink} target="_blank" rel="noopener noreferrer">Link</a></td>
                <td>{truncateText(event.infosourcenotes)}</td>
                <td>{truncateText(event.notes)}</td>
                <td>{event.discoverydate ? new Date(event.discoverydate).toLocaleDateString() : "N/A"}</td>
                <td>{event.discoverymethod}</td>
                <td>{event.confidence}</td>
                <td>{event.discoverytool}</td>
                <td>{truncateText(event.discoverylog)}</td>
                <td>{truncateText(event.discoverynotes)}</td>
                {isComparisonMode && <td>{event.distance_meters ? event.distance_meters.toFixed(2) : "0"}</td>}
                {isComparisonMode && <td>{event.days_difference !== undefined ? event.days_difference : "0"}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TableView;
