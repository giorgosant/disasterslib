import React, { useState } from 'react';
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

const ImportView = () => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  // Handle file selection
  const handleFileChange = (e) => {
    setSelectedFile(e.target.files[0]);
    setMessage(null);
    setError(null);
  };

  // Handle file upload
  const handleUpload = async () => {
    if (!selectedFile) {
      setError('Please select a file to upload.');
      return;
    }

    const allowedExtensions = ['.csv', '.xlsx'];
    const fileExtension = selectedFile.name.slice(selectedFile.name.lastIndexOf('.')).toLowerCase();

    if (!allowedExtensions.includes(fileExtension)) {
      setError('Only CSV and XLSX files are allowed.');
      return;
    }

    const formData = new FormData();
    formData.append('file', selectedFile);

    setUploading(true);
    setMessage(null);
    setError(null);

    try {
      const response = await axios.post(
        `${API_BASE_URL}/api/disasterEvents/import`,
        formData
      );

      setMessage(response.data.message);
      setSelectedFile(null);
    } catch (err) {
      if (err.response && err.response.data && err.response.data.error) {
        setError(err.response.data.error);
      } else {
        setError('An error occurred during the import.');
      }
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="import-view">
      <h2>Import Disaster Events</h2>
      <p>Please upload a CSV or XLSX file containing disaster event data. The file should include the following fields:</p>

      <div className="import-fields">
        <ul>
          <li><strong>spatialref_fk</strong> (required)</li>
          <li><strong>spatialref_source</strong> (required)</li>
          <li><strong>disastertype_fk</strong> (required)</li>
          <li><strong>disastertype_source</strong> (required)</li>
          <li><strong>eventdate</strong> (required, format: YYYY-MM-DD)</li>
          <li><strong>eventenddate</strong> (optional, format: YYYY-MM-DD)</li>
          <li><strong>alertstartdate</strong> (optional, format: YYYY-MM-DD)</li>
          <li><strong>alertenddate</strong> (optional, format: YYYY-MM-DD)</li>
          <li><strong>publishdate</strong> (required, format: YYYY-MM-DD)</li>
          <li><strong>index_n</strong> (required)</li>
          <li><strong>index_from</strong> (required)</li>
          <li><strong>ada</strong> (required)</li>
        </ul>
        <ul>
          <li><strong>infosource</strong> (required)</li>
          <li><strong>infosourcetype</strong> (required)</li>
          <li><strong>infosourcepublisher</strong> (required)</li>
          <li><strong>infosourcelink</strong> (required)</li>
          <li><strong>infosourcenotes</strong> (optional)</li>
          <li><strong>notes</strong> (optional)</li>
          <li><strong>discoverydate</strong> (required, format: YYYY-MM-DD)</li>
          <li><strong>discoverymethod</strong> (required)</li>
          <li><strong>confidence</strong> (required)</li>
          <li><strong>discoverytool</strong> (optional)</li>
          <li><strong>discoverylog</strong> (optional)</li>
          <li><strong>discoverynotes</strong> (optional)</li>
        </ul>
      </div>

      <p>Make sure that the foreign key fields (<strong>spatialref_fk</strong> and <strong>disastertype_fk</strong>) correspond to existing IDs in the database.</p>

      <div className="import-form">
        <input
          type="file"
          onChange={handleFileChange}
          accept=".csv, .xlsx"
          id="upload-file"
          hidden
        />
        <label className="upload-label" htmlFor="upload-file">Choose File</label>

        <button
          className="upload-button"
          onClick={handleUpload}
          disabled={uploading}
        >
          {uploading ? 'Uploading...' : 'Upload File'}
        </button>

        {message && <div className="success">{message}</div>}
        {error && <div className="error">{error}</div>}
      </div>
    </div>
  );
};

export default ImportView;
