// Footer.jsx
import { Link } from 'react-router-dom'

const LINKS = {
  Shop: [
    { label: 'All Products', to: '/category' },
    { label: 'Smartphones', to: '/category/smartphones' },
    { label: 'Accessories', to: '/category/accessories' },
    { label: 'Wearables', to: '/category/wearables' },
    { label: 'Tablets', to: '/category/tablets' },
  ],
  Company: [
    { label: 'About', to: '/about' },
    { label: 'Journal', to: '/journal' },
    { label: 'Careers', to: '/careers' },
    { label: 'Press', to: '/press' },
  ],
  Support: [
    { label: 'Help Centre', to: '/help' },
    { label: 'Shipping', to: '/shipping' },
    { label: 'Returns', to: '/returns' },
    { label: 'Warranty', to: '/warranty' },
    { label: 'Contact', to: '/contact' },
  ],
}

export default function Footer() {
  return (
    <footer
      className="mt-24"
      style={{ borderTop: '0.5px solid hsl(var(--border))' }}
    >
      <div className="max-w-7xl mx-auto px-6 pt-16 pb-10">
        {/* Top grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-10 md:gap-8">
          {/* Brand column */}
          <div className="col-span-2 md:col-span-1">
            <span className="font-serif-display text-sm tracking-[0.35em]">P H O N E X</span>
            <p
              className="mt-4 text-xs leading-relaxed font-body"
              style={{ color: 'hsl(var(--muted-foreground))' }}
            >
              Premium technology for Indian users.{' '}
              <em className="font-serif-display not-italic italic">
                Pan-India delivery, local support, competitive pricing.
              </em>
            </p>

            {/* Newsletter hint */}
            <div
              className="mt-6 flex"
              style={{ borderTop: '0.5px solid hsl(var(--border))', paddingTop: '1.25rem' }}
            >
              <input
                type="email"
                placeholder="your@email.com"
                className="input-field text-xs flex-1"
                style={{ borderRight: 'none', padding: '0.5rem 0.75rem' }}
              />
              <button className="btn-primary text-[10px] px-4 py-0 tracking-widest shrink-0">
                Join
              </button>
            </div>
          </div>

          {/* Link columns */}
          {Object.entries(LINKS).map(([heading, links]) => (
            <div key={heading}>
              <h4
                className="text-[10px] font-medium uppercase tracking-[0.2em] mb-4"
                style={{ color: 'hsl(var(--muted-foreground))' }}
              >
                {heading}
              </h4>
              <ul className="flex flex-col gap-2.5">
                {links.map(link => (
                  <li key={link.label}>
                    <Link
                      to={link.to}
                      className="text-xs font-body hover:opacity-100 transition-opacity"
                      style={{ color: 'hsl(var(--muted-foreground))', opacity: 0.8 }}
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div
          className="mt-12 pt-6 flex flex-col md:flex-row items-center justify-between gap-3"
          style={{ borderTop: '0.5px solid hsl(var(--border))' }}
        >
          <p
            className="text-[10px] tracking-wide font-body"
            style={{ color: 'hsl(var(--muted-foreground))' }}
          >
            © {new Date().getFullYear()} PHONEX INDIA. All rights reserved.
          </p>
          <div className="flex items-center gap-5">
            {['Privacy', 'Terms', 'Cookies'].map(item => (
              <Link
                key={item}
                to={`/${item.toLowerCase()}`}
                className="text-[10px] tracking-wide font-body hover:opacity-100 transition-opacity"
                style={{ color: 'hsl(var(--muted-foreground))', opacity: 0.7 }}
              >
                {item}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  )
}
