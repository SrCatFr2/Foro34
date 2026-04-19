import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema(
  {
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
      },
      avatar: {
        type: String,
        default: null
      }
    },
    content: {
      type: String,
      required: true,
      trim: true,
      maxlength: 5000
    },
    images: [
      {
        type: String
      }
    ],
    videos: [
      {
        type: String
      }
    ],
    parentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message',
      default: null
    },
    replies: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Message'
      }
    ],
    likes: {
      type: Number,
      default: 0,
      min: 0
    },
    edited: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
);

messageSchema.index({ createdAt: -1 });
messageSchema.index({ parentId: 1 });
messageSchema.index({ "author.userId": 1 });

export default mongoose.models.Message || mongoose.model("Message", messageSchema);
