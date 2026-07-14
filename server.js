require('dotenv').config()
const express = require('express')
const cors = require('cors')
const cookieParser = require('cookie-parser')
const mongoose = require('mongoose')
const chatRoutes = require('./routes/chat')
const authRoutes = require('./routes/auth')

const app = express()

app.use(
  cors({
    origin: process.env.FRONTEND_ORIGIN || 'http://localhost:5173',
    credentials: true
  })
)
app.use(cookieParser())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({ error: 'Invalid JSON in request body' })
  }
  next(err)
})

const connectdb = async () => {
  try {
    await mongoose.connect(process.env.MongoDB_URI)
    console.log('Connected to MongoDB')
  } catch (err) {
    console.error('MongoDB connection failed:', err)
  }
}

connectdb()

app.use('/api', authRoutes)
app.use('/api', chatRoutes)

app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' })
})

const port = process.env.PORT || 3000
app.listen(port, () => {
  console.log(`Server running on port ${port}`)
})

