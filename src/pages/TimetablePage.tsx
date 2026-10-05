import { useMemo, useState } from "react"
import Button from "../components/Button"
import Icon from "../components/Icon"
import StatusBadge from "../components/StatusBadge"

type Role = "ADMIN" | "FACULTY" | "STUDENT"
type VacancyState = "none" | "open" | "claimed"
type SessionStatus = "SCHEDULED" | "CANCELLED" | "EXTRA" | "VACANCY_UTILIZATION" | "RESCHEDULED"

type Session = {
  id: number
  day: string
  slot: number
  course: string
  code: string
  faculty: string
  room: string
  section: string
  scope?: string
  status: SessionStatus
  tone: "blue" | "teal" | "purple" | "rose"
  rescheduleOf?: number
}

const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]
const slots = [
  "9:00–9:50",
  "10:00–10:50",
  "11:00–11:50",
  "12:00–12:50",
  "2:00–2:50",
  "3:00–3:50",
  "4:00–4:50",
]

export default function Timetable({
  sessions,
  role,
  vacancy,
  version,
  syncState,
  onBuilder,
  onCancel,
  onClaim,
  onReschedule,
}: {
  sessions: Session[]
  role: Role
  vacancy: VacancyState
  version: string
  syncState: "loading" | "live" | "error"
  onBuilder: () => void
  onCancel: (session: Session) => void
  onClaim: () => void
  onReschedule: (session: Session) => void
}) {
  const [selectedDay, setSelectedDay] = useState("Monday")
  const [week, setWeek] = useState(0)
  const [filterOpen, setFilterOpen] = useState(false)
  const [statusFilter, setStatusFilter] = useState<SessionStatus | "ALL">("ALL")
  const [courseFilter, setCourseFilter] = useState("ALL")
  const roleScopedSessions = useMemo(
    () =>
      syncState === "live"
        ? sessions
        : role === "FACULTY"
        ? sessions.filter((session) => session.faculty === "Dr. Manushi Gupta")
        : role === "STUDENT"
          ? sessions.filter(
              (session) =>
                session.section === "B" && session.scope !== "Batch B2",
            )
          : sessions,
    [role, sessions, syncState],
  )
  const scopedSessions = useMemo(
    () =>
      roleScopedSessions.filter(
        (session) =>
          (statusFilter === "ALL" || session.status === statusFilter) &&
          (courseFilter === "ALL" || session.code === courseFilter),
      ),
    [courseFilter, roleScopedSessions, statusFilter],
  )
  const visibleSessions = useMemo(
    () => scopedSessions.filter((session) => session.day === selectedDay),
    [scopedSessions, selectedDay],
  )
  const facultyCancelled = sessions.find(
    (session) =>
      session.faculty === "Dr. Manushi Gupta" && session.status === "CANCELLED",
  )
  const activeFilterCount =
    Number(statusFilter !== "ALL") + Number(courseFilter !== "ALL")
  const filterCourses = Array.from(
    new Map(
      roleScopedSessions.map((session) => [session.code, session.course]),
    ).entries(),
  )
  const clearFilters = () => {
    setStatusFilter("ALL")
    setCourseFilter("ALL")
  }
  return (
    <div className="page timetable-page page-enter">
      <div className="page-header">
        <div>
          <div className="breadcrumb">
            Workspace <Icon name="chevron" size={12} /> Timetable
          </div>
          <div className="page-title">
            {role === "ADMIN" ? "Master timetable" : "My timetable"}
          </div>
          <p>
            {role === "ADMIN"
              ? "Manage published sessions and real-time schedule changes."
              : "Your live schedule, scoped to your academic assignments."}
          </p>
        </div>
        <div className="header-actions">
          <span className="published-badge">
            <i />
            <b>Published</b> · Version {version}
          </span>
          {role === "ADMIN" && (
            <Button icon="arrow" onClick={onBuilder}>
              Open builder
            </Button>
          )}
        </div>
      </div>
      {role === "STUDENT" && (
        <div className="student-scope-bar">
          <span>
            <Icon name="shield" />
          </span>
          <div>
            <small>YOUR ACADEMIC SCOPE</small>
            <b>Section B · Batch B1</b>
            <p>
              Whole-section classes, Batch B1 practicals, and enrolled elective
              groups only.
            </p>
          </div>
          <div>
            <span>PROGRAM</span>
            <b>B.Tech CSE · Year 2</b>
          </div>
          <div>
            <span>ENROLLMENT</span>
            <b>Semester 3</b>
          </div>
        </div>
      )}
      <div className="timetable-toolbar">
        <div className="week-select">
          <button onClick={() => setWeek(week - 1)} aria-label="Previous week">
            ‹
          </button>
          <div>
            <small>ACADEMIC WEEK 14</small>
            <b>
              {week === 0
                ? "14–18 October 2026"
                : week < 0
                  ? "7–11 October 2026"
                  : "21–25 October 2026"}
            </b>
          </div>
          <button onClick={() => setWeek(week + 1)} aria-label="Next week">
            ›
          </button>
        </div>
        <div className="toolbar-controls">
          <button
            disabled
            title={
              role === "STUDENT"
                ? "Your timetable scope is assigned from your student record"
                : "This review timetable is scoped to Section B"
            }
          >
            <Icon name="users" size={16} />{" "}
            {role === "STUDENT" ? "Section B · Batch B1" : "Section B"}{" "}
            <span>
              {role === "STUDENT" ? (
                <Icon name="shield" size={12} />
              ) : (
                <Icon name="check" size={12} />
              )}
            </span>
          </button>
          <div className="filter-control">
            <button
              className={activeFilterCount ? "has-filters" : ""}
              onClick={() => setFilterOpen(!filterOpen)}
            >
              <Icon name="filter" size={16} /> Filters{" "}
              {activeFilterCount > 0 && (
                <span className="filter-count">{activeFilterCount}</span>
              )}
            </button>
            {filterOpen && (
              <div className="timetable-filter-popover">
                <div className="filter-popover-head">
                  <div>
                    <small>TIMETABLE FILTERS</small>
                    <b>Refine visible sessions</b>
                  </div>
                  <button
                    onClick={() => setFilterOpen(false)}
                    aria-label="Close filters"
                  >
                    <Icon name="close" size={15} />
                  </button>
                </div>
                <label>
                  <span>SESSION STATE</span>
                  <select
                    value={statusFilter}
                    onChange={(event) =>
                      setStatusFilter(
                        event.target.value as SessionStatus | "ALL",
                      )
                    }
                  >
                    <option value="ALL">All states</option>
                    <option value="SCHEDULED">Scheduled</option>
                    <option value="CANCELLED">Cancelled</option>
                    <option value="EXTRA">Extra</option>
                    <option value="VACANCY_UTILIZATION">
                      Vacancy utilization
                    </option>
                    <option value="RESCHEDULED">Rescheduled</option>
                  </select>
                </label>
                <label>
                  <span>COURSE</span>
                  <select
                    value={courseFilter}
                    onChange={(event) => setCourseFilter(event.target.value)}
                  >
                    <option value="ALL">All courses</option>
                    {filterCourses.map(([code, course]) => (
                      <option value={code} key={code}>
                        {code} · {course}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="filter-summary">
                  <Icon name="check" size={13} />
                  <span>{scopedSessions.length} sessions match this view</span>
                </div>
                <Button
                  variant="secondary"
                  onClick={clearFilters}
                  disabled={activeFilterCount === 0}
                >
                  Clear filters
                </Button>
              </div>
            )}
          </div>
          <button className="today-button" onClick={() => setWeek(0)}>
            Today
          </button>
        </div>
      </div>
      {vacancy !== "none" && role !== "STUDENT" && (
        <div
          className={`vacancy-banner ${
            vacancy === "claimed" ? "vacancy-claimed" : ""
          }`}
        >
          <span>
            <Icon name={vacancy === "claimed" ? "check" : "spark"} />
          </span>
          <div>
            <small>
              {vacancy === "claimed"
                ? "VACANCY CLAIMED · NEW SESSION CREATED"
                : role === "ADMIN"
                  ? "VACANCY OPPORTUNITY CREATED"
                  : "ELIGIBLE VACANCY AVAILABLE"}
            </small>
            <b>Section B · 2:00–2:50 PM</b>
            <p>
              {vacancy === "claimed"
                ? "Discrete Mathematics now uses the period. The original cancelled DBMS session remains linked in history."
                : "The cancelled DBMS session is preserved. Only assigned Section B faculty can claim using their own assigned course."}
            </p>
          </div>
          {vacancy === "open" && (
            <div className="deadline">
              <small>CLAIM DEADLINE</small>
              <b>Before 2:00 PM</b>
            </div>
          )}
          {vacancy === "open" && role === "FACULTY" ? (
            <Button onClick={onClaim} icon="arrow">
              Review & claim
            </Button>
          ) : (
            <Icon name="chevron" />
          )}
        </div>
      )}
      {facultyCancelled && role !== "STUDENT" && (
        <div className="vacancy-banner faculty-vacancy-banner">
          <span>
            <Icon name="spark" />
          </span>
          <div>
            <small>YOUR CANCELLATION CREATED A VACANCY</small>
            <b>
              Section {facultyCancelled.section} ·{" "}
              {slots[facultyCancelled.slot]}
            </b>
            <p>
              The original {facultyCancelled.course} session is preserved. Other
              eligible Section B faculty were notified before the period starts.
            </p>
          </div>
          <div className="deadline">
            <small>SESSION OWNER</small>
            <b>Dr. Manushi Gupta</b>
          </div>
          <Icon name="chevron" />
        </div>
      )}
      <div className="mobile-days">
        {days.map((day) => (
          <button
            key={day}
            className={selectedDay === day ? "active" : ""}
            onClick={() => setSelectedDay(day)}
          >
            <span>{day.slice(0, 3)}</span>
            <b>{14 + days.indexOf(day)}</b>
          </button>
        ))}
      </div>
      <div className="timetable-shell">
        <div className="timetable-meta">
          <div>
            <span className="timezone">GMT +5:30</span>
            <small>7 periods · 50 min</small>
          </div>
          <div className="legend">
            <span>
              <i className="legend-blue" />
              Scheduled
            </span>
            <span>
              <i className="legend-rose" />
              Cancelled
            </span>
            <span>
              <i className="legend-teal" />
              Extra
            </span>
            <span>
              <i className="legend-purple" />
              Changed
            </span>
          </div>
        </div>
        {scopedSessions.length === 0 && (
          <div className="timetable-filter-empty">
            <Icon name="filter" />
            <div>
              <b>
                {syncState === "loading"
                  ? "Syncing your live schedule"
                  : syncState === "error"
                    ? "Live schedule unavailable"
                    : "No sessions match these filters"}
              </b>
              <small>
                {syncState === "loading"
                  ? "Your Supabase timetable is being loaded."
                  : syncState === "error"
                    ? "Check that the timetable migrations are deployed and try signing in again."
                    : "Your timetable scope is unchanged. Clear filters to show all relevant sessions."}
              </small>
            </div>
            <Button variant="ghost" onClick={clearFilters}>
              Clear filters
            </Button>
          </div>
        )}
        <div className="desktop-grid">
          <div className="grid-corner">
            <small>TIME / DAY</small>
          </div>
          {days.map((day, index) => (
            <div
              className={`day-heading ${day === "Monday" ? "today" : ""}`}
              key={day}
            >
              <div>
                <b>{day}</b>
                <small>OCT {14 + index}</small>
              </div>
              {day === "Monday" && <span>TODAY</span>}
            </div>
          ))}
          {slots.map((time, slotIndex) => (
            <div className="grid-row-contents" key={time}>
              <div className={`time-cell ${slotIndex === 4 ? "current" : ""}`}>
                <b>{time.split("–")[0]}</b>
                <small>{time.split("–")[1]}</small>
                {slotIndex === 4 && <span>NEXT</span>}
              </div>
              {days.map((day) => {
                const cellSessions = scopedSessions.filter(
                  (entry) => entry.day === day && entry.slot === slotIndex,
                )
                const session =
                  cellSessions.find((entry) => entry.status !== "CANCELLED") ??
                  cellSessions[0]
                const hasPreservedOriginal = Boolean(
                  session &&
                    session.status !== "CANCELLED" &&
                    cellSessions.some((entry) => entry.status === "CANCELLED"),
                )
                const canManageSession =
                  role !== "STUDENT" &&
                  session?.status === "SCHEDULED" &&
                  syncState === "live"
                return (
                  <div
                    className={`session-cell ${
                      slotIndex === 3 ? "pre-lunch" : ""
                    }`}
                    key={`${day}-${time}`}
                  >
                    {session ? (
                      <>
                        <ClassCard
                          session={session}
                          canCancel={
                            canManageSession
                          }
                          canReschedule={
                            canManageSession &&
                            !roleScopedSessions.some(
                              (entry) => entry.rescheduleOf === session.id,
                            )
                          }
                          onCancel={() => onCancel(session)}
                          onReschedule={() => onReschedule(session)}
                        />
                        {hasPreservedOriginal && (
                          <div className="preserved-chip">
                            <Icon name="history" size={11} />
                            DBMS cancelled · retained
                          </div>
                        )}
                      </>
                    ) : slotIndex === 3 ? (
                      <span className="lunch-label">Academic hour</span>
                    ) : null}
                    {day === "Monday" && slotIndex === 4 && (
                      <div className="now-line">
                        <span />
                        1:42
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          ))}
        </div>
        <div className="mobile-sessions">
          <div className="mobile-date">
            <span>{selectedDay}</span>
            <small>October {14 + days.indexOf(selectedDay)}, 2026</small>
          </div>
          {slots.map((time, index) => {
            const cellSessions = visibleSessions.filter(
              (entry) => entry.slot === index,
            )
            const session =
              cellSessions.find((entry) => entry.status !== "CANCELLED") ??
              cellSessions[0]
            const hasPreservedOriginal = Boolean(
              session &&
                session.status !== "CANCELLED" &&
                cellSessions.some((entry) => entry.status === "CANCELLED"),
            )
            const canManageSession =
              role !== "STUDENT" &&
              session?.status === "SCHEDULED" &&
              syncState === "live"
            return (
              <div className="mobile-slot" key={time}>
                <div className="mobile-time">
                  <b>{time.split("–")[0]}</b>
                  <small>{time.split("–")[1]}</small>
                </div>
                <div>
                  {session ? (
                    <ClassCard
                      session={session}
                      canCancel={
                        canManageSession
                      }
                      canReschedule={
                        canManageSession &&
                        !roleScopedSessions.some(
                          (entry) => entry.rescheduleOf === session.id,
                        )
                      }
                      onCancel={() => onCancel(session)}
                      onReschedule={() => onReschedule(session)}
                    />
                  ) : (
                    <div className="free-slot">No class scheduled</div>
                  )}
                  {hasPreservedOriginal && (
                    <div className="preserved-chip mobile-preserved">
                      <Icon name="history" size={11} />
                      DBMS cancelled · retained
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
      <div className="timetable-footnote">
        <Icon name="shield" size={16} />
        <span>
          Conflict checks use actual time ranges for faculty, room, section,
          batch, and elective group scope.
        </span>
        <b>
          {syncState === "live"
            ? "Synced with Supabase"
            : syncState === "loading"
              ? "Syncing with Supabase"
              : syncState === "error"
                ? "Supabase sync failed"
                : "Supabase sync unavailable"}
        </b>
      </div>
    </div>
  )
}

export function ClassCard({
  session,
  canCancel,
  canReschedule = false,
  onCancel,
  onReschedule = () => undefined,
}: {
  session: Session
  canCancel: boolean
  canReschedule?: boolean
  onCancel: () => void
  onReschedule?: () => void
}) {
  return (
    <div
      className={`class-card class-${session.tone} ${
        session.status === "CANCELLED" ? "is-cancelled" : ""
      }`}
    >
      <div className="class-top">
        <span>{session.code}</span>
        <StatusBadge status={session.status} />
      </div>
      <b className="class-name">{session.course}</b>
      <div className="class-details">
        <span>
          <Icon name="users" size={13} />
          {session.faculty}
        </span>
        <span>
          <Icon name="room" size={13} />
          {session.room} · Sec {session.section}
          {session.scope ? ` · ${session.scope}` : ""}
        </span>
      </div>
      {(canCancel || canReschedule) && (
        <div className="card-actions">
          {canReschedule && (
            <button
              className="card-action card-action-purple"
              onClick={onReschedule}
            >
              Reschedule
            </button>
          )}
          {canCancel && (
            <button className="card-action" onClick={onCancel}>
              Cancel
            </button>
          )}
        </div>
      )}
      {session.status === "CANCELLED" && (
        <div className="history-note !static !mt-1 !w-fit !max-w-full !leading-tight">
          <Icon name="history" size={13} />
          <span className="truncate">Retained in history</span>
        </div>
      )}
      {session.id === 9 && session.status === "RESCHEDULED" && (
        <div className="history-note moved-note">
          <Icon name="arrow" size={13} /> Moved to 2:00 PM
        </div>
      )}
      {session.id === 4 && session.status === "RESCHEDULED" && (
        <div className="history-note moved-note">
          <Icon name="arrow" size={13} /> Moved to Friday
        </div>
      )}
      {session.rescheduleOf && (
        <div className="history-note reschedule-note">
          <Icon name="history" size={13} /> Rescheduled from #
          {session.rescheduleOf === 4 ? "CS-20412" : "CS-20423"}
        </div>
      )}
    </div>
  )
}
