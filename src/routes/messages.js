import express from 'express';
import Message from '../models/Message.js';
import auth from '../middleware/auth.js';

const router = express.Router();

// === OBTENER TODOS LOS MENSAJES ===
router.get('/', async (req, res) => {
  try {
    console.log('GET /api/messages - Buscando mensajes...');
    
    const messages = await Message.find({ parentId: null })
      .populate('replies')
      .sort({ createdAt: -1 })
      .limit(100)
      .maxTimeMS(30000);  // 30 segundos de timeout
    
    console.log(`✓ Encontrados ${messages.length} mensajes`);
    res.json(messages);
  } catch (error) {
    console.error('Error en GET /messages:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// === CREAR NUEVO MENSAJE ===
router.post('/', async (req, res) => {
  try {
    const { author, content, images, videos, parentId } = req.body;

    if (!author || !content) {
      return res.status(400).json({ error: 'Autor y contenido requeridos' });
    }

    if (content.trim().length === 0) {
      return res.status(400).json({ error: 'El mensaje no puede estar vacío' });
    }

    const nuevoMensaje = new Message({
      author: {
        name: author.substring(0, 50),
        userId: req.userId || null
      },
      content: content.substring(0, 5000),
      images: Array.isArray(images) ? images : [],
      videos: Array.isArray(videos) ? videos : [],
      parentId: parentId || null
    });

    await nuevoMensaje.save();

    if (parentId) {
      await Message.findByIdAndUpdate(parentId, {
        $push: { replies: nuevoMensaje._id }
      }, { maxTimeMS: 30000 });
    }

    res.status(201).json(nuevoMensaje);
  } catch (error) {
    console.error('Error en POST /messages:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// === RESTO DE RUTAS ===
// (mantén el resto del código igual)

export default router;
