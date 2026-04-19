import express from 'express';
import Message from '../models/Message.js';
import auth from '../middleware/auth.js';

const router = express.Router();

// === GET - Obtener todos los mensajes ===
router.get('/', async (req, res) => {
  try {
    const messages = await Message.find({ parentId: null })
      .populate('replies')
      .sort({ createdAt: -1 })
      .limit(100)
      .lean()
      .exec();
    
    res.json(messages || []);
  } catch (error) {
    console.error('Error GET /messages:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// === POST - Crear mensaje ===
router.post('/', async (req, res) => {
  try {
    const { author, content, images, videos, parentId } = req.body;

    if (!author || !content) {
      return res.status(400).json({ error: 'Autor y contenido requeridos' });
    }

    if (content.trim().length === 0) {
      return res.status(400).json({ error: 'Contenido vacío' });
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
    console.error('Error POST /messages:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// === GET - Obtener un mensaje específico ===
router.get('/:id', async (req, res) => {
  try {
    const message = await Message.findById(req.params.id)
      .populate('replies')
      .lean()
      .exec();

    if (!message) {
      return res.status(404).json({ error: 'Mensaje no encontrado' });
    }

    res.json(message);
  } catch (error) {
    console.error('Error GET /:id:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// === GET - Obtener respuestas de un mensaje ===
router.get('/:id/replies', async (req, res) => {
  try {
    const replies = await Message.find({ parentId: req.params.id })
      .sort({ createdAt: 1 })
      .lean()
      .exec();

    res.json(replies || []);
  } catch (error) {
    console.error('Error GET /:id/replies:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// === POST - Like en un mensaje ===
router.post('/:id/like', async (req, res) => {
  try {
    const message = await Message.findByIdAndUpdate(
      req.params.id,
      { $inc: { likes: 1 } },
      { new: true }
    );

    if (!message) {
      return res.status(404).json({ error: 'Mensaje no encontrado' });
    }

    res.json(message);
  } catch (error) {
    console.error('Error POST /:id/like:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// === PUT - Editar mensaje ===
router.put('/:id', auth, async (req, res) => {
  try {
    const { content } = req.body;

    const message = await Message.findById(req.params.id);

    if (!message) {
      return res.status(404).json({ error: 'Mensaje no encontrado' });
    }

    if (message.author.userId?.toString() !== req.userId) {
      return res.status(403).json({ error: 'No tienes permiso' });
    }

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ error: 'Contenido vacío' });
    }

    message.content = content.substring(0, 5000);
    message.edited = true;
    message.updatedAt = new Date();

    await message.save();

    res.json(message);
  } catch (error) {
    console.error('Error PUT /:id:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// === DELETE - Eliminar mensaje ===
router.delete('/:id', auth, async (req, res) => {
  try {
    const message = await Message.findById(req.params.id);

    if (!message) {
      return res.status(404).json({ error: 'Mensaje no encontrado' });
    }

    if (message.author.userId?.toString() !== req.userId) {
      return res.status(403).json({ error: 'No tienes permiso' });
    }

    await Message.deleteOne({ _id: req.params.id });

    if (message.parentId) {
      await Message.findByIdAndUpdate(
        message.parentId,
        { $pull: { replies: req.params.id } }
      );
    }

    res.json({ message: 'Eliminado' });
  } catch (error) {
    console.error('Error DELETE /:id:', error.message);
    res.status(500).json({ error: error.message });
  }
});

export default router;
