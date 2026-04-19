const express = require('express');
const { v2: cloudinary } = require('cloudinary');
const router = express.Router();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

router.post('/', async (req, res) => {
  try {
    const { file, type } = req.body; // base64

    const result = await cloudinary.uploader.upload(file, {
      resource_type: type === 'video' ? 'video' : 'image',
      folder: 'foro34'
    });

    res.json({ url: result.secure_url });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
