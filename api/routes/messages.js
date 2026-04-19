const express = require('express');
const Message = require('../models/Message');
const auth = require('../middleware/auth');
const router = express.Router();

// Obtener todos los mensajes principales
router.get('/', async (req, res) => {
  try {
    const messages = await Message.find({ parentId: null })
      .populate('replies')
      .sort({ createdAt: -1 })
      .limit(50);
    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Crear mensaje
router.post('/', async (req, res) => {
  try {
    const { author, content, images, videos, parentId } = req.body;
    
    const message = new Message({
      author: {
        name: author,
        userId: req.userId || null
      },
      content,
      images: images || [],
      videos: videos || [],
      parentId: parentId || null
    });

    await message.save();
    
    // Si es respuesta, agregar al mensaje padre
    if (parentId) {
      await Message.findByIdAndUpdate(parentId, {
        $push: { replies: message._id }
      });
    }

    res.status(201).json(message);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Obtener respuestas de un mensaje
router.get('/:id/replies', async (req, res) => {
  try {
    const replies = await Message.find({ parentId: req.params.id })
      .sort({ createdAt: 1 });
    res.json(replies);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Editar mensaje (solo si eres el autor)
router.put('/:id', auth, async (req, res) => {
  try {
    const message = await Message.findById(req.params.id);
    
    if (message.author.userId.toString() !== req.userId) {
      return res.status(403).json({ error: 'No autorizado' });
    }

    message.content = req.body.content || message.content;
    message.edited = true;
    message.updatedAt = Date.now();
    
    await message.save();
    res.json(message);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Eliminar mensaje
router.delete('/:id', auth, async (req, res) => {
  try {
    const message = await Message.findById(req.params.id);
    
    if (message.author.userId.toString() !== req.userId) {
      return res.status(403).json({ error: 'No autorizado' });
    }

    await Message.deleteOne({ _id: req.params.id });
    res.json({ message: 'Eliminado' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
