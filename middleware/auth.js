const jwt = require('jsonwebtoken')

const JWT_SECRET = process.env.JWT_SECRET || 'default_jwt_secret'

const authMiddleware = (req, res, next) => {
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

module.exports = authMiddleware
