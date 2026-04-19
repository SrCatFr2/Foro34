const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  author: {
    name: { type: String, required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  },
  content: { type: String, required: true },
  images: [{ type: String }], // URLs de Cloudinary
  videos: [{ type: String }], // URLs de Cloudinary
  parentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Message' }, // Para respuestas
  replies: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Message' }],
  likes: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  edited: { type: Boolean, default: false }
});

module.exports = mongoose.model('Message', messageSchema);
