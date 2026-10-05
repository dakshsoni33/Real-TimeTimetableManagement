export default function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className="brand">
      <div className="brand-mark">
        <span />
        <span />
        <span />
      </div>
      {!compact && (
        <div>
          <div className="brand-name">Orario</div>
          <div className="brand-kicker">Academic operations</div>
        </div>
      )}
    </div>
  )
}
