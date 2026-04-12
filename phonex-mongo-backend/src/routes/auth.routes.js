import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { User } from '../models/index.js'
import { signToken, requireAuth } from '../middleware/auth.js'

const router = Router()

function publicUser(u) {
  return {
    id: u._id,
    email: u.email,
    fullName: u.fullName,
    role: u.role,
    addresses: u.addresses || [],
  }
}

// POST /api/auth/register
router.post('/register', async (req, res, next) => {
  try {
    const { email, password, fullName } = req.body || {}
    if (!email || !password || password.length < 6) {
      return res.status(400).json({ error: 'Email and a 6+ char password are required' })
    }
    const existing = await User.findOne({ email: email.toLowerCase() })
    if (existing) return res.status(409).json({ error: 'Email already registered' })

    const passwordHash = await bcrypt.hash(password, 10)
    const user = await User.create({
      email: email.toLowerCase(),
      passwordHash,
      fullName: fullName || '',
    })
    const token = signToken(user)
    res.json({ token, user: publicUser(user) })
  } catch (err) {
    next(err)
  }
})

// POST /api/auth/login
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body || {}
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' })
    const user = await User.findOne({ email: email.toLowerCase() })
    if (!user) return res.status(401).json({ error: 'Invalid credentials' })
    const ok = await bcrypt.compare(password, user.passwordHash)
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' })
    const token = signToken(user)
    res.json({ token, user: publicUser(user) })
  } catch (err) {
    next(err)
  }
})

// GET /api/auth/me
router.get('/me', requireAuth, (req, res) => {
  res.json({ user: publicUser(req.user) })
})

// PATCH /api/auth/me — update profile
router.patch('/me', requireAuth, async (req, res, next) => {
  try {
    const { fullName } = req.body || {}
    if (typeof fullName === 'string') req.user.fullName = fullName
    await req.user.save()
    res.json({ user: publicUser(req.user) })
  } catch (err) {
    next(err)
  }
})

// POST /api/auth/addresses
router.post('/addresses', requireAuth, async (req, res, next) => {
  try {
    req.user.addresses.push(req.body)
    await req.user.save()
    res.json({ addresses: req.user.addresses })
  } catch (err) {
    next(err)
  }
})

// DELETE /api/auth/addresses/:id
router.delete('/addresses/:id', requireAuth, async (req, res, next) => {
  try {
    req.user.addresses = req.user.addresses.filter(
      (a) => a._id.toString() !== req.params.id
    )
    await req.user.save()
    res.json({ addresses: req.user.addresses })
  } catch (err) {
    next(err)
  }
})

export default router
