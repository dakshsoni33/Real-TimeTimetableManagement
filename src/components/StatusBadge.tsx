type SessionStatus = "SCHEDULED" | "CANCELLED" | "EXTRA" | "VACANCY_UTILIZATION" | "RESCHEDULED"

export default function StatusBadge({ status }: { status: SessionStatus }) {
  return (
    <span className={`status status-${status.toLowerCase()}`}>
      <span />
      {status.replace("_", " ")}
    </span>
  )
}
