import express from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import auth from '../middleware/auth.js';

const router = express.Router();

// Registro
router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Todos los campos son requeridos' });
    }

    const usuarioExistente = await User.findOne({
      $or: [{ username }, { email }]
    });

    if (usuarioExistente) {
      return res.status(400).json({ error: 'Usuario o email ya existe' });
    }

    const nuevoUsuario = new User({ username, email, password });
    await nuevoUsuario.save();

    const token = jwt.sign(
      { userId: nuevoUsuario._id },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.status(201).json({
      token,
      user: {
        id: nuevoUsuario._id,
        username: nuevoUsuario.username,
        email: nuevoUsuario.email
      }
    });
  } catch (error) {
    console.error('Error en registro:', error);
    res.status(500).json({ error: error.message });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email y contraseña requeridos' });
    }

    const usuario = await User.findOne({ email });

    if (!usuario) {
      return res.status(400).json({ error: 'Usuario no encontrado' });
    }

    const esValida = await usuario.comparePassword(password);

    if (!esValida) {
      return res.status(400).json({ error: 'Contraseña incorrecta' });
    }

    const token = jwt.sign(
      { userId: usuario._id },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.json({
      token,
      user: {
        id: usuario._id,
        username: usuario.username,
        email: usuario.email
      }
    });
  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({ error: error.message });
  }
});

// Obtener perfil actual
router.get('/profile', auth, async (req, res) => {
  try {
    const usuario = await User.findById(req.userId);
    if (!usuario) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    res.json(usuario);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
