const express = require('express')
const authMiddleware = require('../middleware/auth')

const router = express.Router()

router.use(authMiddleware)

router.post('/voice', async (req, res) => {
  return res.status(501).json({
    error: 'Voice synthesis is handled in the browser using the Web Speech API. The backend voice endpoint is disabled.'
  })
})

module.exports = router
