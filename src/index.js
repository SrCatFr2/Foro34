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

// === VARIABLE GLOBAL ===
let isMongoConnected = false;

// === FUNCIÓN PARA CONECTAR MONGODB ===
async function initializeMongo() {
  if (isMongoConnected) {
    return;
  }

  if (!process.env.MONGODB_URI) {
    console.error('FATAL: MONGODB_URI no está configurado');
    throw new Error('MONGODB_URI no definido');
  }

  try {
    console.log('Conectando a MongoDB...');
    
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 10000,
      connectTimeoutMS: 10000,
      socketTimeoutMS: 10000,
      retryWrites: true,
      w: 'majority'
    });

    isMongoConnected = true;
    console.log('✓ MongoDB CONECTADO');
  } catch (error) {
    isMongoConnected = false;
    console.error('✗ MongoDB FALLÓ:', error.message);
    throw error;
  }
}

// === MIDDLEWARE: VERIFICAR CONEXIÓN EN CADA REQUEST ===
app.use(async (req, res, next) => {
  try {
    if (!isMongoConnected) {
      console.log('Intento de reconexión a MongoDB...');
      await initializeMongo();
    }
    next();
  } catch (error) {
    console.error('Error de conexión:', error.message);
    return res.status(503).json({
      error: 'Servidor no disponible - Conexión MongoDB fallida'
    });
  }
});

// === RUTAS API ===
import messagesRouter from './routes/messages.js';
import authRouter from './routes/auth.js';
import uploadRouter from './routes/upload.js';

app.use('/api/messages', messagesRouter);
app.use('/api/auth', authRouter);
app.use('/api/upload', uploadRouter);

// Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    mongodb: isMongoConnected ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString()
  });
});

// Test
app.get('/api/test', (req, res) => {
  res.json({ message: 'API funcionando', mongodb: isMongoConnected });
});

// SPA Fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Error Handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: err.message });
});

// === INICIALIZAR AL STARTUP ===
initializeMongo().catch(err => {
  console.error('Startup error:', err.message);
});

export default app;
