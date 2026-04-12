import { useState, useEffect } from 'react'
import { X, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { useQueryClient } from '@tanstack/react-query'
import { api } from '../../lib/api.js'

/**
 * ProductFormModal — create / edit a product.
 *
 * Props:
 *   product       → existing product object, or null for "create new"
 *   categories    → full category list (for the dropdown)
 *   onClose()     → close the modal
 *
 * Handles:
 *   - Name, slug (auto-generated from name if empty)
 *   - Category selector
 *   - Price, stock, featured checkbox
 *   - Image URL (live preview)
 *   - Icon type selector
 *   - Editable list of [label, value] spec tuples
 *   - Comma-separated compatibleWith devices
 *   - Description textarea
 */
export default function ProductFormModal({ product, categories = [], onClose }) {
  const qc = useQueryClient()
  const isEdit = !!product

  const [form, setForm] = useState(() => ({
    name: product?.name || '',
    slug: product?.slug || '',
    description: product?.description || '',
    price: product?.price ?? 0,
    stock: product?.stock ?? 100,
    featured: product?.featured || false,
    icon_type: product?.icon_type || 'smartphone',
    image_url: product?.image_url || '',
    category: product?.category_id || product?.category || categories[0]?._id || categories[0]?.id || '',
    specs: product?.specs || [['', '']],
    compatibleWith: (product?.compatibleWith || []).join(', '),
  }))

  const [submitting, setSubmitting] = useState(false)

  // Auto-generate a slug from the name if the slug field is empty
  useEffect(() => {
    if (!isEdit && !form.slug && form.name) {
      const autoSlug = form.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
      setForm((f) => ({ ...f, slug: autoSlug }))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.name])

  function updateSpec(idx, key, value) {
    const next = [...form.specs]
    next[idx] = key === 'label' ? [value, next[idx][1] || ''] : [next[idx][0] || '', value]
    setForm({ ...form, specs: next })
  }

  function addSpec() {
    setForm({ ...form, specs: [...form.specs, ['', '']] })
  }

  function removeSpec(idx) {
    setForm({ ...form, specs: form.specs.filter((_, i) => i !== idx) })
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSubmitting(true)

    const payload = {
      ...form,
      price: Number(form.price),
      stock: Number(form.stock),
      // Drop empty spec rows
      specs: form.specs.filter(([l, v]) => l && v),
      compatibleWith: form.compatibleWith
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    }

    try {
      if (isEdit) {
        await api.adminUpdateProduct(product.id || product._id, payload)
        toast.success('Product updated')
      } else {
        await api.adminCreateProduct(payload)
        toast.success('Product created')
      }
      qc.invalidateQueries({ queryKey: ['admin-products'] })
      qc.invalidateQueries({ queryKey: ['products'] })
      onClose()
    } catch (err) {
      toast.error(err.message || 'Could not save product')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 bg-black/40 flex items-start md:items-center justify-center p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl rounded-3xl bg-white shadow-xl my-8"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'hsl(var(--border))' }}>
          <h2 className="text-xl font-serif-display">{isEdit ? 'Edit product' : 'New product'}</h2>
          <button onClick={onClose} aria-label="Close" className="p-1 hover:opacity-70">
            <X size={18} />
          </button>
        </header>

        <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} required />
            <Field label="Slug" value={form.slug} onChange={(v) => setForm({ ...form, slug: v })} required />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <Field label="Price (₹)" type="number" value={form.price} onChange={(v) => setForm({ ...form, price: v })} required />
            <Field label="Stock" type="number" value={form.stock} onChange={(v) => setForm({ ...form, stock: v })} required />
            <Select
              label="Category"
              value={form.category}
              onChange={(v) => setForm({ ...form, category: v })}
              options={categories.map((c) => ({ label: c.name, value: c._id || c.id }))}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Icon"
              value={form.icon_type}
              onChange={(v) => setForm({ ...form, icon_type: v })}
              options={[
                { label: 'Smartphone', value: 'smartphone' },
                { label: 'Accessory', value: 'accessory' },
                { label: 'Wearable', value: 'wearable' },
                { label: 'Tablet', value: 'tablet' },
                { label: 'Charger', value: 'charger' },
              ]}
            />
            <label className="flex items-end gap-3 text-xs uppercase tracking-[0.2em]">
              <input
                type="checkbox"
                checked={form.featured}
                onChange={(e) => setForm({ ...form, featured: e.target.checked })}
              />
              Featured
            </label>
          </div>

          <Field
            label="Image URL"
            value={form.image_url}
            onChange={(v) => setForm({ ...form, image_url: v })}
            placeholder="https://…"
          />
          {form.image_url && (
            <img
              src={form.image_url}
              alt="preview"
              className="h-32 w-32 object-cover rounded-xl border"
              style={{ borderColor: 'hsl(var(--border))' }}
              onError={(e) => (e.target.style.display = 'none')}
            />
          )}

          <div>
            <label className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={3}
              className="mt-2 w-full rounded-xl border bg-white px-4 py-3 text-sm"
              style={{ borderColor: 'hsl(var(--border))' }}
            />
          </div>

          <Field
            label="Compatible with (comma-separated)"
            value={form.compatibleWith}
            onChange={(v) => setForm({ ...form, compatibleWith: v })}
            placeholder="iPhone 15, Pixel 8, Galaxy S24"
          />

          {/* Specs editor */}
          <div>
            <div className="flex items-center justify-between">
              <label className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Specs</label>
              <button
                type="button"
                onClick={addSpec}
                className="text-xs flex items-center gap-1 underline"
              >
                <Plus size={12} /> Add row
              </button>
            </div>
            <div className="mt-2 space-y-2">
              {form.specs.map(([label, value], idx) => (
                <div key={idx} className="grid grid-cols-[1fr_1.5fr_auto] gap-2">
                  <input
                    value={label}
                    onChange={(e) => updateSpec(idx, 'label', e.target.value)}
                    placeholder="Label"
                    className="rounded-lg border bg-white px-3 py-2 text-sm"
                    style={{ borderColor: 'hsl(var(--border))' }}
                  />
                  <input
                    value={value}
                    onChange={(e) => updateSpec(idx, 'value', e.target.value)}
                    placeholder="Value"
                    className="rounded-lg border bg-white px-3 py-2 text-sm"
                    style={{ borderColor: 'hsl(var(--border))' }}
                  />
                  <button
                    type="button"
                    onClick={() => removeSpec(idx)}
                    className="p-2 text-muted-foreground hover:text-red-500"
                    aria-label="Remove spec"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-4 border-t" style={{ borderColor: 'hsl(var(--border))' }}>
            <button type="button" onClick={onClose} className="btn-secondary flex-1">
              Cancel
            </button>
            <button type="submit" disabled={submitting} className="btn-primary flex-1">
              {submitting ? 'Saving…' : isEdit ? 'Save changes' : 'Create product'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function Field({ label, value, onChange, type = 'text', ...rest }) {
  return (
    <label className="text-xs uppercase tracking-[0.2em] text-muted-foreground block">
      {label}
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-2 w-full rounded-xl border bg-white px-4 py-3 text-sm normal-case tracking-normal text-foreground"
        style={{ borderColor: 'hsl(var(--border))' }}
        {...rest}
      />
    </label>
  )
}

function Select({ label, value, onChange, options }) {
  return (
    <label className="text-xs uppercase tracking-[0.2em] text-muted-foreground block">
      {label}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-2 w-full rounded-xl border bg-white px-4 py-3 text-sm normal-case tracking-normal text-foreground"
        style={{ borderColor: 'hsl(var(--border))' }}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  )
}
