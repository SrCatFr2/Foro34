import express from 'express';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import Message from '../models/Message.js';
import User from '../models/User.js';
import auth from '../middleware/auth.js';

const router = express.Router();

function isValidObjectId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

async function getOptionalUser(req) {
  try {
    const authHeader = req.headers.authorization || '';
    if (!authHeader.startsWith('Bearer ')) return null;

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.userId).lean();
    return user || null;
  } catch {
    return null;
  }
}

function normalizeUserId(user) {
  return user?._id?.toString?.() || user?.id || null;
}

// GET principales
router.get('/', async (req, res) => {
  try {
    const messages = await Message.find({ parentId: null })
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    res.json(messages);
  } catch (error) {
    console.error('GET /api/messages error:', error);
    res.status(500).json({ error: 'Error al cargar mensajes' });
  }
});

// GET trending
router.get('/trending/top', async (req, res) => {
  try {
    const messages = await Message.find({ parentId: null })
      .sort({ likes: -1, createdAt: -1 })
      .limit(50)
      .lean();

    res.json(messages);
  } catch (error) {
    console.error('GET /api/messages/trending/top error:', error);
    res.status(500).json({ error: 'Error al cargar trending' });
  }
});

// GET búsqueda
router.get('/search/:query', async (req, res) => {
  try {
    const query = (req.params.query || '').trim();

    if (query.length < 2) {
      return res.status(400).json({ error: 'La búsqueda es demasiado corta' });
    }

    const messages = await Message.find({
      parentId: null,
      $or: [
        { content: { $regex: query, $options: 'i' } },
        { 'author.name': { $regex: query, $options: 'i' } }
      ]
    })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    res.json(messages);
  } catch (error) {
    console.error('GET /api/messages/search error:', error);
    res.status(500).json({ error: 'Error al buscar mensajes' });
  }
});

// GET mensajes por usuario
router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    if (!isValidObjectId(userId)) {
      return res.status(400).json({ error: 'ID de usuario inválido' });
    }

    const messages = await Message.find({
      parentId: null,
      'author.userId': userId
    })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    res.json(messages);
  } catch (error) {
    console.error('GET /api/messages/user/:userId error:', error);
    res.status(500).json({ error: 'Error al cargar mensajes del usuario' });
  }
});

// GET replies
router.get('/:id/replies', async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({ error: 'ID inválido' });
    }

    const replies = await Message.find({ parentId: id })
      .sort({ createdAt: 1 })
      .lean();

    res.json(replies);
  } catch (error) {
    console.error('GET /api/messages/:id/replies error:', error);
    res.status(500).json({ error: 'Error al cargar respuestas' });
  }
});

// GET uno
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({ error: 'ID inválido' });
    }

    const message = await Message.findById(id).lean();

    if (!message) {
      return res.status(404).json({ error: 'Mensaje no encontrado' });
    }

    res.json(message);
  } catch (error) {
    console.error('GET /api/messages/:id error:', error);
    res.status(500).json({ error: 'Error al cargar el mensaje' });
  }
});

// POST crear mensaje o respuesta
router.post('/', async (req, res) => {
  try {
    const optionalUser = await getOptionalUser(req);
    const { author, content, images, videos, parentId } = req.body;

    const cleanContent = (content || '').trim();

    if (!cleanContent) {
      return res.status(400).json({ error: 'El contenido es obligatorio' });
    }

    if (cleanContent.length > 5000) {
      return res.status(400).json({ error: 'El mensaje es demasiado largo' });
    }

    let finalAuthorName = 'Anónimo';
    let finalUserId = null;
    let finalAvatar = null;

    if (optionalUser) {
      finalAuthorName = optionalUser.username;
      finalUserId = optionalUser._id;
      finalAvatar = optionalUser.profile?.avatar || null;
    } else {
      finalAuthorName = (author || 'Anónimo').trim().slice(0, 50) || 'Anónimo';
    }

    if (parentId && !isValidObjectId(parentId)) {
      return res.status(400).json({ error: 'ID de mensaje padre inválido' });
    }

    const message = new Message({
      author: {
        name: finalAuthorName,
        userId: finalUserId,
        avatar: finalAvatar
      },
      content: cleanContent,
      images: Array.isArray(images) ? images.filter(Boolean) : [],
      videos: Array.isArray(videos) ? videos.filter(Boolean) : [],
      parentId: parentId || null
    });

    await message.save();

    if (parentId) {
      await Message.findByIdAndUpdate(parentId, {
        $push: { replies: message._id }
      });
    }

    if (optionalUser) {
      await User.findByIdAndUpdate(optionalUser._id, {
        $inc: { 'stats.messageCount': 1 }
      });
    }

    res.status(201).json(message);
  } catch (error) {
    console.error('POST /api/messages error:', error);
    res.status(500).json({ error: 'Error al crear mensaje' });
  }
});

// POST like
router.post('/:id/like', async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({ error: 'ID inválido' });
    }

    const message = await Message.findByIdAndUpdate(
      id,
      { $inc: { likes: 1 } },
      { new: true }
    );

    if (!message) {
      return res.status(404).json({ error: 'Mensaje no encontrado' });
    }

    if (message.author?.userId) {
      await User.findByIdAndUpdate(message.author.userId, {
        $inc: { 'stats.likes': 1 }
      });
    }

    res.json(message);
  } catch (error) {
    console.error('POST /api/messages/:id/like error:', error);
    res.status(500).json({ error: 'Error al dar like' });
  }
});

// PUT editar
router.put('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const content = (req.body.content || '').trim();

    if (!isValidObjectId(id)) {
      return res.status(400).json({ error: 'ID inválido' });
    }

    if (!content) {
      return res.status(400).json({ error: 'Contenido vacío' });
    }

    const message = await Message.findById(id);

    if (!message) {
      return res.status(404).json({ error: 'Mensaje no encontrado' });
    }

    if (!message.author.userId || message.author.userId.toString() !== req.userId) {
      return res.status(403).json({ error: 'No autorizado' });
    }

    message.content = content.slice(0, 5000);
    message.edited = true;
    await message.save();

    res.json(message);
  } catch (error) {
    console.error('PUT /api/messages/:id error:', error);
    res.status(500).json({ error: 'Error al editar mensaje' });
  }
});

// DELETE eliminar
router.delete('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({ error: 'ID inválido' });
    }

    const message = await Message.findById(id);

    if (!message) {
      return res.status(404).json({ error: 'Mensaje no encontrado' });
    }

    if (!message.author.userId || message.author.userId.toString() !== req.userId) {
      return res.status(403).json({ error: 'No autorizado' });
    }

    const parentId = message.parentId;
    const authorId = message.author.userId;

    await Message.deleteOne({ _id: id });
    await Message.deleteMany({ parentId: id });

    if (parentId) {
      await Message.findByIdAndUpdate(parentId, {
        $pull: { replies: id }
      });
    }

    if (authorId) {
      await User.findByIdAndUpdate(authorId, {
        $inc: { 'stats.messageCount': -1 }
      });
    }

    res.json({ ok: true });
  } catch (error) {
    console.error('DELETE /api/messages/:id error:', error);
    res.status(500).json({ error: 'Error al eliminar mensaje' });
  }
});

export default router;
