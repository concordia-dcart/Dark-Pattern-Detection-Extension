const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { put, list } = require('@vercel/blob'); 

const app = express();

app.use(cors());

const upload = multer({ storage: multer.memoryStorage() });

app.post('/upload', upload.single('image'), async (req, res) => {
  if (!req.file) {
    return res.status(400).send({ error: 'No file uploaded!' });
  }

  try {
    const imageUrl = await put(req.file.originalname, req.file.buffer, { access: 'public' });
    res.status(200).send({ imageUrl });
  } catch (error) {
    res.status(500).send({ error: 'Failed to upload image to Blob.' });
  }
});


// Fallback 404 route
app.use((req, res) => {
  res.status(404).send('404: File Not Found');
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});