// src/utils/exportData.js

import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

export const exportToExcel = (filteredPoints, selectedPoint, compareResults, distanceRange) => {
  let dataToExport = [];

  if (!selectedPoint) {
    // Case: No selected point → Export filtered results as they are
    dataToExport = filteredPoints.map((point) => ({ ...point }));
  } else {
    // Case: Selected point exists → Export selected point + compare results (filtered by distance range)

    // Add **selected point as the first row**
    dataToExport.push({
      ...selectedPoint,
      distance_meters: "-", // Selected point has no distance value
      days_difference: "-",
    });

    // Filter compare results based on distance range
    const filteredCompareResults = compareResults.filter(
      (event) => event.distance_meters !== undefined && event.distance_meters <= distanceRange
    );

    // Add compare results (filtered)
    dataToExport.push(...filteredCompareResults);
  }

  if (dataToExport.length === 0) {
    alert("No data available to export.");
    return;
  }

  // Create a worksheet
  const worksheet = XLSX.utils.json_to_sheet(dataToExport);

  // Create a new workbook and append the worksheet
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Disaster Events");

  // Generate buffer
  const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });

  // Create a blob from the buffer
  const data = new Blob([excelBuffer], { type: "application/octet-stream" });

  // Trigger the download
  saveAs(data, `disaster_event_${selectedPoint ? "compare" : "filtered"}.xlsx`);
};
