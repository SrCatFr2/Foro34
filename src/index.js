import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Servir archivos estáticos
app.use(express.static(path.join(__dirname, '../public')));

// === VARIABLE GLOBAL DE CONEXIÓN ===
let mongoConnected = false;

// === FUNCIÓN PARA CONECTAR MONGODB ===
async function connectMongo() {
  if (mongoConnected) {
    console.log('MongoDB ya está conectado');
    return;
  }

  if (!process.env.MONGODB_URI) {
    console.error('ERROR: MONGODB_URI no está definido');
    return;
  }

  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 60000,
      connectTimeoutMS: 60000,
      socketTimeoutMS: 60000,
      maxPoolSize: 10,
      minPoolSize: 2,
      retryWrites: true,
      w: 'majority',
      family: 4
    });

    mongoConnected = true;
    console.log('✓ MongoDB conectado exitosamente');
  } catch (error) {
    mongoConnected = false;
    console.error('✗ Error conectando MongoDB:', error.message);
    throw error;
  }
}

// === CONECTAR AL INICIAR ===
connectMongo().catch(err => {
  console.error('Fallo inicial de conexión MongoDB:', err.message);
});

// === MIDDLEWARE PARA RECONECTAR SI ES NECESARIO ===
app.use(async (req, res, next) => {
  if (!mongoConnected) {
    console.log('Reconectando a MongoDB...');
    try {
      await connectMongo();
    } catch (error) {
      console.error('Error en reconexión:', error.message);
      return res.status(503).json({ 
        error: 'Servidor no disponible - Error de base de datos',
        message: error.message 
      });
    }
  }
  next();
});

// === IMPORTAR RUTAS ===
import messagesRouter from './routes/messages.js';
import authRouter from './routes/auth.js';
import uploadRouter from './routes/upload.js';

// === RUTAS API ===
app.use('/api/messages', messagesRouter);
app.use('/api/auth', authRouter);
app.use('/api/upload', uploadRouter);

// === RUTA DE HEALTH CHECK ===
app.get('/api/health', async (req, res) => {
  try {
    if (!mongoConnected) {
      await connectMongo();
    }
    
    res.json({ 
      status: 'ok',
      mongodb: mongoConnected ? 'connected' : 'connecting',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(503).json({ 
      status: 'error',
      mongodb: 'disconnected',
      error: error.message
    });
  }
});

// === RUTA DE TEST ===
app.get('/api/test', (req, res) => {
  res.json({ 
    message: 'API funcionando correctamente',
    mongodb: mongoConnected ? 'connected' : 'not connected'
  });
});

// === SPA FALLBACK ===
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// === ERROR HANDLER ===
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ 
    error: err.message || 'Error interno del servidor',
    timestamp: new Date().toISOString()
  });
});

// === EXPORTAR PARA VERCEL ===
export default app;
