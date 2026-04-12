import { Router } from 'express'
import { Category } from '../models/index.js'

const router = Router()

// GET /api/categories
router.get('/', async (_req, res, next) => {
  try {
    const categories = await Category.find().sort({ sort_order: 1 })
    res.json(categories.map(serialize))
  } catch (err) {
    next(err)
  }
})

// GET /api/categories/:slug
router.get('/:slug', async (req, res, next) => {
  try {
    const cat = await Category.findOne({ slug: req.params.slug })
    if (!cat) return res.status(404).json({ error: 'Category not found' })
    res.json(serialize(cat))
  } catch (err) {
    next(err)
  }
})

function serialize(c) {
  return {
    id: c._id,
    name: c.name,
    slug: c.slug,
    description: c.description,
    icon_type: c.icon_type,
    tint_color: c.tint_color,
    sort_order: c.sort_order,
  }
}

export default router
