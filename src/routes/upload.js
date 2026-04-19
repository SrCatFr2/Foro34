import express from 'express';
import { v2 as cloudinary } from 'cloudinary';

const router = express.Router();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

router.post('/', async (req, res) => {
  try {
    const { file, type } = req.body;

    if (!file) {
      return res.status(400).json({ error: 'Archivo requerido' });
    }

    const resourceType = type === 'video' ? 'video' : 'image';

    const resultado = await cloudinary.uploader.upload(file, {
      resource_type: resourceType,
      folder: 'foro34',
      max_file_size: type === 'video' ? 52428800 : 10485760 // 50MB video, 10MB imagen
    });

    res.json({ url: resultado.secure_url });
  } catch (error) {
    console.error('Error en upload:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
