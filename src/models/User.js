import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    unique: true,
    sparse: true,
    trim: true,
    minlength: 3,
    maxlength: 30,
    required: true
  },
  email: {
    type: String,
    unique: true,
    sparse: true,
    trim: true,
    lowercase: true,
    required: true
  },
  password: {
    type: String,
    minlength: 6,
    required: true
  },
  // === PERFIL PERSONALIZADO ===
  profile: {
    bio: {
      type: String,
      maxlength: 500,
      default: ''
    },
    avatar: {
      type: String,
      default: null
    },
    banner: {
      type: String,
      default: null
    },
    location: {
      type: String,
      maxlength: 100,
      default: ''
    },
    website: {
      type: String,
      default: null
    },
    color: {
      type: String,
      enum: ['blue', 'purple', 'pink', 'green', 'orange', 'red'],
      default: 'blue'
    },
    theme: {
      type: String,
      enum: ['light', 'dark'],
      default: 'light'
    }
  },
  // === ESTADÍSTICAS ===
  stats: {
    messageCount: { type: Number, default: 0 },
    likes: { type: Number, default: 0 },
    followers: { type: Number, default: 0 },
    joinDate: { type: Date, default: Date.now }
  },
  // === BADGES ===
  badges: [{
    name: String,
    icon: String,
    earnedAt: Date
  }],
  // === PREFERENCIAS ===
  preferences: {
    notifications: { type: Boolean, default: true },
    darkMode: { type: Boolean, default: false },
    public: { type: Boolean, default: true }
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

// Hash de contraseña
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Comparar contraseña
userSchema.methods.comparePassword = async function(passwordIngresada) {
  return await bcrypt.compare(passwordIngresada, this.password);
};

// Excluir password en respuestas
userSchema.methods.toJSON = function() {
  const { password, ...rest } = this.toObject();
  return rest;
};

export default mongoose.model('User', userSchema);
