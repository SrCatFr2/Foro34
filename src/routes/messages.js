import express from 'express';
import Message from '../models/Message.js';
import auth from '../middleware/auth.js';

const router = express.Router();

// GET - Obtener mensajes
router.get('/', async (req, res) => {
  try {
    console.log('GET /messages - Buscando...');
    
    const messages = await Message.find({ parentId: null })
      .populate('replies')
      .sort({ createdAt: -1 })
      .limit(100)
      .lean()  // Más rápido para lectura
      .exec();
    
    res.json(messages || []);
  } catch (error) {
    console.error('GET /messages error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// POST - Crear mensaje
router.post('/', async (req, res) => {
  try {
    const { author, content, images, videos, parentId } = req.body;

    if (!author || !content) {
      return res.status(400).json({ error: 'Campos requeridos' });
    }

    const newMessage = new Message({
      author: {
        name: author.substring(0, 50),
        userId: req.userId || null
      },
      content: content.substring(0, 5000),
      images: Array.isArray(images) ? images : [],
      videos: Array.isArray(videos) ? videos : [],
      parentId: parentId || null
    });

    await newMessage.save();

    if (parentId) {
      await Message.findByIdAndUpdate(
        parentId,
        { $push: { replies: newMessage._id } },
        { new: true }
      );
    }

    res.status(201).json(newMessage);
  } catch (error) {
    console.error('POST /messages error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// GET - Obtener respuestas
router.get('/:id/replies', async (req, res) => {
  try {
    const replies = await Message.find({ parentId: req.params.id })
      .sort({ createdAt: 1 })
      .lean()
      .exec();

    res.json(replies || []);
  } catch (error) {
    console.error('GET replies error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Resto de rutas igual...
export default router;
