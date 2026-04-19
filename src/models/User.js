import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    unique: true,
    sparse: true,
    trim: true,
    minlength: 3,
    maxlength: 30
  },
  email: {
    type: String,
    unique: true,
    sparse: true,
    trim: true,
    lowercase: true,
    required: function() { return !!this.password; }
  },
  password: {
    type: String,
    minlength: 6
  },
  avatar: {
    type: String,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

// Hash de contraseña antes de guardar
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

// No incluir password en respuestas
userSchema.methods.toJSON = function() {
  const { password, ...rest } = this.toObject();
  return rest;
};

export default mongoose.model('User', userSchema);
