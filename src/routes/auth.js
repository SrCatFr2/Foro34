import express from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import auth from '../middleware/auth.js';

const router = express.Router();

// === REGISTRO ===
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

    const nuevoUsuario = new User({
      username,
      email,
      password,
      profile: {
        avatar: `https://ui-avatars.com/api/?name=${username}&background=667eea&color=fff`,
        color: ['blue', 'purple', 'pink', 'green', 'orange', 'red'][Math.floor(Math.random() * 6)]
      }
    });

    await nuevoUsuario.save();

    const token = jwt.sign(
      { userId: nuevoUsuario._id },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.status(201).json({
      token,
      user: nuevoUsuario.toJSON()
    });
  } catch (error) {
    console.error('Error en registro:', error);
    res.status(500).json({ error: error.message });
  }
});

// === LOGIN ===
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
      user: usuario.toJSON()
    });
  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({ error: error.message });
  }
});

// === OBTENER PERFIL ACTUAL ===
router.get('/profile', auth, async (req, res) => {
  try {
    const usuario = await User.findById(req.userId);
    if (!usuario) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    res.json(usuario.toJSON());
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// === OBTENER PERFIL PÚBLICO DE OTRO USUARIO ===
router.get('/user/:userId', async (req, res) => {
  try {
    const usuario = await User.findById(req.params.userId);
    
    if (!usuario) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    if (!usuario.preferences.public) {
      return res.status(403).json({ error: 'Perfil privado' });
    }

    res.json(usuario.toJSON());
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// === ACTUALIZAR PERFIL ===
router.put('/profile', auth, async (req, res) => {
  try {
    const { bio, location, website, color, avatar, banner } = req.body;

    const usuario = await User.findById(req.userId);

    if (!usuario) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    if (bio !== undefined) usuario.profile.bio = bio.substring(0, 500);
    if (location !== undefined) usuario.profile.location = location.substring(0, 100);
    if (website !== undefined) usuario.profile.website = website;
    if (color && ['blue', 'purple', 'pink', 'green', 'orange', 'red'].includes(color)) {
      usuario.profile.color = color;
    }
    if (avatar) usuario.profile.avatar = avatar;
    if (banner) usuario.profile.banner = banner;

    await usuario.save();

    res.json(usuario.toJSON());
  } catch (error) {
    console.error('Error actualizando perfil:', error);
    res.status(500).json({ error: error.message });
  }
});

// === CAMBIAR CONTRASEÑA ===
router.post('/change-password', auth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Todos los campos requeridos' });
    }

    const usuario = await User.findById(req.userId);

    const esValida = await usuario.comparePassword(currentPassword);

    if (!esValida) {
      return res.status(400).json({ error: 'Contraseña actual incorrecta' });
    }

    usuario.password = newPassword;
    await usuario.save();

    res.json({ message: 'Contraseña actualizada' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// === OBTENER ESTADÍSTICAS DEL USUARIO ===
router.get('/stats/:userId', async (req, res) => {
  try {
    const usuario = await User.findById(req.params.userId);

    if (!usuario) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    res.json(usuario.stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
