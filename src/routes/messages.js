import express from 'express';
import Message from '../models/Message.js';
import auth from '../middleware/auth.js';

const router = express.Router();

// Obtener todos los mensajes principales
router.get('/', async (req, res) => {
  try {
    const messages = await Message.find({ parentId: null })
      .populate('replies')
      .sort({ createdAt: -1 })
      .limit(100);
    res.json(messages);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Crear nuevo mensaje
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

    // Si es respuesta, agregar al mensaje padre
    if (parentId) {
      await Message.findByIdAndUpdate(parentId, {
        $push: { replies: nuevoMensaje._id }
      });
    }

    res.status(201).json(nuevoMensaje);
  } catch (error) {
    console.error('Error al crear mensaje:', error);
    res.status(500).json({ error: error.message });
  }
});

// Obtener respuestas de un mensaje
router.get('/:id/replies', async (req, res) => {
  try {
    const { id } = req.params;

    const replies = await Message.find({ parentId: id })
      .sort({ createdAt: 1 });

    res.json(replies);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Obtener un mensaje específico
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const mensaje = await Message.findById(id).populate('replies');

    if (!mensaje) {
      return res.status(404).json({ error: 'Mensaje no encontrado' });
    }

    res.json(mensaje);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Editar mensaje (solo autores registrados)
router.put('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body;

    const mensaje = await Message.findById(id);

    if (!mensaje) {
      return res.status(404).json({ error: 'Mensaje no encontrado' });
    }

    if (mensaje.author.userId?.toString() !== req.userId) {
      return res.status(403).json({ error: 'No tienes permiso para editar este mensaje' });
    }

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ error: 'El contenido no puede estar vacío' });
    }

    mensaje.content = content.substring(0, 5000);
    mensaje.edited = true;
    mensaje.updatedAt = new Date();

    await mensaje.save();

    res.json(mensaje);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Eliminar mensaje
router.delete('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;

    const mensaje = await Message.findById(id);

    if (!mensaje) {
      return res.status(404).json({ error: 'Mensaje no encontrado' });
    }

    if (mensaje.author.userId?.toString() !== req.userId) {
      return res.status(403).json({ error: 'No tienes permiso para eliminar este mensaje' });
    }

    await Message.deleteOne({ _id: id });

    // Eliminar referencias en padre
    if (mensaje.parentId) {
      await Message.findByIdAndUpdate(mensaje.parentId, {
        $pull: { replies: id }
      });
    }

    res.json({ message: 'Mensaje eliminado correctamente' });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Like en un mensaje
router.post('/:id/like', async (req, res) => {
  try {
    const { id } = req.params;

    const mensaje = await Message.findByIdAndUpdate(
      id,
      { $inc: { likes: 1 } },
      { new: true }
    );

    if (!mensaje) {
      return res.status(404).json({ error: 'Mensaje no encontrado' });
    }

    res.json(mensaje);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
