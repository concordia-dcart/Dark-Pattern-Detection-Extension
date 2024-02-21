const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const app = express();

// Configure Multer storage settings
const storage = multer.diskStorage({
  destination: './images', 
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  },
});

const upload = multer({ storage }).single('image');

app.post('/upload', (req, res) => {
  upload(req, res, async err => {
    if (!err && req.file) {
      try {
        await new Promise((resolve, reject) => {
          const imgUrl = `${process.env.APP_URL || 'http://localhost:3000'}/images/${req.file.filename}`;
          resolve(res.status(200).send({ url: imgUrl }));
          console.log(imgUrl);
        });
      } catch (error) {
        return res.status(500).send({ error: 'Failed to generate URL.' });
      }
    } else {
      return res.status(400).send({ error: err ? err : 'No file uploaded!' });
    }
  });
});

// Serve static assets
if (require.main === module) {
  const port = process.env.PORT || 3000;
  app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
  });
}