const express = require("express");
const cors = require("cors");
const disasterEventsRouter = require("./routes/disasterEvents");
const disasterTypesRouter = require("./routes/disasterTypes");
const spatialRefRouter = require("./routes/spatialRef");

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Error handling middleware
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    // Handle Multer-specific errors
    res.status(400).json({ error: err.message });
  } else if (err) {
    // Handle other errors
    res.status(500).json({ error: err.message });
  } else {
    next();
  }
});

app.get("/", (req, res) => {
  res.send("Welcome to the Disaster Events API");
});

// Use Routes
app.use("/api/disasterEvents", disasterEventsRouter);
app.use("/api/disasterTypes", disasterTypesRouter);
app.use("/api/spatialRef", spatialRefRouter);

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
