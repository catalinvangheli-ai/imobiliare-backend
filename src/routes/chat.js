import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { Conversation, Message } from '../models/Chat.js';

const router = express.Router();

// Get all conversations
router.get('/conversations', authenticate, async (req, res) => {
  try {
    const conversations = await Conversation.find({
      participants: req.userId
    })
      .populate('participants', 'name')
      .populate('property', 'title')
      .sort({ lastMessage: -1 });

    res.json(conversations);
  } catch (error) {
    res.status(500).json({ message: 'Eroare', error: error.message });
  }
});

// Create conversation
router.post('/conversations', authenticate, async (req, res) => {
  try {
    const { propertyId, sellerId } = req.body;

    // Check if conversation already exists
    let conversation = await Conversation.findOne({
      participants: { $all: [req.userId, sellerId] },
      property: propertyId
    });

    if (conversation) {
      return res.json(conversation);
    }

    conversation = new Conversation({
      participants: [req.userId, sellerId],
      property: propertyId
    });

    await conversation.save();
    res.status(201).json(conversation);
  } catch (error) {
    res.status(500).json({ message: 'Eroare', error: error.message });
  }
});

// Get messages
router.get('/messages/:conversationId', authenticate, async (req, res) => {
  try {
    const messages = await Message.find({
      conversationId: req.params.conversationId
    })
      .populate('sender', 'name')
      .sort({ createdAt: 1 });

    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: 'Eroare', error: error.message });
  }
});

// Send message
router.post('/messages', authenticate, async (req, res) => {
  try {
    const { conversationId, message } = req.body;

    const newMessage = new Message({
      conversationId,
      sender: req.userId,
      message
    });

    await newMessage.save();
    await newMessage.populate('sender', 'name');

    // Update conversation last message
    await Conversation.findByIdAndUpdate(conversationId, {
      lastMessage: Date.now()
    });

    res.status(201).json(newMessage);
  } catch (error) {
    res.status(500).json({ message: 'Eroare', error: error.message });
  }
});

export default router;
