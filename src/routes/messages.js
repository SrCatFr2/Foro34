import express from 'express';
import Message from '../models/Message.js';
import User from '../models/User.js';
import auth from '../middleware/auth.js';

const router = express.Router();

// === GET - Obtener todos los mensajes principales ===
router.get('/', async (req, res) => {
  try {
    console.log('GET /messages - Buscando mensajes...');
    
    const messages = await Message.find({ parentId: null })
      .populate('replies')
      .sort({ createdAt: -1 })
      .limit(100)
      .lean()
      .exec();
    
    console.log(`✓ Encontrados ${messages.length} mensajes`);
    res.json(messages || []);
  } catch (error) {
    console.error('Error GET /messages:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// === POST - Crear nuevo mensaje ===
router.post('/', async (req, res) => {
  try {
    const { author, content, images, videos, parentId } = req.body;

    // Validación
    if (!author || !content) {
      return res.status(400).json({ error: 'Autor y contenido requeridos' });
    }

    if (content.trim().length === 0) {
      return res.status(400).json({ error: 'El mensaje no puede estar vacío' });
    }

    if (content.length > 5000) {
      return res.status(400).json({ error: 'El mensaje es muy largo (máx 5000 caracteres)' });
    }

    // Crear nuevo mensaje
    const nuevoMensaje = new Message({
      author: {
        name: author.substring(0, 50),
        userId: req.userId || null
      },
      content: content.substring(0, 5000),
      images: Array.isArray(images) ? images.filter(img => typeof img === 'string') : [],
      videos: Array.isArray(videos) ? videos.filter(vid => typeof vid === 'string') : [],
      parentId: parentId || null
    });

    await nuevoMensaje.save();

    // Si es respuesta, agregar al mensaje padre
    if (parentId) {
      const mensajePadre = await Message.findByIdAndUpdate(
        parentId,
        { $push: { replies: nuevoMensaje._id } },
        { new: true }
      );

      if (!mensajePadre) {
        return res.status(404).json({ error: 'Mensaje padre no encontrado' });
      }
    }

    // Incrementar contador de mensajes del usuario
    if (req.userId) {
      await User.findByIdAndUpdate(
        req.userId,
        { $inc: { 'stats.messageCount': 1 } },
        { new: true }
      );
    }

    console.log(`✓ Mensaje creado: ${nuevoMensaje._id}`);
    res.status(201).json(nuevoMensaje);
  } catch (error) {
    console.error('Error POST /messages:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// === GET - Obtener un mensaje específico ===
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Validar ID de MongoDB
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ error: 'ID inválido' });
    }

    const mensaje = await Message.findById(id)
      .populate('replies')
      .lean()
      .exec();

    if (!mensaje) {
      return res.status(404).json({ error: 'Mensaje no encontrado' });
    }

    res.json(mensaje);
  } catch (error) {
    console.error('Error GET /:id:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// === GET - Obtener respuestas de un mensaje ===
router.get('/:id/replies', async (req, res) => {
  try {
    const { id } = req.params;

    // Validar ID
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ error: 'ID inválido' });
    }

    const replies = await Message.find({ parentId: id })
      .sort({ createdAt: 1 })
      .lean()
      .exec();

    res.json(replies || []);
  } catch (error) {
    console.error('Error GET /:id/replies:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// === PUT - Editar mensaje (solo autor) ===
router.put('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body;

    // Validar ID
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ error: 'ID inválido' });
    }

    // Validar contenido
    if (!content || content.trim().length === 0) {
      return res.status(400).json({ error: 'El contenido no puede estar vacío' });
    }

    if (content.length > 5000) {
      return res.status(400).json({ error: 'El mensaje es muy largo' });
    }

    // Obtener mensaje
    const mensaje = await Message.findById(id);

    if (!mensaje) {
      return res.status(404).json({ error: 'Mensaje no encontrado' });
    }

    // Verificar que sea el autor
    if (!mensaje.author.userId || mensaje.author.userId.toString() !== req.userId) {
      return res.status(403).json({ error: 'No tienes permiso para editar este mensaje' });
    }

    // Actualizar
    mensaje.content = content.substring(0, 5000);
    mensaje.edited = true;
    mensaje.updatedAt = new Date();

    await mensaje.save();

    console.log(`✓ Mensaje editado: ${id}`);
    res.json(mensaje);
  } catch (error) {
    console.error('Error PUT /:id:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// === DELETE - Eliminar mensaje (solo autor) ===
router.delete('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;

    // Validar ID
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ error: 'ID inválido' });
    }

    // Obtener mensaje
    const mensaje = await Message.findById(id);

    if (!mensaje) {
      return res.status(404).json({ error: 'Mensaje no encontrado' });
    }

    // Verificar que sea el autor
    if (!mensaje.author.userId || mensaje.author.userId.toString() !== req.userId) {
      return res.status(403).json({ error: 'No tienes permiso para eliminar este mensaje' });
    }

    // Guardar info antes de eliminar
    const autorId = mensaje.author.userId;
    const mensajePadreId = mensaje.parentId;

    // Eliminar mensaje
    await Message.deleteOne({ _id: id });

    // Decrementar contador de mensajes del usuario
    if (autorId) {
      await User.findByIdAndUpdate(
        autorId,
        { $inc: { 'stats.messageCount': -1 } }
      );
    }

    // Eliminar de las respuestas del mensaje padre
    if (mensajePadreId) {
      await Message.findByIdAndUpdate(
        mensajePadreId,
        { $pull: { replies: id } }
      );
    }

    // Eliminar todas las respuestas de este mensaje
    await Message.deleteMany({ parentId: id });

    console.log(`✓ Mensaje eliminado: ${id}`);
    res.json({ message: 'Mensaje eliminado correctamente' });
  } catch (error) {
    console.error('Error DELETE /:id:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// === POST - Like en un mensaje ===
router.post('/:id/like', async (req, res) => {
  try {
    const { id } = req.params;

    // Validar ID
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ error: 'ID inválido' });
    }

    // Incrementar likes
    const mensaje = await Message.findByIdAndUpdate(
      id,
      { $inc: { likes: 1 } },
      { new: true }
    );

    if (!mensaje) {
      return res.status(404).json({ error: 'Mensaje no encontrado' });
    }

    // Incrementar stats del usuario autor
    if (mensaje.author.userId) {
      await User.findByIdAndUpdate(
        mensaje.author.userId,
        { $inc: { 'stats.likes': 1 } }
      );
    }

    console.log(`✓ Like agregado al mensaje: ${id}`);
    res.json(mensaje);
  } catch (error) {
    console.error('Error POST /:id/like:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// === GET - Obtener mensajes trending ===
router.get('/trending/top', async (req, res) => {
  try {
    const messages = await Message.find({ parentId: null })
      .sort({ likes: -1, createdAt: -1 })
      .limit(50)
      .lean()
      .exec();

    res.json(messages || []);
  } catch (error) {
    console.error('Error GET /trending:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// === GET - Buscar mensajes ===
router.get('/search/:query', async (req, res) => {
  try {
    const { query } = req.params;

    if (!query || query.length < 2) {
      return res.status(400).json({ error: 'Búsqueda muy corta' });
    }

    const messages = await Message.find({
      $or: [
        { content: { $regex: query, $options: 'i' } },
        { 'author.name': { $regex: query, $options: 'i' } }
      ],
      parentId: null
    })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean()
      .exec();

    res.json(messages || []);
  } catch (error) {
    console.error('Error GET /search:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// === GET - Obtener mensajes de un usuario ===
router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    // Validar ID
    if (!userId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ error: 'ID inválido' });
    }

    const messages = await Message.find({
      'author.userId': userId,
      parentId: null
    })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean()
      .exec();

    res.json(messages || []);
  } catch (error) {
    console.error('Error GET /user/:userId:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// === GET - Obtener estadísticas generales ===
router.get('/stats/general', async (req, res) => {
  try {
    const totalMessages = await Message.countDocuments({ parentId: null });
    const totalReplies = await Message.countDocuments({ parentId: { $ne: null } });
    const totalLikes = await Message.aggregate([
      { $group: { _id: null, totalLikes: { $sum: '$likes' } } }
    ]);

    res.json({
      totalMessages,
      totalReplies,
      totalLikes: totalLikes[0]?.totalLikes || 0
    });
  } catch (error) {
    console.error('Error GET /stats:', error.message);
    res.status(500).json({ error: error.message });
  }
});

export default router;
