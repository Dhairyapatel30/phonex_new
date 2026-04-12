// SectionHeader.jsx
// Renders a labeled section header with an optional italic subtitle

export default function SectionHeader({ label, title, subtitle, center = false }) {
  return (
    <div className={`flex flex-col gap-3 ${center ? 'items-center text-center' : 'items-start'}`}>
      {/* Label + rule */}
      <div className={`flex items-center gap-3 ${center ? 'justify-center' : ''}`}>
        <div className="section-rule" />
        <span className="section-label">{label}</span>
        <div className="section-rule" />
      </div>

      {/* Main title */}
      {title && (
        <h2
          className="font-serif-display text-3xl md:text-4xl font-normal leading-tight"
          style={{ color: 'hsl(var(--foreground))' }}
        >
          {title}
        </h2>
      )}

      {/* Italic subtitle */}
      {subtitle && (
        <p
          className="font-serif-display text-lg italic"
          style={{ color: 'hsl(var(--muted-foreground))' }}
        >
          {subtitle}
        </p>
      )}
    </div>
  )
}
