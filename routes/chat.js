const express = require('express')
const router = express.Router()
const Thread = require('../models/Thread')
const getGeminiAPIResponse = require('../utils/openai')
const authMiddleware = require('../middleware/auth')

router.use(authMiddleware)

router.get('/test', async (req, res) => {
  try {
    const newThread = new Thread({
      threadId: `thread-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      userId: req.user.userId,
      title: 'New Chat',
      messages: [
        {
          role: 'user',
          content: 'Hello, how are you?',
          timestamp: Date.now()
        },
        {
          role: 'assistant',
          content: "I'm doing well, thank you for asking! How about you?",
          timestamp: Date.now()
        }
      ]
    })

    await newThread.save()
    res.send('Thread created successfully')
  } catch (error) {
    console.error(error)
    res.status(500).send('data not saved in the server')
  }
})

// Get all threads for authenticated user
router.get('/thread', async (req, res) => {
  try {
    const threads = await Thread.find({ userId: req.user.userId }).sort({ updatedAt: -1 })
    res.json(threads)
  } catch (err) {
    console.log(err)
    res.status(500).json({ error: 'Failed to fetch threads' })
  }
})

// Get a specific thread by threadId
router.get('/thread/:threadId', async (req, res) => {
  const { threadId } = req.params

  try {
    const thread = await Thread.findOne({ threadId, userId: req.user.userId })

    if (!thread) {
      return res.status(404).json({ error: 'Thread not found' })
    }

    res.json(thread.messages)
  } catch (err) {
    console.log(err)
    res.status(500).json({ error: 'Failed to fetch chat' })
  }
})

// delete a thread by threadId
router.delete('/thread/:threadId', async (req, res) => {
  const { threadId } = req.params

  try {
    const deletedThread = await Thread.findOneAndDelete({ threadId, userId: req.user.userId })

    if (!deletedThread) {
      return res.status(404).json({ error: 'Thread not found' })
    }

    res.status(200).json({
      success: 'Thread deleted successfully'
    })
  } catch (err) {
    console.log(err)
    res.status(500).json({ error: 'Failed to delete thread' })
  }
})

router.post('/chat', async (req, res) => {
  const { threadId, message, mode } = req.body || {}

  if (!message || typeof message !== 'string' || message.trim() === '') {
    return res.status(400).json({
      error: 'message is required'
    })
  }

  const resolvedThreadId = threadId || `thread-${Date.now()}-${Math.random().toString(16).slice(2)}`

  const sanitizeAssistantReply = (text) => {
    if (typeof text !== 'string') return text

    return text
      .replace(/(^|\n)#{1,6}\s*/g, '$1')
      .replace(/\$\$([\s\S]*?)\$\$/g, '$1')
      .replace(/\$([^$\n]+)\$/g, '$1')
      .replace(/\\\(([^)]+)\\\)/g, '$1')
      .replace(/\\\[([^\]]+)\\\]/g, '$1')
      .replace(/\\begin\{[^}]+\}|\\end\{[^}]+\}/g, '')
      .replace(/\\left|\\right/g, '')
      .replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '($1)/($2)')
      .replace(/\\sqrt\{([^}]+)\}/g, 'sqrt($1)')
      .replace(/\\cdot/g, '*')
      .replace(/\\(sin|cos|tan|csc|sec|cot|log|ln|exp|arcsin|arccos|arctan)\b/g, '$1')
      .replace(/```[\s\S]*?```/g, '')
      .replace(/`([^`]+)`/g, '$1')
      .replace(/\{\s*([^}]+)\s*\}/g, '$1')
      .replace(/\n{3,}/g, '\n\n')
      .replace(/[\u200B-\u200D\uFEFF]/g, '')
      .trim()
  }

  try {
    let thread = await Thread.findOne({ threadId: resolvedThreadId, userId: req.user.userId })

    if (!thread) {
      thread = new Thread({
        threadId: resolvedThreadId,
        userId: req.user.userId,
        title: message,
        messages: [
          {
            role: 'user',
            content: message,
            timestamp: Date.now()
          }
        ]
      })
    } else {
      thread.messages.push({
        role: 'user',
        content: message,
        timestamp: Date.now()
      })
    }

    const assistantReply = await getGeminiAPIResponse(message, mode)
    const sanitizedReply = sanitizeAssistantReply(assistantReply)
    thread.messages.push({
      role: 'assistant',
      content: sanitizedReply,
      timestamp: Date.now()
    })

    thread.updatedAt = new Date()
    await thread.save()

    res.json({
      thread
    })
  } catch (err) {
    console.error('Chat error:', err.message)
    res.status(500).json({
      error: err.message || 'something went wrong'
    })
  }
})

module.exports = router
