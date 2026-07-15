const express = require('express')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const User = require('../models/User')

const router = express.Router()

const JWT_SECRET = process.env.JWT_SECRET || 'default_jwt_secret'
const TOKEN_EXPIRES_IN = '7d'

const authMiddleware = async (req, res, next) => {
  try {
    const token = req.cookies?.token

    if (!token) {
      return res.status(401).json({ error: 'Authentication required' })
    }

    const payload = jwt.verify(token, JWT_SECRET)
    req.user = payload
    next()
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' })
  }
}

router.post('/register', async (req, res) => {
  console.log('===== REGISTER REQUEST =====')
  console.log(req.body)

  const { email, password } = req.body || {}

  if (!email || !password) {
    return res.status(400).json({
      error: 'Email and password are required'
    })
  }

  try {
    const existingUser = await User.findOne({ email })

    if (existingUser) {
      return res.status(409).json({
        error: 'Email is already registered'
      })
    }

    const hashedPassword = await bcrypt.hash(password, 10)

    const user = new User({
      email,
      password: hashedPassword
    })

    await user.save()

    const token = jwt.sign(
      {
        userId: user._id,
        email: user.email
      },
      JWT_SECRET,
      {
        expiresIn: TOKEN_EXPIRES_IN
      }
    )

    res.cookie('token', token, {
      httpOnly: true,
      secure: false, // change to true only after enabling HTTPS
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000
    })

    res.json({
      user: {
        email: user.email
      }
    })
  } catch (err) {
    console.error('REGISTER ERROR')
    console.error(err)

    return res.status(500).json({
      error: err.message,
      stack: err.stack
    })
  }
})

router.post('/login', async (req, res) => {
  console.log('===== LOGIN REQUEST =====')
  console.log(req.body)

  const { email, password } = req.body || {}

  if (!email || !password) {
    return res.status(400).json({
      error: 'Email and password are required'
    })
  }

  try {
    const user = await User.findOne({ email })

    console.log('User found:', user)

    if (!user) {
      return res.status(401).json({
        error: 'Invalid credentials'
      })
    }

    const passwordMatch = await bcrypt.compare(password, user.password)

    console.log('Password Match:', passwordMatch)

    if (!passwordMatch) {
      return res.status(401).json({
        error: 'Invalid credentials'
      })
    }

    const token = jwt.sign(
      {
        userId: user._id,
        email: user.email
      },
      JWT_SECRET,
      {
        expiresIn: TOKEN_EXPIRES_IN
      }
    )

    res.cookie('token', token, {
      httpOnly: true,
      secure: false, // change to true only after enabling HTTPS
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000
    })

    res.json({
      user: {
        email: user.email
      }
    })
  } catch (err) {
    console.error('LOGIN ERROR')
    console.error(err)

    return res.status(500).json({
      error: err.message,
      stack: err.stack
    })
  }
})

router.post('/logout', authMiddleware, async (req, res) => {
  res.clearCookie('token')

  res.json({
    success: true
  })
})

router.get('/me', authMiddleware, async (req, res) => {
  res.json({
    user: {
      email: req.user.email
    }
  })
})

module.exports = router