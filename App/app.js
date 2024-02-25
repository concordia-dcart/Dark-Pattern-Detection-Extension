const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const app = express();

// Configure Multer storage settings
const storage = multer.diskStorage({
  destination: './images', // ensure this directory exists
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  },
});

const upload = multer({ storage }).single('image');

// Endpoint to handle file uploads
app.post('/upload', (req, res) => {
  upload(req, res, async err => {
    if (!err && req.file) {
      // Construct the URL to access the uploaded image
      const imgUrl = `https://dark-pattern-detection-extension-<your-vercel-id>.vercel.app/images/${req.file.filename}`;
      res.status(200).send({ url: imgUrl });
    } else {
      res.status(400).send({ error: err ? err : 'No file uploaded!' });
    }
  });
});

// Serve static files from the 'images' directory
app.use('/images', express.static(path.join(__dirname, 'images')));

// Fallback route for handling 404 errors
app.use((req, res, next) => {
  res.status(404).send('404: File Not Found');
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

module.exports = app;
