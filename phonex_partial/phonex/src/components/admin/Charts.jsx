/**
 * Tiny hand-rolled SVG chart primitives used on the admin dashboard.
 * Zero dependencies, match the project's neutral design system.
 *
 * - <LineChart>   30-day revenue trend
 * - <DonutChart>  order-status breakdown
 * - <BarChart>    top-selling products (horizontal bars)
 * - <Sparkline>   small inline trend line
 */

// ─── LineChart ────────────────────────────────────────────
export function LineChart({ data = [], height = 200, accent = '#c9a55a' }) {
  if (!data.length) {
    return <EmptyChart height={height} label="No revenue data yet" />
  }
  const width = 600
  const padding = { top: 20, right: 20, bottom: 30, left: 50 }
  const chartW = width - padding.left - padding.right
  const chartH = height - padding.top - padding.bottom

  const maxY = Math.max(...data.map((d) => d.revenue), 1)
  const xStep = data.length > 1 ? chartW / (data.length - 1) : chartW

  const points = data.map((d, i) => {
    const x = padding.left + i * xStep
    const y = padding.top + chartH - (d.revenue / maxY) * chartH
    return { x, y, d }
  })

  const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
  const area = `${path} L ${points[points.length - 1].x} ${padding.top + chartH} L ${points[0].x} ${padding.top + chartH} Z`

  // 4 y-axis gridlines
  const gridLines = [0.25, 0.5, 0.75, 1].map((frac) => ({
    y: padding.top + chartH - frac * chartH,
    value: Math.round(maxY * frac),
  }))

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full">
      {/* gridlines */}
      {gridLines.map((g, i) => (
        <g key={i}>
          <line
            x1={padding.left}
            x2={width - padding.right}
            y1={g.y}
            y2={g.y}
            stroke="hsl(var(--border))"
            strokeDasharray="2 3"
          />
          <text
            x={padding.left - 6}
            y={g.y + 3}
            fontSize="9"
            textAnchor="end"
            fill="hsl(var(--muted-foreground))"
          >
            ₹{formatShort(g.value)}
          </text>
        </g>
      ))}

      {/* area fill */}
      <path d={area} fill={accent} opacity="0.15" />
      {/* line */}
      <path d={path} fill="none" stroke={accent} strokeWidth="2" strokeLinecap="round" />
      {/* dots */}
      {points.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="3" fill={accent} />
      ))}

      {/* x-axis labels (first, middle, last) */}
      {[0, Math.floor(points.length / 2), points.length - 1].map((i) => (
        <text
          key={i}
          x={points[i].x}
          y={height - 8}
          fontSize="9"
          textAnchor="middle"
          fill="hsl(var(--muted-foreground))"
        >
          {shortDate(points[i].d._id)}
        </text>
      ))}
    </svg>
  )
}

// ─── DonutChart ───────────────────────────────────────────
const STATUS_COLORS = {
  pending: '#d4a574',
  paid: '#7eb3d6',
  shipped: '#a4c97a',
  delivered: '#5a9a5a',
  cancelled: '#c97a7a',
}

export function DonutChart({ data = {}, size = 180 }) {
  const entries = Object.entries(data).filter(([, v]) => v > 0)
  const total = entries.reduce((s, [, v]) => s + v, 0)
  if (!total) return <EmptyChart height={size} label="No orders yet" />

  const radius = size / 2
  const strokeWidth = 28
  const innerR = radius - strokeWidth / 2

  let offset = 0
  const circumference = 2 * Math.PI * innerR

  return (
    <div className="flex items-center gap-6">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <g transform={`translate(${radius},${radius}) rotate(-90)`}>
          {entries.map(([status, count]) => {
            const frac = count / total
            const arc = circumference * frac
            const gap = circumference - arc
            const el = (
              <circle
                key={status}
                r={innerR}
                fill="none"
                stroke={STATUS_COLORS[status] || '#999'}
                strokeWidth={strokeWidth}
                strokeDasharray={`${arc} ${gap}`}
                strokeDashoffset={-offset}
              />
            )
            offset += arc
            return el
          })}
        </g>
        <text
          x={radius}
          y={radius - 4}
          textAnchor="middle"
          fontSize="20"
          fontWeight="600"
          fill="hsl(var(--foreground))"
        >
          {total}
        </text>
        <text
          x={radius}
          y={radius + 12}
          textAnchor="middle"
          fontSize="9"
          fill="hsl(var(--muted-foreground))"
        >
          ORDERS
        </text>
      </svg>

      {/* Legend */}
      <ul className="space-y-2 text-xs">
        {entries.map(([status, count]) => (
          <li key={status} className="flex items-center gap-2">
            <span
              className="inline-block h-3 w-3 rounded-sm"
              style={{ background: STATUS_COLORS[status] || '#999' }}
            />
            <span className="capitalize">{status}</span>
            <span className="text-muted-foreground ml-auto">{count}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

// ─── BarChart (horizontal) ────────────────────────────────
export function BarChart({ data = [], accent = '#c9a55a' }) {
  if (!data.length) return <EmptyChart height={200} label="No sales data yet" />
  const max = Math.max(...data.map((d) => d.quantity), 1)

  return (
    <ul className="space-y-3">
      {data.map((row) => {
        const frac = row.quantity / max
        return (
          <li key={row._id}>
            <div className="flex justify-between text-xs mb-1">
              <span className="font-medium truncate">{row.name}</span>
              <span className="text-muted-foreground">
                {row.quantity} sold · ₹{row.revenue.toLocaleString('en-IN')}
              </span>
            </div>
            <div className="h-2 rounded-full bg-muted-custom overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{ width: `${frac * 100}%`, background: accent }}
              />
            </div>
          </li>
        )
      })}
    </ul>
  )
}

// ─── Helpers ──────────────────────────────────────────────
function EmptyChart({ height, label }) {
  return (
    <div
      className="w-full flex items-center justify-center text-xs text-muted-foreground"
      style={{ height }}
    >
      {label}
    </div>
  )
}

function formatShort(n) {
  if (n >= 1e7) return (n / 1e7).toFixed(1) + 'Cr'
  if (n >= 1e5) return (n / 1e5).toFixed(1) + 'L'
  if (n >= 1e3) return (n / 1e3).toFixed(0) + 'k'
  return String(n)
}

function shortDate(iso) {
  if (!iso) return ''
  // "2026-04-01" → "1 Apr"
  const [, m, d] = iso.split('-')
  const months = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return `${parseInt(d, 10)} ${months[parseInt(m, 10)] || ''}`
}
