import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
  author: {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 50
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    }
  },
  content: {
    type: String,
    required: true,
    trim: true,
    maxlength: 5000
  },
  images: [{
    type: String,
    validate: {
      validator: function(url) {
        return /^https?:\/\/.+/.test(url);
      },
      message: 'URL de imagen inválida'
    }
  }],
  videos: [{
    type: String,
    validate: {
      validator: function(url) {
        return /^https?:\/\/.+/.test(url);
      },
      message: 'URL de video inválida'
    }
  }],
  parentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message',
    default: null
  },
  replies: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message'
  }],
  likes: {
    type: Number,
    default: 0,
    min: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  edited: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

// Indexar para mejor rendimiento
messageSchema.index({ createdAt: -1 });
messageSchema.index({ parentId: 1 });
messageSchema.index({ 'author.userId': 1 });

export default mongoose.model('Message', messageSchema);
