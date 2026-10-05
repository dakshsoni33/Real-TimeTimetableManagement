import {
  Component,
  useEffect,
  useMemo,
  useState,
  type ErrorInfo,
  type ReactNode,
} from "react"
import AppMainSurface from "./components/AppMainSurface"
import AppShellSurface from "./components/AppShellSurface"
import AppSidebar from "./components/AppSidebar"
import AppTopbar from "./components/AppTopbar"
import Brand from "./components/Brand"
import Button from "./components/Button"
import Icon from "./components/Icon"
import StatusBadge from "./components/StatusBadge"
import {
  cancelBackendClass,
  claimBackendVacancy,
  createBackendExtraClass,
  getBackendAssignments,
  getBackendClaims,
  getBackendMasterRows,
  getBackendNotifications,
  getBackendRooms,
  getBackendTimeSlots,
  getBackendTimetables,
  markBackendNotificationRead,
  publishBackendTimetable,
  rescheduleBackendClass,
  type BackendAssignment,
  type BackendClaim,
  type BackendNotification,
  type BackendRoom,
  type BackendTimeSlot,
  type BackendTimetable,
} from "./lib/backend"
import { getLiveSchedule } from "./lib/schedule"
import { supabase } from "./lib/supabase"
import Timetable, { ClassCard } from "./pages/TimetablePage"

type Role = "ADMIN" | "FACULTY" | "STUDENT"
type View = "landing" | "login" | "dashboard" | "timetable" | "history" | "availability" | "vacancies" | "extra" | "manage" | "builder" | "publish" | "students" | "sections" | "batches" | "electives" | "faculty" | "courses" | "rooms" | "slots" | "assignments" | "notificationsPage"
type VacancyState = "none" | "open" | "claimed"
type SessionStatus = "SCHEDULED" | "CANCELLED" | "EXTRA" | "VACANCY_UTILIZATION" | "RESCHEDULED"

type Session = {
  id: number
  timetableId?: number
  courseId?: number
  sectionId?: number | null
  batchId?: number | null
  groupId?: number | null
  roomId?: number
  slotId?: number
  classDate?: string | null
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

type NavigationItem = {
  label: string
  icon: string
  view?: View
}

type NavigableNavigationItem = {
  label: string
  icon: string
  view: View
}

type NavigationGroup = {
  group: string
  items: NavigationItem[]
}

type WorkspaceRoute = {
  role: Role
  view: View
}

type FacultyDestination = {
  day: string
  slot: number
}

type UserIdentity = {
  fullName: string
  initials: string
  greeting: string
  email: string
}

function parseRole(value: unknown): Role | null {
  const role = String(value ?? "").toUpperCase()
  return role === "ADMIN" || role === "FACULTY" || role === "STUDENT"
    ? role
    : null
}

const defaultIdentities: Record<Role, UserIdentity> = {
  ADMIN: {
    fullName: "Administrator",
    initials: "AD",
    greeting: "Administrator",
    email: "",
  },
  FACULTY: {
    fullName: "Faculty member",
    initials: "FM",
    greeting: "Faculty",
    email: "",
  },
  STUDENT: {
    fullName: "Student",
    initials: "ST",
    greeting: "Student",
    email: "",
  },
}

function resolveIdentity(
  role: Role,
  email: string,
  metadataName?: string,
): UserIdentity {
  const normalizedEmail = email.trim().toLowerCase()
  const localPart = normalizedEmail.split("@")[0] ?? ""
  const fallbackName = localPart
    .split(/[._-]+/)
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase() + part.slice(1))
    .join(" ")
  const fullName =
    metadataName?.trim() || fallbackName || defaultIdentities[role].fullName
  const nameParts = fullName
    .replace(/^Dr\.\s+/i, "")
    .split(/\s+/)
    .filter(Boolean)
  const surname = nameParts[nameParts.length - 1] ?? "Faculty"
  const initials = nameParts
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase()
  return { fullName, initials, greeting: surname, email: normalizedEmail }
}

function getTimeGreeting() {
  const hour = Number(
    new Intl.DateTimeFormat("en-GB", {
      hour: "2-digit",
      hourCycle: "h23",
      timeZone: "Asia/Kolkata",
    }).format(new Date()),
  )
  if (hour < 12) return "Good morning"
  if (hour < 17) return "Good afternoon"
  return "Good evening"
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

function Landing({ onEnter }: { onEnter: () => void }) {
  return (
    <div className="landing">
      <header className="landing-nav">
        <Brand />
        <div className="landing-links">
          <span>Platform</span>
          <span>Workflow</span>
          <span>System model</span>
        </div>
        <Button onClick={onEnter} icon="arrow">
          Open workspace
        </Button>
      </header>
      <main>
        <section className="hero">
          <div className="hero-copy">
            <div className="eyebrow">
              <span className="live-dot" />
              Live academic operations
            </div>
            <div className="hero-title">
              Every class.
              <br />
              Perfectly <em>in sync.</em>
            </div>
            <div className="hero-subtitle">
              A real-time scheduling command center for timetables,
              cancellations, vacant periods, extra classes, and the people they
              affect.
            </div>
            <div className="hero-actions">
              <Button onClick={onEnter} icon="arrow">
                Explore live timetable
              </Button>
              <div className="trust-note">
                <Icon name="shield" size={18} />
                <span>
                  History-preserving
                  <br />
                  <b>by design</b>
                </span>
              </div>
            </div>
          </div>
          <HeroPreview />
        </section>
        <section className="story-strip">
          <div className="strip-label">One connected workflow</div>
          {[
            "Timetable",
            "Class session",
            "Change",
            "Vacancy",
            "Claim",
            "New session",
            "Notify",
          ].map((item, index) => (
            <div className="story-step" key={item}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              {item}
              {index < 6 && <Icon name="chevron" size={14} />}
            </div>
          ))}
        </section>
        <section className="principles">
          <div>
            <span>01</span>
            <b>History stays intact</b>
            <p>Cancelled and rescheduled sessions remain traceable.</p>
          </div>
          <div>
            <span>02</span>
            <b>Eligibility is precise</b>
            <p>Only assigned faculty see and claim relevant vacancies.</p>
          </div>
          <div>
            <span>03</span>
            <b>Updates reach the right people</b>
            <p>Targeted notifications keep every cohort aligned.</p>
          </div>
        </section>
      </main>
    </div>
  )
}

function Login({
  onBack,
  onLogin,
}: {
  onBack: () => void
  onLogin: (
    role: Role,
    identity: UserIdentity,
    accessToken: string,
  ) => void
}) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [visible, setVisible] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const submit = async () => {
    if (!email.trim() || !password.trim()) {
      setError("Enter both your institutional email and password.")
      return
    }
    setLoading(true)
    setError("")

    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    })
    if (authError || !data.session) {
      setLoading(false)
      setError(authError?.message ?? "Supabase authentication failed.")
      return
    }

    const authenticatedRole = parseRole(data.user.user_metadata?.role)
    if (!authenticatedRole) {
      await supabase.auth.signOut()
      setLoading(false)
      setError("This account does not have a valid ADMIN, FACULTY, or STUDENT role.")
      return
    }

    setLoading(false)
    onLogin(
      authenticatedRole,
      resolveIdentity(
        authenticatedRole,
        data.user.email ?? email,
        typeof data.user.user_metadata?.full_name === "string"
          ? data.user.user_metadata.full_name
          : typeof data.user.user_metadata?.name === "string"
            ? data.user.user_metadata.name
            : undefined,
      ),
      data.session.access_token,
    )
  }
  return (
    <div className="login-page">
      <div className="login-brand">
        <button onClick={onBack} aria-label="Back to landing">
          <Icon name="arrow" size={17} />
        </button>
        <Brand />
      </div>
      <div className="login-ambient">
        <div className="login-story">
          <div className="eyebrow">
            <span className="live-dot" />
            One real-time academic system
          </div>
          <div className="login-story-title">
            The right class.
            <br />
            The right people.
            <br />
            <em>Right now.</em>
          </div>
          <p>
            Every cancellation, vacancy, claim, reschedule, and notification
            remains connected to its original class session.
          </p>
          <div className="login-flow">
            {["TIMETABLE", "CLASS_SESSION", "CHANGE", "NOTIFY"].map(
              (item, index) => (
                <div key={item}>
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <b>{item}</b>
                  {index < 3 && <Icon name="chevron" size={13} />}
                </div>
              ),
            )}
          </div>
        </div>
      </div>
      <main className="login-card">
        <div className="login-heading">
          <small>SECURE WORKSPACE</small>
          <div>Welcome back</div>
          <p>Sign in with your JKLU academic identity.</p>
        </div>
        <label className="login-field">
          <span>INSTITUTIONAL EMAIL</span>
          <div>
            <Icon name="users" size={16} />
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>
        </label>
        <label className="login-field">
          <span>PASSWORD</span>
          <div>
            <Icon name="shield" size={16} />
            <input
              type={visible ? "text" : "password"}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
            <button onClick={() => setVisible(!visible)} type="button">
              {visible ? "Hide" : "Show"}
            </button>
          </div>
        </label>
        <div className="login-options">
          <label>
            <input type="checkbox" defaultChecked />
            Keep me signed in
          </label>
          <button
            type="button"
            disabled
            title="Password recovery requires backend authentication"
          >
            Forgot password?
          </button>
        </div>
        {error && (
          <div className="login-error">
            <Icon name="close" size={14} />
            {error}
          </div>
        )}
        <Button onClick={submit} disabled={loading} className="login-submit">
          {loading ? (
            <>
              <span className="spinner" />
              Verifying identity...
            </>
          ) : (
            <>
              Sign in to workspace <Icon name="arrow" size={16} />
            </>
          )}
        </Button>
        <div className="login-security">
          <Icon name="shield" size={14} />
          Authentication is handled by Supabase. Database visibility is
          enforced by RLS.
        </div>
      </main>
    </div>
  )
}

function HeroPreview() {
  return (
    <div className="hero-visual">
      <div className="preview-glow" />
      <div className="preview-window">
        <div className="preview-top">
          <div className="preview-logo">
            <Brand compact />
          </div>
          <span>WEEK 14</span>
          <div className="preview-avatars">
            <i />
            <i />
            <i />
          </div>
        </div>
        <div className="preview-heading">
          <div>
            <small>MONDAY, 14 OCTOBER</small>
            <b>Section B timetable</b>
          </div>
          <span className="published">
            <Icon name="check" size={13} /> Published
          </span>
        </div>
        <div className="preview-grid">
          <div className="preview-times">
            <span>11:00</span>
            <span>12:00</span>
            <span>1:00</span>
            <span>2:00</span>
            <span>3:00</span>
          </div>
          <div className="preview-track">
            <div className="mini-class mini-teal" style={{ gridRow: 1 }}>
              <small>11:00–11:50</small>
              <b>Business Management</b>
              <span>Dr. N. Kasliwal · IET Amp.</span>
            </div>
            <div className="mini-break" style={{ gridRow: 3 }}>
              <span>Lunch</span>
            </div>
            <div className="mini-class mini-cancelled" style={{ gridRow: 4 }}>
              <small>2:00–2:50 · CANCELLED</small>
              <b>Database Management</b>
              <span>Original session preserved</span>
            </div>
            <div className="mini-vacancy">
              <Icon name="spark" size={17} />
              <div>
                <small>VACANT PERIOD</small>
                <b>Eligible faculty notified</b>
              </div>
            </div>
          </div>
        </div>
        <div className="preview-toast">
          <span>
            <Icon name="bell" size={16} />
          </span>
          <div>
            <b>Schedule updated</b>
            <small>Section B · just now</small>
          </div>
          <Icon name="check" size={16} />
        </div>
      </div>
      <div className="orbit-label orbit-one">
        <span />
        <div>
          <small>LIVE STATUS</small>
          <b>42 sessions active</b>
        </div>
      </div>
      <div className="orbit-label orbit-two">
        <Icon name="spark" size={18} />
        <div>
          <small>SMART SCOPE</small>
          <b>Targeted updates</b>
        </div>
      </div>
    </div>
  )
}

const navigation: Record<Role, NavigationGroup[]> = {
  ADMIN: [
    {
      group: "Workspace",
      items: [
        { label: "Overview", icon: "grid", view: "dashboard" },
        { label: "Timetable", icon: "calendar", view: "timetable" },
        { label: "Notifications", icon: "bell", view: "notificationsPage" },
      ],
    },
    {
      group: "Timetable operations",
      items: [
        { label: "Manage versions", icon: "history", view: "manage" },
        { label: "Timetable builder", icon: "settings", view: "builder" },
        { label: "Publish timetable", icon: "check", view: "publish" },
      ],
    },
    {
      group: "Academic structure",
      items: [
        { label: "Students", icon: "users", view: "students" },
        { label: "Sections", icon: "grid", view: "sections" },
        { label: "Batches", icon: "users", view: "batches" },
        { label: "Elective groups", icon: "book", view: "electives" },
      ],
    },
    {
      group: "Academic resources",
      items: [
        { label: "Faculty", icon: "users", view: "faculty" },
        { label: "Courses", icon: "book", view: "courses" },
        { label: "Rooms", icon: "room", view: "rooms" },
        { label: "Time slots", icon: "history", view: "slots" },
        {
          label: "Teaching assignments",
          icon: "settings",
          view: "assignments",
        },
      ],
    },
    {
      group: "Governance",
      items: [{ label: "Timetable history", icon: "history", view: "history" }],
    },
  ],
  FACULTY: [
    {
      group: "Workspace",
      items: [
        { label: "Overview", icon: "grid", view: "dashboard" },
        { label: "My timetable", icon: "calendar", view: "timetable" },
        { label: "Notifications", icon: "bell", view: "notificationsPage" },
      ],
    },
    {
      group: "Scheduling",
      items: [
        { label: "Availability", icon: "check", view: "availability" },
        { label: "Vacant periods", icon: "spark", view: "vacancies" },
        { label: "Create extra class", icon: "book", view: "extra" },
      ],
    },
    {
      group: "Records",
      items: [{ label: "Class history", icon: "history", view: "history" }],
    },
  ],
  STUDENT: [
    {
      group: "Workspace",
      items: [
        { label: "Overview", icon: "grid", view: "dashboard" },
        { label: "My timetable", icon: "calendar", view: "timetable" },
        { label: "Notifications", icon: "bell", view: "notificationsPage" },
      ],
    },
    {
      group: "Records",
      items: [{ label: "Class changes", icon: "history", view: "history" }],
    },
  ],
}

function readWorkspaceRoute(): WorkspaceRoute | null {
  const [rolePart, viewPart] = window.location.hash
    .replace(/^#\/?/, "")
    .split("/")
  const role = rolePart?.toUpperCase() as Role
  if (!["ADMIN", "FACULTY", "STUDENT"].includes(role)) return null
  const allowedViews = navigation[role].flatMap((group) =>
    group.items.map((item) => item.view).filter(Boolean),
  )
  if (!allowedViews.includes(viewPart as View)) return null
  return { role, view: viewPart as View }
}

async function loadWorkspaceSnapshot() {
  const [
    schedule,
    notificationRows,
    roomRows,
    slotRows,
    timetableRows,
    assignmentRows,
    claimRows,
  ] = await Promise.all([
    getLiveSchedule(),
    getBackendNotifications(),
    getBackendRooms(),
    getBackendTimeSlots(),
    getBackendTimetables(),
    getBackendAssignments(),
    getBackendClaims(),
  ])

  return {
    schedule,
    notificationRows,
    roomRows,
    slotRows,
    timetableRows,
    assignmentRows,
    claimRows,
  }
}

function AppShell({
  onExit,
  initialRole,
  initialIdentity,
  accessToken,
}: {
  onExit: () => void
  initialRole: Role
  initialIdentity?: UserIdentity
  accessToken: string
}) {
  const initialRoute = useMemo(readWorkspaceRoute, [])
  const role = initialRole
  const safeRole: Role = defaultIdentities[role] ? role : "ADMIN"
  const currentIdentity =
    (role === initialRole ? initialIdentity : undefined) ??
    defaultIdentities[safeRole]
  const [view, setView] = useState<View>(
    initialRoute?.role === initialRole ? initialRoute.view : "timetable",
  )
  const [mobileNav, setMobileNav] = useState(false)
  const [notifications, setNotifications] = useState(false)
  const [commandOpen, setCommandOpen] = useState(false)
  const [sessions, setSessions] = useState<Session[]>(
    [],
  )
  const [scheduleVersion, setScheduleVersion] = useState("")
  const [scheduleSync, setScheduleSync] = useState<
    "loading" | "live" | "error"
  >("loading")
  const [backendNotifications, setBackendNotifications] = useState<
    BackendNotification[]
  >([])
  const [rooms, setRooms] = useState<BackendRoom[]>([])
  const [timeSlots, setTimeSlots] = useState<BackendTimeSlot[]>([])
  const [timetables, setTimetables] = useState<BackendTimetable[]>([])
  const [assignments, setAssignments] = useState<BackendAssignment[]>([])
  const [claims, setClaims] = useState<BackendClaim[]>([])
  const [cancelTarget, setCancelTarget] = useState<Session | null>(null)
  const [vacancy, setVacancy] = useState<VacancyState>(
    "none",
  )
  const [claimTarget, setClaimTarget] = useState<Session | null>(null)
  const [rescheduleTarget, setRescheduleTarget] = useState<Session | null>(null)
  const [toast, setToast] = useState("")
  const [extraLoading, setExtraLoading] = useState(false)
  const [draftSessionAdded, setDraftSessionAdded] = useState(
    false,
  )
  const [publishLoading, setPublishLoading] = useState(false)
  const [publishedV4, setPublishedV4] = useState(
    false,
  )
  const rescheduled = sessions.some((session) => session.id === 18)
  const facultyChanged = sessions.some(
    (session) =>
      [19, 20, 21].includes(session.id) ||
      (session.faculty === "Dr. Manushi Gupta" &&
        session.status === "CANCELLED"),
  )
  const extraCreated = sessions.some((session) => session.id === 22)
  const claimableSessions = sessions.filter(
    (session) =>
      session.status === "CANCELLED" &&
      !sessions.some(
        (candidate) =>
          candidate.rescheduleOf === session.id ||
          (candidate.status === "VACANCY_UTILIZATION" &&
            candidate.id !== session.id),
      ),
  )
  const unreadNotificationCount = backendNotifications.filter(
    (notification) => !notification.is_read,
  ).length
  const markNotificationRead = async (notificationId: number) => {
    await markBackendNotificationRead(notificationId)
    setBackendNotifications((current) =>
      current.map((notification) =>
        notification.notification_id === notificationId
          ? { ...notification, is_read: true }
          : notification,
      ),
    )
  }
  const markAllNotificationsRead = async () => {
    await Promise.all(
      backendNotifications
        .filter((notification) => !notification.is_read)
        .map((notification) =>
          markBackendNotificationRead(notification.notification_id),
        ),
    )
    setBackendNotifications((current) =>
      current.map((notification) => ({ ...notification, is_read: true })),
    )
  }

  const applyWorkspaceSnapshot = (
    snapshot: Awaited<ReturnType<typeof loadWorkspaceSnapshot>>,
  ) => {
    const {
      schedule,
      notificationRows,
      roomRows,
      slotRows,
      timetableRows,
      assignmentRows,
      claimRows,
    } = snapshot
    setSessions(schedule.sessions)
    setScheduleVersion(schedule.version)
    setBackendNotifications(notificationRows)
    setRooms(roomRows)
    setTimeSlots(slotRows)
    setTimetables(timetableRows)
    setAssignments(assignmentRows)
    setClaims(claimRows)
    setVacancy(
      claimRows.some((claim) => claim.status === "CLAIMED")
        ? "claimed"
        : schedule.sessions.some(
              (session) =>
                session.status === "CANCELLED" &&
                !schedule.sessions.some(
                  (candidate) => candidate.rescheduleOf === session.id,
                ),
            )
          ? "open"
          : "none",
    )
    setPublishedV4(
      timetableRows.some(
        (timetable) =>
          timetable.status === "PUBLISHED" &&
          String(timetable.version) === schedule.version,
      ),
    )
  }

  const refreshWorkspace = async () => {
    const snapshot = await loadWorkspaceSnapshot()
    applyWorkspaceSnapshot(snapshot)
    return snapshot
  }

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault()
        setCommandOpen((open) => !open)
      }
      if (event.key === "Escape") setCommandOpen(false)
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [])

  useEffect(() => {
    const syncFromLocation = () => {
      const route = readWorkspaceRoute()
      if (!route || route.role !== role) return
      setView(route.view)
    }
    window.addEventListener("popstate", syncFromLocation)
    window.addEventListener("hashchange", syncFromLocation)
    return () => {
      window.removeEventListener("popstate", syncFromLocation)
      window.removeEventListener("hashchange", syncFromLocation)
    }
  }, [role])

  useEffect(() => {
    const target = `#/${role.toLowerCase()}/${view}`
    if (window.location.hash !== target)
      window.history.pushState(null, "", target)
    document.title = `${navigation[role].flatMap((group) => group.items).find((item) => item.view === view)?.label ?? "Workspace"} · Orario`
  }, [role, view])

  useEffect(() => {
    let active = true
    setScheduleSync("loading")
    void loadWorkspaceSnapshot()
      .then((snapshot) => {
        if (!active) return
        applyWorkspaceSnapshot(snapshot)
        setScheduleSync("live")
      })
      .catch(() => {
        if (!active) return
        setSessions([])
        setScheduleSync("error")
      })

    return () => {
      active = false
    }
  }, [accessToken])

  const cancelSession = async () => {
    if (!cancelTarget) return
    const target = cancelTarget
    try {
      await cancelBackendClass(target.id)
      await refreshWorkspace()
      setCancelTarget(null)
      setToast(
        `${target.course} was cancelled. The original session remains in history.`,
      )
    } catch (error) {
      setToast(error instanceof Error ? error.message : "Cancellation failed.")
      throw error
    }
  }

  const claimVacancy = async (courseId: number) => {
    if (!claimTarget) return
    try {
      await claimBackendVacancy(claimTarget.id, courseId)
      await refreshWorkspace()
      setClaimTarget(null)
      setToast("Vacancy claimed. The replacement class is now live.")
    } catch (error) {
      setToast(error instanceof Error ? error.message : "Vacancy claim failed.")
      throw error
    }
  }

  const rescheduleSession = async (change: {
    classDate: string
    slotId: number
    roomId: number
  }) => {
    if (!rescheduleTarget) return
    const target = rescheduleTarget
    try {
      await rescheduleBackendClass(target.id, change)
      await refreshWorkspace()
      setRescheduleTarget(null)
      setToast(
        `${target.course} was rescheduled. The original session remains in history.`,
      )
    } catch (error) {
      setToast(error instanceof Error ? error.message : "Rescheduling failed.")
      throw error
    }
  }

  const createExtraClass = async (
    input: Parameters<typeof createBackendExtraClass>[0],
  ) => {
    setExtraLoading(true)
    try {
      await createBackendExtraClass(input)
      await refreshWorkspace()
      setExtraLoading(false)
      setToast(
        "Extra class created in a naturally free period. Scoped students were notified.",
      )
    } catch (error) {
      setExtraLoading(false)
      setToast(error instanceof Error ? error.message : "Extra class failed.")
      throw error
    }
  }

  const publishTimetable = async () => {
    const draft = timetables.find((timetable) => timetable.status === "DRAFT")
    if (!draft) {
      setToast("No draft timetable is available to publish.")
      return
    }
    setPublishLoading(true)
    try {
      await publishBackendTimetable(draft.timetable_id)
      await refreshWorkspace()
      setPublishedV4(true)
      setPublishLoading(false)
      setToast(`Timetable version ${draft.version} is now published.`)
    } catch (error) {
      setPublishLoading(false)
      setToast(error instanceof Error ? error.message : "Publication failed.")
      throw error
    }
  }

  return (
    <AppShellSurface>
      <AppSidebar
        open={mobileNav}
        role={role}
        activeView={view}
        groups={navigation[role]}
        brand={<Brand />}
        identity={currentIdentity}
        renderIcon={(name, size) => <Icon name={name} size={size} />}
        onClose={() => setMobileNav(false)}
        onNavigate={(nextView) => {
          setView(nextView as View)
          setMobileNav(false)
        }}
        onExit={onExit}
      />
      {mobileNav && (
        <button
          className="nav-backdrop"
          onClick={() => setMobileNav(false)}
          aria-label="Close navigation"
        />
      )}
      <AppMainSurface>
        <AppTopbar
          role={role}
          unreadCount={unreadNotificationCount}
          renderIcon={(name, size) => <Icon name={name} size={size} />}
          onMenu={() => setMobileNav(true)}
          onSearch={() => setCommandOpen(true)}
          onNotifications={() => setNotifications(true)}
        />
        {view === "dashboard" ? (
          <Dashboard
            role={role}
            identity={currentIdentity}
            onTimetable={() => setView("timetable")}
          />
        ) : view === "history" ? (
          role === "FACULTY" ? (
            <FacultyHistoryView sessions={sessions} />
          ) : role === "STUDENT" ? (
            <StudentChangesView sessions={sessions} publishedV4={publishedV4} />
          ) : (
            <HistoryView sessions={sessions} vacancy={vacancy} role={role} />
          )
        ) : view === "availability" ? (
          <AvailabilityView
            sessions={sessions}
            onManage={(session) => setRescheduleTarget(session)}
          />
        ) : view === "vacancies" ? (
          <VacantPeriodsView
            sessions={claimableSessions}
            assignments={assignments}
            onClaim={setClaimTarget}
          />
        ) : view === "extra" ? (
          <CreateExtraClassView
            created={sessions.some((session) => session.status === "EXTRA")}
            loading={extraLoading}
            assignments={assignments}
            rooms={rooms}
            timeSlots={timeSlots}
            timetable={timetables.find(
              (timetable) => timetable.status === "PUBLISHED",
            )}
            onCreate={createExtraClass}
          />
        ) : view === "manage" ? (
          <TimetableManagement
            publishedV4={publishedV4}
            timetables={timetables}
            onBuilder={() => setView("builder")}
            onPublish={() => setView("publish")}
          />
        ) : view === "builder" ? (
          <TimetableBuilder
            added={draftSessionAdded}
            onAdd={() => setDraftSessionAdded(true)}
            onPublish={() => setView("publish")}
          />
        ) : view === "publish" ? (
          <PublishTimetable
            draftReady={draftSessionAdded}
            published={publishedV4}
            loading={publishLoading}
            onPublish={publishTimetable}
            onOpen={() => setView("timetable")}
            draft={timetables.find(
              (timetable) => timetable.status === "DRAFT",
            )}
          />
        ) : view === "students" ||
          view === "sections" ||
          view === "batches" ||
          view === "electives" ||
          view === "faculty" ||
          view === "courses" ||
          view === "rooms" ||
          view === "slots" ||
          view === "assignments" ? (
          <MasterDataView key={view} kind={view} />
        ) : view === "notificationsPage" ? (
          <NotificationsPage
            role={role}
            notifications={backendNotifications}
            onMarkRead={markNotificationRead}
            onMarkAllRead={markAllNotificationsRead}
          />
        ) : (
          <Timetable
            sessions={sessions}
            role={role}
            vacancy={vacancy}
            version={
              accessToken
                ? scheduleVersion
                : publishedV4
                  ? "4.0"
                  : "3.2"
            }
            syncState={scheduleSync}
            onBuilder={() => setView("builder")}
            onCancel={setCancelTarget}
            onClaim={() => setClaimTarget(claimableSessions[0] ?? null)}
            onReschedule={setRescheduleTarget}
          />
        )}
      </AppMainSurface>
      {notifications && (
        <NotificationPanel
          onClose={() => setNotifications(false)}
          onMarkAllRead={() => void markAllNotificationsRead()}
          notifications={backendNotifications}
        />
      )}
      {cancelTarget && (
        <CancellationDialog
          session={cancelTarget}
          onClose={() => setCancelTarget(null)}
          onConfirm={cancelSession}
        />
      )}
      {claimTarget && (
        <ClaimDialog
          session={claimTarget}
          assignments={assignments}
          onClose={() => setClaimTarget(null)}
          onConfirm={claimVacancy}
        />
      )}
      {rescheduleTarget && (
        <RescheduleDialog
          session={rescheduleTarget}
          rooms={rooms}
          timeSlots={timeSlots}
          onClose={() => setRescheduleTarget(null)}
          onConfirm={rescheduleSession}
        />
      )}
      {commandOpen && (
        <CommandPalette
          role={role}
          currentView={view}
          onClose={() => setCommandOpen(false)}
          onNavigate={(nextView) => {
            setView(nextView)
            setCommandOpen(false)
          }}
        />
      )}
      {toast && (
        <div className="toast">
          <span>
            <Icon name="check" size={17} />
          </span>
          <div>
            <b>Schedule updated</b>
            <small>{toast}</small>
          </div>
          <button onClick={() => setToast("")} aria-label="Dismiss">
            <Icon name="close" size={16} />
          </button>
        </div>
      )}
    </AppShellSurface>
  )
}

function CommandPalette({
  role,
  currentView,
  onClose,
  onNavigate,
}: {
  role: Role
  currentView: View
  onClose: () => void
  onNavigate: (view: View) => void
}) {
  const [query, setQuery] = useState("")
  const available = navigation[role].flatMap((group) =>
    group.items
      .filter((item): item is NavigableNavigationItem => Boolean(item.view))
      .map((item) => ({ ...item, group: group.group })),
  )
  const filtered = available.filter((item) =>
    `${item.label} ${item.group}`.toLowerCase().includes(query.toLowerCase()),
  )
  return (
    <div
      className="command-backdrop"
      role="presentation"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <div
        className="command-palette"
        role="dialog"
        aria-modal="true"
        aria-label="Search workspace"
      >
        <div className="command-search">
          <Icon name="search" size={19} />
          <input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={`Search ${role.toLowerCase()} workspace...`}
          />
          <kbd>ESC</kbd>
        </div>
        <div className="command-context">
          <span>
            <Icon name="shield" size={13} />
            {role[0] + role.slice(1).toLowerCase()} navigation only
          </span>
          <small>{filtered.length} available destinations</small>
        </div>
        <div className="command-results">
          {filtered.map((item) => (
            <button
              key={`${item.group}-${item.label}`}
              className={item.view === currentView ? "active" : ""}
              onClick={() => onNavigate(item.view)}
            >
              <span>
                <Icon name={item.icon} size={17} />
              </span>
              <div>
                <b>{item.label}</b>
                <small>{item.group}</small>
              </div>
              {item.view === currentView ? (
                <em>Current</em>
              ) : (
                <Icon name="chevron" size={15} />
              )}
            </button>
          ))}
          {filtered.length === 0 && (
            <div className="command-empty">
              <Icon name="search" />
              <b>No matching destination</b>
              <p>
                Try a screen name such as timetable, history, or notifications.
              </p>
            </div>
          )}
        </div>
        <footer>
          <span>
            <kbd>↵</kbd> Open destination
          </span>
          <span>
            <kbd>ESC</kbd> Close
          </span>
          <b>Orario command</b>
        </footer>
      </div>
    </div>
  )
}

function Dashboard({
  role,
  identity,
  onTimetable,
}: {
  role: Role
  identity: UserIdentity
  onTimetable: () => void
}) {
  const timeGreeting = getTimeGreeting()
  const content =
    role === "ADMIN"
      ? {
          title: `${timeGreeting}, ${identity.greeting}`,
          subtitle: "Here’s what’s happening across academic operations today.",
          cards: [
            ["42", "Today’s classes"],
            ["2", "Active vacancies"],
            ["91%", "Rooms available"],
            ["v3.2", "Published timetable"],
          ],
        }
      : role === "FACULTY"
        ? {
            title: `${timeGreeting}, ${identity.greeting}`,
            subtitle:
              "Your teaching day is on track. One relevant vacancy is available.",
            cards: [
              ["1", "Current class"],
              ["3", "Classes remaining"],
              ["1", "Eligible vacancy"],
              ["4h 10m", "Available today"],
            ],
          }
        : {
            title: `${timeGreeting}, "Dr."${identity.greeting}`,
            subtitle: "Your Section B schedule is up to date.",
            cards: [
              ["1", "Next class"],
              ["4", "Classes remaining"],
              ["2", "Recent changes"],
              ["3", "Unread updates"],
            ],
          }
  return (
    <div className="page page-enter">
      <div className="dashboard-hero">
        <div>
          <div className="page-kicker">MONDAY · 14 OCTOBER 2026</div>
          <div className="page-title">{content.title}</div>
          <p>{content.subtitle}</p>
        </div>
        <Button onClick={onTimetable} icon="arrow">
          View live timetable
        </Button>
      </div>
      <div className="metric-grid">
        {content.cards.map(([value, label], index) => (
          <div className="metric-card" key={label}>
            <div className={`metric-icon metric-${index}`}>
              <Icon name={["calendar", "spark", "room", "check"][index]} />
            </div>
            <span>{label}</span>
            <b>{value}</b>
            <small>{index === 1 ? "Requires attention" : "Live data"}</small>
          </div>
        ))}
      </div>
      <div className="dashboard-columns">
        <div className="panel">
          <div className="panel-head">
            <div>
              <small>LIVE OPERATIONS</small>
              <b>Today’s session flow</b>
            </div>
            <Button variant="ghost" onClick={onTimetable}>
              Open schedule
            </Button>
          </div>
          <div className="flow-list">
            {[
              "Data Structures · TB-106",
              "Business Management · IET Amphitheatre",
              "Database Management · LRC-007",
              "Discrete Mathematics · EB2-206",
            ].map((item, i) => (
              <div key={item}>
                <span>{["09:00", "11:00", "14:00", "15:00"][i]}</span>
                <i className={i === 2 ? "attention" : ""} />
                <b>{item}</b>
                <small>
                  {i === 2 ? "Change-ready" : i < 2 ? "Completed" : "Upcoming"}
                </small>
              </div>
            ))}
          </div>
        </div>
        <div className="panel">
          <div className="panel-head">
            <div>
              <small>RECENT CHANGES</small>
              <b>Audit-friendly updates</b>
            </div>
            <Icon name="history" />
          </div>
          <div className="change-list">
            <div>
              <span className="change-purple">
                <Icon name="calendar" />
              </span>
              <p>
                <b>COA session rescheduled</b>
                <small>Old session retained · 8 min ago</small>
              </p>
            </div>
            <div>
              <span className="change-rose">
                <Icon name="bell" />
              </span>
              <p>
                <b>Section A room updated</b>
                <small>38 recipients notified · 26 min ago</small>
              </p>
            </div>
            <div>
              <span className="change-teal">
                <Icon name="check" />
              </span>
              <p>
                <b>Timetable v3.2 published</b>
                <small>Published by Ananya Sharma</small>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

type MasterKind = "students" | "sections" | "batches" | "electives" | "faculty" | "courses" | "rooms" | "slots" | "assignments"
type MasterConfig = {
  title: string
  singular: string
  description: string
  entity: string
  columns: string[]
  integrity: string
}

const masterConfigs: Record<MasterKind, MasterConfig> = {
  students: { title: "Students", singular: "student", description: "Review student academic scope.", entity: "STUDENT", columns: ["Student ID", "Name", "Email", "Section", "Batch"], integrity: "Section and batch relationships are enforced by the database." },
  sections: { title: "Sections", singular: "section", description: "Review academic sections.", entity: "SECTION", columns: ["Section ID", "Name", "Year", "Program"], integrity: "Sections are referenced by students, assignments, and sessions." },
  batches: { title: "Batches", singular: "batch", description: "Review section-owned batches.", entity: "BATCH", columns: ["Batch ID", "Name", "Section", "Section name"], integrity: "Every batch belongs to one section." },
  electives: { title: "Elective groups", singular: "group", description: "Review course elective groups.", entity: "ELECTIVE_GROUP", columns: ["Group ID", "Name", "Course", "Course name"], integrity: "Every elective group belongs to one course." },
  faculty: { title: "Faculty", singular: "faculty member", description: "Review faculty records.", entity: "FACULTY", columns: ["Faculty ID", "Name", "Email", "Department"], integrity: "Faculty ownership is enforced by authenticated email." },
  courses: { title: "Courses", singular: "course", description: "Review course records.", entity: "COURSE", columns: ["Course ID", "Name", "Credits"], integrity: "Courses are referenced by assignments and class sessions." },
  rooms: { title: "Rooms", singular: "room", description: "Review room capacity and status.", entity: "ROOM", columns: ["Room ID", "Number", "Type", "Capacity", "Status"], integrity: "Scheduling RPCs enforce availability and capacity." },
  slots: { title: "Time slots", singular: "time slot", description: "Review actual class time ranges.", entity: "TIME_SLOT", columns: ["Slot ID", "Start", "End"], integrity: "Conflict checks use overlapping time ranges." },
  assignments: { title: "Teaching assignments", singular: "assignment", description: "Review faculty course and scope eligibility.", entity: "TEACHING_ASSIGNMENT", columns: ["Assignment ID", "Faculty", "Course", "Section", "Batch"], integrity: "Assignments are the source of faculty eligibility." },
}

function MasterDataView({ kind }: { kind: MasterKind }) {
  const config = masterConfigs[kind] ?? masterConfigs.students
  const [query, setQuery] = useState("")
  const [rows, setRows] = useState<string[][]>([])
  const [selected, setSelected] = useState<string[] | null>(null)
  useEffect(() => {
    let active = true
    void getBackendMasterRows(kind).then((records) => {
      if (active) setRows(records)
    })
    return () => {
      active = false
    }
  }, [kind])
  const filtered = rows.filter((row) =>
    row.join(" ").toLowerCase().includes(query.toLowerCase()),
  )
  return (
    <div className="page page-enter">
      <div className="page-header">
        <div>
          <div className="breadcrumb">
            Admin <Icon name="chevron" size={12} /> Academic structure
          </div>
          <div className="page-title">{config.title}</div>
          <p>{config.description}</p>
        </div>
        <Button disabled>
          Database-managed
        </Button>
      </div>
      <div className="entity-banner">
        <span>{config.entity}</span>
        <div>
          <small>RELATIONAL ENTITY</small>
          <b>{rows.length} records</b>
        </div>
        <p>
          <Icon name="shield" size={14} />
          {config.integrity}
        </p>
      </div>
      <div className="data-layout">
        <section className="data-panel">
          <div className="data-toolbar">
            <label>
              <Icon name="search" size={16} />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={`Search ${config.title.toLowerCase()}...`}
              />
              {query && (
                <button onClick={() => setQuery("")} aria-label="Clear search">
                  <Icon name="close" size={13} />
                </button>
              )}
            </label>
            <button
              disabled
              title="Additional filters are available in the next data-management phase"
            >
              <Icon name="filter" size={15} />
              All records
            </button>
            <span>{filtered.length} results</span>
          </div>
          <DataTable
            columns={config.columns}
            rows={filtered}
            selected={selected}
            onSelect={setSelected}
          />
          {filtered.length === 0 && (
            <div className="data-empty">
              <Icon name="search" />
              <b>No matching records</b>
              <p>Try another name, identifier, or academic scope.</p>
              <Button variant="ghost" onClick={() => setQuery("")}>
                Clear search
              </Button>
            </div>
          )}
        </section>
        <aside className="record-details">
          {selected ? (
            <>
              <div className="record-detail-head">
                <span>{selected[1]?.slice(0, 2).toUpperCase()}</span>
                <div>
                  <small>{config.entity} RECORD</small>
                  <b>{selected[1] || selected[0]}</b>
                </div>
                <button
                  onClick={() => setSelected(null)}
                  aria-label="Close details"
                >
                  <Icon name="close" size={15} />
                </button>
              </div>
              <dl>
                {config.columns.map((column, index) => (
                  <div key={column}>
                    <dt>{column}</dt>
                    <dd>{selected[index]}</dd>
                  </div>
                ))}
              </dl>
              <div className="record-audit">
                <Icon name="shield" />
                <p>
                  <b>Referential scope intact</b>
                  <span>
                    This record satisfies the visible relationship constraints.
                  </span>
                </p>
              </div>
            </>
          ) : (
            <div className="details-empty">
              <span>
                <Icon name="grid" />
              </span>
              <b>Select a record</b>
              <p>Review its schema fields and relationship scope here.</p>
            </div>
          )}
        </aside>
      </div>
    </div>
  )
}

function DataTable({
  columns,
  rows,
  selected,
  onSelect,
}: {
  columns: string[]
  rows: string[][]
  selected: string[] | null
  onSelect: (row: string[]) => void
}) {
  const columnClass = `data-cols-${columns.length}`
  return (
    <div className="data-table">
      <div className={`data-row data-header ${columnClass}`}>
        {columns.map((column) => (
          <span key={column}>{column.replace("_", " ")}</span>
        ))}
        <span>DETAILS</span>
      </div>
      {rows.map((row) => (
        <button
          className={`data-row ${columnClass} ${
            selected?.[0] === row[0] ? "selected" : ""
          }`}
          key={row[0]}
          onClick={() => onSelect(row)}
        >
          {row.map((cell, index) => (
            <span
              key={`${row[0]}-cell-${index}`}
              className={`${index === 0 ? "id-cell" : ""} ${
                cell === "AVAILABLE"
                  ? "available-cell"
                  : cell === "MAINTENANCE"
                    ? "maintenance-cell"
                    : ""
              }`}
            >
              {cell}
            </span>
          ))}
          <span>
            <Icon name="chevron" size={14} />
          </span>
        </button>
      ))}
    </div>
  )
}

function TimetableManagement({
  publishedV4,
  timetables,
  onBuilder,
  onPublish,
}: {
  publishedV4: boolean
  timetables: BackendTimetable[]
  onBuilder: () => void
  onPublish: () => void
}) {
  const versions = [
    {
      version: publishedV4 ? "4.0" : "4.0",
      semester: "Semester 3",
      year: "2026–27",
      status: publishedV4 ? "PUBLISHED" : "DRAFT",
      updated: publishedV4 ? "Published just now" : "Edited 12 min ago",
      sessions: "186 sessions",
    },
    {
      version: "3.2",
      semester: "Semester 3",
      year: "2026–27",
      status: publishedV4 ? "ARCHIVED" : "PUBLISHED",
      updated: "Published 14 Oct, 9:15 AM",
      sessions: "184 sessions",
    },
    {
      version: "3.1",
      semester: "Semester 3",
      year: "2026–27",
      status: "ARCHIVED",
      updated: "Archived 14 Oct",
      sessions: "182 sessions",
    },
  ]
  return (
    <div className="page page-enter">
      <div className="page-header">
        <div>
          <div className="breadcrumb">
            Admin <Icon name="chevron" size={12} /> Timetable versions
          </div>
          <div className="page-title">Timetable management</div>
          <p>
            Control drafts, published versions, and immutable publication
            history.
          </p>
        </div>
        <Button onClick={onBuilder} icon="arrow">
          Create timetable draft
        </Button>
      </div>
      <div className="management-metrics">
        <div>
          <span>
            <Icon name="check" />
          </span>
          <p>
            <small>ACTIVE VERSION</small>
            <b>{publishedV4 ? "Version 4.0" : "Version 3.2"}</b>
            <em>Published</em>
          </p>
        </div>
        <div>
          <span>
            <Icon name="settings" />
          </span>
          <p>
            <small>OPEN DRAFT</small>
            <b>{publishedV4 ? "No active draft" : "Version 4.0"}</b>
            <em>{publishedV4 ? "Create when ready" : "Ready to validate"}</em>
          </p>
        </div>
        <div>
          <span>
            <Icon name="calendar" />
          </span>
          <p>
            <small>ACADEMIC PERIOD</small>
            <b>Semester 3</b>
            <em>2026–27</em>
          </p>
        </div>
        <div>
          <span>
            <Icon name="history" />
          </span>
          <p>
            <small>LAST PUBLISHED</small>
            <b>{publishedV4 ? "Just now" : "14 October"}</b>
            <em>By Ananya Sharma</em>
          </p>
        </div>
      </div>
      <section className="versions-panel">
        <div className="versions-toolbar">
          <div>
            <small>TIMETABLE RECORDS</small>
            <b>Version history</b>
          </div>
          <div>
            <button>
              <Icon name="search" size={15} />
              Search versions
            </button>
            <button>
              <Icon name="filter" size={15} />
              Semester 3
            </button>
          </div>
        </div>
        <div className="versions-table">
          <div className="versions-row versions-header">
            <span>Version</span>
            <span>Academic period</span>
            <span>Sessions</span>
            <span>Status</span>
            <span>Last activity</span>
            <span>Action</span>
          </div>
          {versions.map((item, index) => (
            <div
              className={`versions-row ${index === 0 ? "current-version" : ""}`}
              key={item.version}
            >
              <span>
                <i>v{item.version}</i>
                <div>
                  <b>Timetable {item.version}</b>
                  <small>
                    {index === 0
                      ? "Current working version"
                      : "Preserved version"}
                  </small>
                </div>
              </span>
              <span>
                <b>{item.semester}</b>
                <small>{item.year}</small>
              </span>
              <span>{item.sessions}</span>
              <span>
                <em
                  className={`version-status status-${item.status.toLowerCase()}`}
                >
                  <i />
                  {item.status}
                </em>
              </span>
              <span>{item.updated}</span>
              <span>
                {item.status === "DRAFT" ? (
                  <Button variant="ghost" onClick={onBuilder}>
                    Continue editing
                  </Button>
                ) : item.status === "PUBLISHED" && !publishedV4 ? (
                  <Button variant="ghost" onClick={onPublish}>
                    View readiness
                  </Button>
                ) : (
                  <button className="row-icon" aria-label="View version">
                    <Icon name="chevron" size={15} />
                  </button>
                )}
              </span>
            </div>
          ))}
        </div>
      </section>
      {!publishedV4 && (
        <div className="draft-callout">
          <span>
            <Icon name="spark" />
          </span>
          <div>
            <small>DRAFT 4.0</small>
            <b>A validated draft is waiting for publication.</b>
            <p>
              Review the conflict report and publication scope before making it
              live.
            </p>
          </div>
          <Button onClick={onPublish} icon="arrow">
            Review and publish
          </Button>
        </div>
      )}
    </div>
  )
}

function TimetableBuilder({
  added,
  onAdd,
  onPublish,
}: {
  added: boolean
  onAdd: () => void
  onPublish: () => void
}) {
  const adding = false
  const [maintenanceRoom, setMaintenanceRoom] = useState(false)
  return (
    <div className="page page-enter">
      <div className="builder-page-head">
        <div>
          <div className="breadcrumb">
            Admin <Icon name="chevron" size={12} /> Draft 4.0
          </div>
          <div className="page-title">Timetable builder</div>
          <p>
            Build `CLASS_SESSION` records inside the draft timetable context.
          </p>
        </div>
        <div>
          <span className="draft-badge">
            <i />
            DRAFT · v4.0
          </span>
          <Button variant="secondary" disabled>
            Draft autosaved
          </Button>
          <Button onClick={onPublish} icon="arrow">
            Review publish
          </Button>
        </div>
      </div>
      <div className="builder-layout">
        <aside className="builder-form">
          <div className="builder-form-head">
            <span>
              <Icon name="calendar" />
            </span>
            <div>
              <small>NEW CLASS_SESSION</small>
              <b>Add session to draft</b>
            </div>
          </div>
          <div className="builder-field">
            <small>COURSE</small>
            <button>
              <span>
                <b>Computer Organization</b>
                <em>CS1134</em>
              </span>
              ⌄
            </button>
          </div>
          <div className="builder-field-row">
            <div className="builder-field">
              <small>SECTION</small>
              <button>
                <span>
                  <b>Section B</b>
                  <em>Year 2 · CSE</em>
                </span>
                ⌄
              </button>
            </div>
            <div className="builder-field">
              <small>BATCH / GROUP</small>
              <button>
                <span>
                  <b>Entire section</b>
                  <em>No subgroup</em>
                </span>
                ⌄
              </button>
            </div>
          </div>
          <div className="builder-field">
            <small>FACULTY · ACTIVE ASSIGNMENT</small>
            <button>
              <span>
                <b>Dr. Anamika Satrawal</b>
                <em>Assigned to CS1134 · Section B</em>
              </span>
              <Icon name="check" size={15} />
            </button>
          </div>
          <div className="builder-field-row">
            <div className="builder-field">
              <small>DAY</small>
              <button>
                <span>
                  <b>Friday</b>
                  <em>18 October</em>
                </span>
                ⌄
              </button>
            </div>
            <div className="builder-field">
              <small>TIME SLOT</small>
              <button>
                <span>
                  <b>12:00–12:50 PM</b>
                  <em>50 minutes</em>
                </span>
                ⌄
              </button>
            </div>
          </div>
          <div className="builder-field">
            <small>ROOM · SELECT TO TEST VALIDATION</small>
            <button
              className={maintenanceRoom ? "field-invalid" : ""}
              onClick={() => setMaintenanceRoom(!maintenanceRoom)}
            >
              <span>
                <b>{maintenanceRoom ? "TB-112" : "TB-105"}</b>
                <em>
                  {maintenanceRoom
                    ? "Lab · Capacity 40 · Maintenance"
                    : "Lecture · Capacity 60 · Available"}
                </em>
              </span>
              <Icon name={maintenanceRoom ? "close" : "check"} size={15} />
            </button>
          </div>
          {maintenanceRoom && (
            <div className="conflict-alert">
              <span>
                <Icon name="close" size={16} />
              </span>
              <div>
                <small>SCHEDULING CONFLICT</small>
                <b>TB-112 is unavailable</b>
                <p>
                  This room has `Status = MAINTENANCE` and capacity 40 is below
                  the Section B strength of 48. Select another room before
                  adding the session.
                </p>
              </div>
            </div>
          )}
          <div
            className={`builder-validation ${
              maintenanceRoom ? "validation-failed" : ""
            }`}
          >
            <div>
              <span>
                <Icon name="shield" size={15} />
                Conflict validation
              </span>
              <b>{maintenanceRoom ? "2 checks failed" : "All clear"}</b>
            </div>
            {[
              "Faculty range available",
              "Section B range available",
              maintenanceRoom ? "TB-112 under maintenance" : "TB-105 available",
              maintenanceRoom
                ? "Capacity 40 < strength 48"
                : "Capacity 60 ≥ strength 48",
            ].map((item, index) => (
              <span
                className={maintenanceRoom && index > 1 ? "failed" : ""}
                key={item}
              >
                <Icon
                  name={maintenanceRoom && index > 1 ? "close" : "check"}
                  size={12}
                />
                {item}
              </span>
            ))}
          </div>
          <Button
            disabled
            className="builder-add"
          >
            {adding ? (
              <>
                <span className="spinner" />
                Adding session...
              </>
            ) : added ? (
              <>
                <Icon name="check" size={15} />
                Session added to draft
              </>
            ) : maintenanceRoom ? (
              <>Resolve room conflicts first</>
            ) : (
              <>
                Draft insertion requires an authorized RPC
              </>
            )}
          </Button>
        </aside>
        <section className="builder-canvas">
          <div className="builder-canvas-head">
            <div>
              <small>FRIDAY · SECTION B</small>
              <b>Draft schedule preview</b>
            </div>
            <div>
              <button>Day</button>
              <button className="active">Week</button>
            </div>
          </div>
          <div className="builder-ruler">
            {slots.map((slot) => (
              <span key={slot}>{slot.split("–")[0]}</span>
            ))}
          </div>
          <div className="builder-lane">
            <div className="lane-label">
              <span>B</span>
              <div>
                <b>Section B</b>
                <small>Year 2 · CSE</small>
              </div>
            </div>
            <div className="lane-track">
              {[0, 1, 2, 3, 4, 5, 6].map((slot) => (
                <div key={slot} className="lane-slot">
                  {slot === 0 && (
                    <span className="lane-class lane-blue">
                      <b>CS1134</b>
                      <small>TB-105</small>
                    </span>
                  )}
                  {slot === 2 && (
                    <span className="lane-class lane-teal">
                      <b>CS1131</b>
                      <small>TB-106</small>
                    </span>
                  )}
                  {slot === 4 && (
                    <span className="lane-class lane-purple">
                      <b>CC1103</b>
                      <small>IET Amp.</small>
                    </span>
                  )}
                  {slot === 3 && added && (
                    <span className="lane-class lane-new">
                      <Icon name="spark" size={11} />
                      <b>CS1134</b>
                      <small>TB-105 · New</small>
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
          <div className="builder-lane muted">
            <div className="lane-label">
              <span>R</span>
              <div>
                <b>TB-105</b>
                <small>Room utilization</small>
              </div>
            </div>
            <div className="lane-track">
              {[0, 1, 2, 3, 4, 5, 6].map((slot) => (
                <div key={slot} className="lane-slot">
                  {(slot === 0 || slot === 2) && <i />}
                  {slot === 3 && added && <i className="new-usage" />}
                </div>
              ))}
            </div>
          </div>
          {!added ? (
            <div className="builder-empty">
              <Icon name="calendar" />
              <b>Session ready to place</b>
              <p>Validated selections will appear on the draft canvas.</p>
            </div>
          ) : (
            <div className="builder-success">
              <Icon name="check" />
              <div>
                <small>DRAFT UPDATED</small>
                <b>Computer Organization was added Friday at 12:00 PM.</b>
              </div>
            </div>
          )}
          <div className="builder-schema-note">
            <Icon name="shield" />
            <p>
              <b>Schema-aligned draft</b>
              <span>
                Timetable_ID, Course_ID, Faculty_ID, Section_ID, Room_ID, and
                Slot_ID will be stored with the new session.
              </span>
            </p>
          </div>
        </section>
      </div>
    </div>
  )
}

function PublishTimetable({
  draftReady,
  published,
  loading,
  onPublish,
  onOpen,
  draft,
}: {
  draftReady: boolean
  published: boolean
  loading: boolean
  onPublish: () => Promise<void>
  onOpen: () => void
  draft?: BackendTimetable
}) {
  const [confirmed, setConfirmed] = useState(true)
  return (
    <div className="page page-enter">
      <div className="page-header">
        <div>
          <div className="breadcrumb">
            Admin <Icon name="chevron" size={12} /> Publish
          </div>
          <div className="page-title">Publish timetable</div>
          <p>
            Validate version 4.0 before making it the active academic schedule.
          </p>
        </div>
      </div>
      {published ? (
        <div className="publish-complete">
          <span>
            <Icon name="check" size={26} />
          </span>
          <small>PUBLICATION COMPLETE</small>
          <b>Timetable version 4.0 is now live</b>
          <p>
            The previous version was archived, sessions were activated, and
            targeted users received `CLASS_UPDATED` notifications.
          </p>
          <div>
            <span>
              <small>PUBLISHED AT</small>
              <b>14 Oct 2026 · 1:46 PM</b>
            </span>
            <span>
              <small>PUBLISHED BY</small>
              <b>Ananya Sharma</b>
            </span>
            <span>
              <small>ACTIVE SESSIONS</small>
              <b>186</b>
            </span>
          </div>
          <Button onClick={onOpen} icon="arrow">
            Open published timetable
          </Button>
        </div>
      ) : (
        <div className="publish-layout">
          <section className="publish-main">
            <div className="publish-summary">
              <div>
                <span>v4.0</span>
                <p>
                  <small>DRAFT TIMETABLE</small>
                  <b>Semester 3 · 2026–27</b>
                  <em>Last edited 12 minutes ago</em>
                </p>
              </div>
              <StatusBadge status="SCHEDULED" />
            </div>
            <div className="readiness-head">
              <div>
                <small>PUBLICATION READINESS</small>
                <b>
                  {draftReady
                    ? "Ready to publish"
                    : "Ready with no new draft sessions"}
                </b>
              </div>
              <span>{draftReady ? "100%" : "96%"}</span>
            </div>
            <div className="readiness-bar">
              <i style={{ width: draftReady ? "100%" : "96%" }} />
            </div>
            <div className="publish-checks">
              {[
                [
                  "Schedule conflicts",
                  "0",
                  "Faculty, room, section and subgroup ranges",
                ],
                ["Invalid rooms", "0", "No maintenance rooms selected"],
                [
                  "Capacity warnings",
                  "0",
                  "Every room supports assigned strength",
                ],
                [
                  "Teaching assignments",
                  "Verified",
                  "All faculty-course-section links active",
                ],
                [
                  "Unscoped sessions",
                  "0",
                  "Section, batch and group scope complete",
                ],
                [
                  "Notification audience",
                  "1,284",
                  "Affected students and faculty",
                ],
              ].map(([label, value, detail]) => (
                <div key={label}>
                  <span>
                    <Icon name="check" />
                  </span>
                  <p>
                    <b>{label}</b>
                    <small>{detail}</small>
                  </p>
                  <em>{value}</em>
                </div>
              ))}
            </div>
            <div className="publish-change-summary">
              <small>CHANGES FROM VERSION 3.2</small>
              <div>
                <span>
                  <b>{draftReady ? "2" : "1"}</b>sessions added
                </span>
                <span>
                  <b>1</b>room updated
                </span>
                <span>
                  <b>0</b>sessions removed
                </span>
              </div>
            </div>
          </section>
          <aside className="publish-aside">
            <div className="publish-warning">
              <Icon name="history" />
              <p>
                <b>Publishing creates history</b>
                <span>
                  Version 3.2 will move to `ARCHIVED`. It will remain available
                  and cannot be overwritten.
                </span>
              </p>
            </div>
            <div className="recipient-preview">
              <small>TARGETED RECIPIENTS</small>
              <b>Publication notifications</b>
              <div>
                <span>Students</span>
                <strong>1,236</strong>
              </div>
              <div>
                <span>Faculty</span>
                <strong>48</strong>
              </div>
              <div>
                <span>Unrelated users</span>
                <strong>0</strong>
              </div>
            </div>
            <label className="publish-confirm">
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(event) => setConfirmed(event.target.checked)}
              />
              <span>
                <b>I confirm this timetable is ready</b>
                <small>
                  The published version becomes the source of truth.
                </small>
              </span>
            </label>
            <Button
              onClick={onPublish}
              disabled={loading || !confirmed}
              className="publish-button"
            >
              {loading ? (
                <>
                  <span className="spinner" />
                  Publishing version 4.0...
                </>
              ) : (
                <>
                  Publish timetable <Icon name="arrow" size={15} />
                </>
              )}
            </Button>
            <p className="publish-footnote">
              <Icon name="shield" size={13} />
              Publication is recorded with timestamp and administrator identity.
            </p>
          </aside>
        </div>
      )}
    </div>
  )
}

function AvailabilityView({
  sessions,
  onManage,
}: {
  sessions: Session[]
  onManage: (session: Session) => void
}) {
  const ownSessions = sessions.filter(
    (session) =>
      session.faculty === "Dr. Manushi Gupta" && !session.rescheduleOf,
  )
  const todayClass = ownSessions.find((session) => session.id === 4)
  const replacement = sessions.find((session) => session.id === 19)
  const unavailable = new Set(
    ownSessions
      .filter((session) => session.status !== "CANCELLED")
      .map((session) => `${session.day}-${session.slot}`),
  )
  const preferred = new Set(["Tuesday-4", "Wednesday-5", "Friday-1"])
  return (
    <div className="page page-enter">
      <div className="page-header">
        <div>
          <div className="breadcrumb">
            Workspace <Icon name="chevron" size={12} /> Availability
          </div>
          <div className="page-title">My availability</div>
          <p>
            Only conflict-free periods calculated from your actual class time
            ranges.
          </p>
        </div>
        <div className="header-actions">
          <span className="published-badge">
            <i />
            <b>Live availability</b> · Week 14
          </span>
        </div>
      </div>
      {todayClass && (
        <div
          className={`own-class-banner ${
            todayClass.status !== "SCHEDULED" ? "own-class-changed" : ""
          }`}
        >
          <span>
            <Icon name="calendar" />
          </span>
          <div>
            <small>TODAY’S ASSIGNED CLASS</small>
            <b>Discrete Mathematics · Section B</b>
            <p>
              3:00–3:50 PM · EB2-206 · {todayClass.status.replace("_", " ")}
            </p>
          </div>
          <div className="ownership-rule">
            <Icon name="shield" size={14} />
            <span>You may change only classes assigned to you.</span>
          </div>
          {todayClass.status === "SCHEDULED" && (
            <Button onClick={() => onManage(todayClass)} icon="arrow">
              Find another time
            </Button>
          )}
        </div>
      )}
      {replacement && (
        <div className="availability-success">
          <Icon name="check" />
          <div>
            <small>RESCHEDULED SUCCESSFULLY</small>
            <b>Discrete Mathematics now meets Friday, 10:00–10:50 AM.</b>
          </div>
        </div>
      )}
      <div className="availability-layout">
        <section className="availability-panel">
          <div className="availability-head">
            <div>
              <small>WEEKLY AVAILABILITY</small>
              <b>Dr. Manushi Gupta</b>
            </div>
            <div className="availability-legend">
              <span>
                <i className="free-dot" />
                Available
              </span>
              <span>
                <i className="preferred-dot" />
                Recommended
              </span>
              <span>
                <i className="busy-dot" />
                Teaching
              </span>
            </div>
          </div>
          <div className="availability-grid">
            <div className="availability-corner">TIME</div>
            {days.map((day) => (
              <div className="availability-day" key={day}>
                {day.slice(0, 3)}
                <small>{14 + days.indexOf(day)} OCT</small>
              </div>
            ))}
            {slots.map((time, slotIndex) => (
              <div className="availability-row" key={time}>
                <div className="availability-time">{time}</div>
                {days.map((day) => {
                  const key = `${day}-${slotIndex}`
                  const busy = unavailable.has(key)
                  const recommended = preferred.has(key) && !busy
                  return (
                    <button
                      key={key}
                      className={
                        busy
                          ? "availability-busy"
                          : recommended
                            ? "availability-preferred"
                            : "availability-free"
                      }
                      disabled={busy}
                      onClick={() =>
                        recommended && todayClass && onManage(todayClass)
                      }
                    >
                      <Icon
                        name={busy ? "book" : recommended ? "spark" : "check"}
                        size={13}
                      />
                      <span>
                        {busy
                          ? "Teaching"
                          : recommended
                            ? "Best fit"
                            : "Available"}
                      </span>
                      {recommended && <small>Choose</small>}
                    </button>
                  )
                })}
              </div>
            ))}
          </div>
        </section>
        <aside className="availability-aside">
          <div className="availability-score">
            <span>78%</span>
            <div>
              <small>WEEKLY CAPACITY</small>
              <b>19 free periods</b>
            </div>
          </div>
          <div className="aside-section">
            <small>RECOMMENDED FOR RESCHEDULING</small>
            {[
              ["Friday", "10:00–10:50", "Best fit"],
              ["Tuesday", "2:00–2:50", "Room change"],
              ["Wednesday", "3:00–3:50", "Available"],
            ].map(([day, time, label], index) => (
              <button
                key={day}
                onClick={() =>
                  index === 0 && todayClass && onManage(todayClass)
                }
                disabled={index !== 0}
              >
                <span>{day.slice(0, 3)}</span>
                <div>
                  <b>{time}</b>
                  <small>{label}</small>
                </div>
                {index === 0 && <Icon name="chevron" size={14} />}
              </button>
            ))}
          </div>
          <div className="availability-rule">
            <Icon name="shield" />
            <p>
              <b>Availability is validated</b>
              <span>
                Faculty, section, room, batch, and elective-group overlaps use
                actual start and end times.
              </span>
            </p>
          </div>
        </aside>
      </div>
    </div>
  )
}

function VacantPeriodsView({
  sessions,
  assignments,
  onClaim,
}: {
  sessions: Session[]
  assignments: BackendAssignment[]
  onClaim: (session: Session) => void
}) {
  const vacancy = sessions.length ? "open" : "none"
  const session = sessions[0]
  const assignment =
    assignments.find(
      (candidate) => candidate.section_id === session?.sectionId,
    ) ?? assignments[0]
  const assignmentCourse = Array.isArray(assignment?.course)
    ? assignment.course[0]
    : assignment?.course
  return (
    <div className="page page-enter">
      <div className="page-header">
        <div>
          <div className="breadcrumb">
            Scheduling <Icon name="chevron" size={12} /> Eligible vacancies
          </div>
          <div className="page-title">Vacant periods</div>
          <p>
            Only cancellations matching your active Section B teaching
            assignments appear here.
          </p>
        </div>
        <div className="header-actions">
          <span className="published-badge">
            <i />
            <b>Eligibility live</b> · Auto-scoped
          </span>
        </div>
      </div>
      <div className="vacancy-scope-bar">
        <Icon name="shield" />
        <div>
          <small>YOUR ELIGIBILITY SCOPE</small>
          <b>Dr. Manushi Gupta · Section B · Discrete Mathematics</b>
        </div>
        <span>1 active assignment</span>
      </div>
      {vacancy === "none" ? (
        <div className="vacancy-empty">
          <span>
            <Icon name="spark" size={25} />
          </span>
          <b>No eligible vacant periods right now</b>
          <p>
            When a relevant Section B class is cancelled, it will appear here in
            real time. Unrelated sections and courses are never shown.
          </p>
          <div>
            <Icon name="check" size={14} />
            Eligibility monitoring is active
          </div>
        </div>
      ) : (
        <div className="vacancy-page-layout">
          <section className="vacancy-detail-card">
            <div className="vacancy-detail-head">
              <span>
                <Icon name="spark" />
              </span>
              <div>
                <small>ELIGIBLE VACANCY · AVAILABLE NOW</small>
                <b>
                  {session?.day} · {session ? slots[session.slot] : ""}
                </b>
              </div>
              <StatusBadge status="CANCELLED" />
            </div>
            <div className="vacancy-original">
              <small>ORIGINAL CANCELLED CLASS</small>
              <div>
                <span>{session?.code}</span>
                <p>
                  <b>{session?.course}</b>
                  <small>
                    {session?.faculty} · Section {session?.section} ·{" "}
                    {session?.room}
                  </small>
                </p>
              </div>
            </div>
            <div className="vacancy-facts">
              <div>
                <small>AFFECTED SCOPE</small>
                <b>Section {session?.section}</b>
              </div>
              <div>
                <small>CLAIM DEADLINE</small>
                <b>Before the session begins</b>
              </div>
              <div>
                <small>ROOM</small>
                <b>{session?.room}</b>
              </div>
              <div>
                <small>TIME REMAINING</small>
                <b>Validated when submitted</b>
              </div>
            </div>
            <>
                <div className="eligible-course-preview">
                  <div>
                    <Icon name="book" />
                    <p>
                      <small>YOUR VALID COURSE</small>
                      <b>
                        {assignmentCourse?.course_name ?? "No eligible course"}
                      </b>
                    </p>
                  </div>
                  <span>
                    <Icon name="check" size={13} />
                    Assigned
                  </span>
                </div>
                <Button
                  onClick={() => session && onClaim(session)}
                  icon="arrow"
                  className="claim-wide"
                  disabled={!session || assignments.length === 0}
                >
                  Review eligibility and claim
                </Button>
            </>
          </section>
          <aside className="claim-rules-card">
            <small>BEFORE YOU CLAIM</small>
            <b>Every rule is enforced</b>
            {[
              "Assigned to affected section",
              "Choose only your assigned course",
              "Claim before the period starts",
              "No faculty or section overlap",
              "Room available and sufficient",
              "Only one successful claimant",
            ].map((rule) => (
              <div key={rule}>
                <Icon name="check" size={13} />
                {rule}
              </div>
            ))}
            <p>
              <Icon name="shield" size={15} />
              The final claim is secured atomically. If another eligible faculty
              wins first, this action becomes unavailable.
            </p>
          </aside>
        </div>
      )}
    </div>
  )
}

function CreateExtraClassView({
  created,
  loading,
  assignments,
  rooms,
  timeSlots,
  timetable,
  onCreate,
}: {
  created: boolean
  loading: boolean
  assignments: BackendAssignment[]
  rooms: BackendRoom[]
  timeSlots: BackendTimeSlot[]
  timetable?: BackendTimetable
  onCreate: (
    input: Parameters<typeof createBackendExtraClass>[0],
  ) => Promise<void>
}) {
  const assignment = assignments[0]
  const room = rooms.find((candidate) => candidate.status === "AVAILABLE")
  const timeSlot = timeSlots[0]
  const classDate = new Date(Date.now() + 86_400_000)
    .toISOString()
    .slice(0, 10)
  const canCreate = Boolean(assignment && room && timeSlot && timetable)
  const create = () => {
    if (!assignment || !room || !timeSlot || !timetable) return
    void onCreate({
      timetableId: timetable.timetable_id,
      courseId: assignment.course_id,
      sectionId: assignment.section_id,
      batchId: assignment.batch_id,
      roomId: room.room_id,
      slotId: timeSlot.slot_id,
      classDate,
    })
  }
  return (
    <div className="page page-enter">
      <div className="page-header">
        <div>
          <div className="breadcrumb">
            Scheduling <Icon name="chevron" size={12} /> Extra class
          </div>
          <div className="page-title">Create extra class</div>
          <p>Schedule your assigned course into a naturally free period.</p>
        </div>
      </div>
      <div className="extra-definition">
        <span>
          <Icon name="spark" />
        </span>
        <div>
          <small>EXTRA ≠ VACANCY UTILIZATION</small>
          <b>This period is naturally free—not released by a cancellation.</b>
          <p>
            The new session will use `Class_Type = EXTRA` and will not set
            `Vacancy_Of`.
          </p>
        </div>
      </div>
      <div className="extra-layout">
        <section className="extra-form-card">
          <div className="extra-section-head">
            <span>01</span>
            <div>
              <small>TEACHING ASSIGNMENT</small>
              <b>Select your course and scope</b>
            </div>
          </div>
          <div className="extra-field-grid">
            <button className="extra-field selected">
              <small>COURSE · ASSIGNED TO YOU</small>
              <b>Discrete Mathematics</b>
              <span>
                CS1142 <Icon name="check" size={13} />
              </span>
            </button>
            <button className="extra-field">
              <small>SECTION</small>
              <b>Section B</b>
              <span>Year 2 · CSE</span>
            </button>
          </div>
          <div className="extra-section-head">
            <span>02</span>
            <div>
              <small>NATURALLY FREE PERIOD</small>
              <b>Choose date, time, and room</b>
            </div>
          </div>
          <div className="extra-field-grid extra-three">
            <button className="extra-field">
              <small>DATE</small>
              <b>Thursday, 17 October</b>
              <span>
                <Icon name="calendar" size={13} /> Week 14
              </span>
            </button>
            <button className="extra-field selected">
              <small>TIME · AVAILABLE</small>
              <b>2:00–2:50 PM</b>
              <span>
                <Icon name="check" size={13} /> Free period
              </span>
            </button>
            <button className="extra-field">
              <small>ROOM · AVAILABLE</small>
              <b>EB2-206</b>
              <span>Capacity 60</span>
            </button>
          </div>
          <div className="extra-validation">
            <div className="validation-head">
              <span>
                <Icon name="shield" size={16} />
                Pre-scheduling validation
              </span>
              <b>6 of 6 passed</b>
            </div>
            <div className="extra-checks">
              {[
                ["Faculty", "Available"],
                ["Section B", "Available"],
                ["Room EB2-206", "Available"],
                ["Capacity", "60 ≥ 48"],
                ["Batch/group", "No overlap"],
                ["Time range", "2:00–2:50 clear"],
              ].map(([label, value]) => (
                <div key={label}>
                  <Icon name="check" size={13} />
                  <span>{label}</span>
                  <b>{value}</b>
                </div>
              ))}
            </div>
          </div>
          {!created ? (
            <div className="extra-actions">
              <div>
                <Icon name="bell" size={15} />
                <span>
                  48 Section B students will receive an `EXTRA_CLASS`
                  notification.
                </span>
              </div>
              <Button onClick={create} disabled={loading || !canCreate}>
                {loading ? (
                  <>
                    <span className="spinner" />
                    Creating class...
                  </>
                ) : (
                  <>
                    Create extra class <Icon name="arrow" size={15} />
                  </>
                )}
              </Button>
            </div>
          ) : (
            <div className="extra-success">
              <span>
                <Icon name="check" />
              </span>
              <div>
                <small>EXTRA CLASS CREATED</small>
                <b>Discrete Mathematics · Thursday · 2:00–2:50 PM</b>
                <p>
                  The new session is live in faculty and student timetables.
                </p>
              </div>
            </div>
          )}
        </section>
        <aside className="extra-preview">
          <div className="preview-label">SESSION PREVIEW</div>
          <ClassCard
            session={{
              id: 22,
              day: "Thursday",
              slot: 4,
              course: "Discrete Mathematics",
              code: "CS1142",
              faculty: "Dr. Manushi Gupta",
              room: "EB2-206",
              section: "B",
              status: "EXTRA",
              tone: "teal",
            }}
            canCancel={false}
            onCancel={() => undefined}
          />
          <dl>
            <div>
              <dt>Class type</dt>
              <dd>EXTRA</dd>
            </div>
            <div>
              <dt>Status</dt>
              <dd>SCHEDULED</dd>
            </div>
            <div>
              <dt>Vacancy link</dt>
              <dd>None</dd>
            </div>
            <div>
              <dt>Recipients</dt>
              <dd>Section B</dd>
            </div>
          </dl>
          <div className="extra-rule">
            <Icon name="shield" />
            <p>
              <b>Schema-correct session</b>
              <span>
                This class is tied to your teaching assignment and the published
                timetable context.
              </span>
            </p>
          </div>
        </aside>
      </div>
    </div>
  )
}

function CancellationDialog({
  session,
  onClose,
  onConfirm,
}: {
  session: Session
  onClose: () => void
  onConfirm: () => void
}) {
  const [loading, setLoading] = useState(false)
  const confirm = () => {
    setLoading(true)
    window.setTimeout(onConfirm, 650)
  }
  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cancel-title"
      >
        <div className="modal-head">
          <span className="modal-icon">
            <Icon name="calendar" />
          </span>
          <div>
            <small>SESSION CHANGE</small>
            <div id="cancel-title">Cancel this class?</div>
          </div>
          <button onClick={onClose} aria-label="Close dialog">
            <Icon name="close" />
          </button>
        </div>
        <div className="session-summary">
          <div>
            <small>COURSE</small>
            <b>{session.course}</b>
            <span>{session.code}</span>
          </div>
          <div className="summary-grid">
            <p>
              <small>SECTION</small>
              <b>Section {session.section}</b>
            </p>
            <p>
              <small>FACULTY</small>
              <b>{session.faculty}</b>
            </p>
            <p>
              <small>DATE & TIME</small>
              <b>
                {session.day.slice(0, 3)}, {14 + days.indexOf(session.day)} Oct
                · {slots[session.slot]}
              </b>
            </p>
            <p>
              <small>ROOM</small>
              <b>{session.room}</b>
            </p>
          </div>
        </div>
        <div className="preserve-note">
          <Icon name="history" />
          <p>
            <b>History will be preserved</b>
            <span>
              This class will be marked cancelled. The original schedule will
              remain available in history, and an exact-slot vacancy will be
              created.
            </span>
          </p>
        </div>
        <div className="notify-note">
          <Icon name="bell" size={16} />
          Only affected students and eligible Section B faculty will be
          notified.
        </div>
        <div className="modal-actions">
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            Keep class
          </Button>
          <Button variant="danger" onClick={confirm} disabled={loading}>
            {loading ? (
              <>
                <span className="spinner" />
                Updating session...
              </>
            ) : (
              "Confirm cancellation"
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}

function ClaimDialog({
  session,
  assignments,
  onClose,
  onConfirm,
}: {
  session: Session
  assignments: BackendAssignment[]
  onClose: () => void
  onConfirm: (courseId: number) => Promise<void>
}) {
  const [selected, setSelected] = useState(assignments[0]?.course_id ?? 0)
  const [loading, setLoading] = useState(false)
  const [validationState, setValidationState] =
    useState<"AVAILABLE" | "CLAIMED" | "EXPIRED">("AVAILABLE")
  const selectedAssignment =
    assignments.find((assignment) => assignment.course_id === selected) ??
    assignments[0]
  const selectedCourse = Array.isArray(selectedAssignment?.course)
    ? selectedAssignment.course[0]
    : selectedAssignment?.course
  const confirm = async () => {
    if (!selected) return
    setLoading(true)
    try {
      await onConfirm(selected)
    } finally {
      setLoading(false)
    }
  }
  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <div
        className="modal claim-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="claim-title"
      >
        <div className="modal-head">
          <span className="modal-icon claim-icon">
            <Icon name="spark" />
          </span>
          <div>
            <small>ELIGIBLE VACANCY</small>
            <div id="claim-title">Claim vacant period</div>
          </div>
          <button onClick={onClose} aria-label="Close dialog">
            <Icon name="close" />
          </button>
        </div>
        <div className="claim-context">
          <div>
            <small>ORIGINAL COURSE</small>
            <b>Database Management Systems</b>
            <span>CANCELLED</span>
          </div>
          <div>
            <p>
              <small>SECTION</small>
              <b>Section B</b>
            </p>
            <p>
              <small>DATE & TIME</small>
              <b>Mon, 14 Oct · 2:00–2:50</b>
            </p>
            <p>
              <small>ROOM</small>
              <b>LRC-007 · Available</b>
            </p>
            <p>
              <small>CLAIM DEADLINE</small>
              <b>Before 2:00 PM</b>
            </p>
          </div>
        </div>
        <div className="course-select-head">
          <div>
            <small>SELECT YOUR COURSE</small>
            <b>Active teaching assignments for Section B</b>
          </div>
          <span>
            <Icon name="shield" size={13} /> Eligibility verified
          </span>
        </div>
        <Button
          variant="ghost"
          className="course-option selected"
          onClick={() =>
            setSelected(
              assignments[
                (assignments.findIndex(
                  (assignment) => assignment.course_id === selected,
                ) +
                  1) %
                  assignments.length
              ]?.course_id ?? selected,
            )
          }
          disabled={validationState !== "AVAILABLE"}
        >
          <span className="course-radio">
            <i />
          </span>
          <span>
            <b>{selectedCourse?.course_name ?? "No eligible course"}</b>
            <small>Course #{selected} · Assigned to you</small>
          </span>
          <Icon name="check" size={17} />
        </Button>
        {validationState === "AVAILABLE" ? (
          <div className="eligibility-note">
            <Icon name="check" size={15} />
            <span>
              No faculty, room, section, batch, or group conflicts detected for
              the actual 2:00–2:50 PM time range.
            </span>
          </div>
        ) : (
          <div className="claim-error-state">
            <span>
              <Icon
                name={validationState === "CLAIMED" ? "users" : "history"}
                size={16}
              />
            </span>
            <div>
              <small>
                {validationState === "CLAIMED"
                  ? "ATOMIC CLAIM REJECTED"
                  : "CLAIM DEADLINE PASSED"}
              </small>
              <b>
                {validationState === "CLAIMED"
                  ? "Another eligible faculty member claimed first"
                  : "This period can no longer be claimed"}
              </b>
              <p>
                {validationState === "CLAIMED"
                  ? "The winning transaction already created a replacement session. Your course selection was not submitted."
                  : "Claims are rejected at or after the 2:00 PM session start, even when the vacancy is still visible."}
              </p>
            </div>
          </div>
        )}
        <div
          className={`claim-result-preview ${
            validationState !== "AVAILABLE" ? "claim-preview-blocked" : ""
          }`}
        >
          <span>
            {validationState === "AVAILABLE"
              ? "Successful claim"
              : "No session created"}
          </span>
          <Icon name="arrow" size={14} />
          <b>
            {validationState === "AVAILABLE"
              ? "Creates a new `VACANCY_UTILIZATION` class session"
              : "Original cancelled session remains unchanged in history"}
          </b>
        </div>
        <div className="claim-validation-preview">
          <span>VALIDATION PREVIEW</span>
          <div>
            <button
              className={validationState === "AVAILABLE" ? "active" : ""}
              onClick={() => setValidationState("AVAILABLE")}
            >
              <Icon name="check" size={12} />
              Available
            </button>
            <button
              className={validationState === "CLAIMED" ? "active error" : ""}
              onClick={() => setValidationState("CLAIMED")}
            >
              Race lost
            </button>
            <button
              className={validationState === "EXPIRED" ? "active error" : ""}
              onClick={() => setValidationState("EXPIRED")}
            >
              Expired
            </button>
          </div>
        </div>
        <div className="modal-actions">
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            Not now
          </Button>
          <Button
            onClick={confirm}
            disabled={loading || !selected || validationState !== "AVAILABLE"}
          >
            {loading ? (
              <>
                <span className="spinner" />
                Securing vacancy...
              </>
            ) : validationState === "CLAIMED" ? (
              "Claim already secured"
            ) : validationState === "EXPIRED" ? (
              "Deadline expired"
            ) : (
              "Claim and create class"
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}

function RescheduleDialog({
  session,
  rooms,
  timeSlots,
  onClose,
  onConfirm,
}: {
  session: Session
  rooms: BackendRoom[]
  timeSlots: BackendTimeSlot[]
  onClose: () => void
  onConfirm: (change: {
    classDate: string
    slotId: number
    roomId: number
  }) => Promise<void>
}) {
  const [loading, setLoading] = useState(false)
  const room =
    rooms.find(
      (candidate) =>
        candidate.status === "AVAILABLE" &&
        candidate.room_id !== session.roomId,
    ) ?? rooms.find((candidate) => candidate.status === "AVAILABLE")
  const selectedSlot =
    timeSlots.find((candidate) => candidate.slot_id !== session.slotId) ??
    timeSlots[0]
  const classDate = new Date(
    new Date(`${session.classDate ?? new Date().toISOString().slice(0, 10)}T00:00:00`).getTime() +
      86_400_000,
  )
    .toISOString()
    .slice(0, 10)
  const facultyOwned = session.faculty === "Dr. Manushi Gupta"
  const facultyDestinations: Record<number, FacultyDestination> = {
    4: { day: "Friday", slot: 1 },
    8: { day: "Tuesday", slot: 4 },
    13: { day: "Tuesday", slot: 6 },
  }
  const destination = facultyOwned
    ? (facultyDestinations[session.id] ?? facultyDestinations[4])
    : { day: "Wednesday", slot: 4 }
  const newDay = destination.day
  const newSlot = destination.slot
  const confirm = async () => {
    if (!room || !selectedSlot) return
    setLoading(true)
    try {
      await onConfirm({
        classDate,
        slotId: selectedSlot.slot_id,
        roomId: room.room_id,
      })
    } finally {
      setLoading(false)
    }
  }
  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <div
        className="modal reschedule-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="reschedule-title"
      >
        <div className="modal-head">
          <span className="modal-icon reschedule-icon">
            <Icon name="history" />
          </span>
          <div>
            <small>
              {facultyOwned ? "YOUR ASSIGNED CLASS" : "RESCHEDULE CLASS"}
            </small>
            <div id="reschedule-title">Move {session.course}</div>
          </div>
          <button onClick={onClose} aria-label="Close dialog">
            <Icon name="close" />
          </button>
        </div>
        <div className="reschedule-flow">
          <div className="schedule-block schedule-old">
            <small>OLD SESSION · WILL REMAIN IN HISTORY</small>
            <b>
              {session.day}, {14 + days.indexOf(session.day)} October
            </b>
            <span>
              {slots[session.slot]} · {session.room}
            </span>
            <p>
              {session.faculty} · Section {session.section}
            </p>
          </div>
          <div className="flow-arrow">
            <span>
              <Icon name="arrow" size={16} />
            </span>
          </div>
          <div className="schedule-block schedule-new">
            <small>NEW AVAILABLE SESSION</small>
            <b>
              {newDay}, {14 + days.indexOf(newDay)} October
            </b>
            <span>
              {slots[newSlot]} · {session.room}
            </span>
            <p>Same course, faculty, and section scope</p>
          </div>
        </div>
        <div className="reschedule-controls">
          <button>
            <span>
              <Icon name="calendar" size={15} />
              New date
            </span>
            <b>
              {newDay.slice(0, 3)}, {14 + days.indexOf(newDay)} October 2026
            </b>
            <small>⌄</small>
          </button>
          <button>
            <span>
              <Icon name="history" size={15} />
              New time slot
            </span>
            <b>{slots[newSlot]}</b>
            <small>⌄</small>
          </button>
          <button>
            <span>
              <Icon name="room" size={15} />
              Room
            </span>
            <b>{session.room} · Capacity 60</b>
            <small>⌄</small>
          </button>
        </div>
        <div className="validation-panel">
          <div className="validation-head">
            <span>
              <Icon name="shield" size={16} />
              Schedule validation
            </span>
            <b>All checks passed</b>
          </div>
          <div className="validation-grid">
            <span>
              <Icon name="check" size={13} />
              Faculty available
            </span>
            <span>
              <Icon name="check" size={13} />
              Section available
            </span>
            <span>
              <Icon name="check" size={13} />
              Room available
            </span>
            <span>
              <Icon name="check" size={13} />
              Capacity sufficient
            </span>
            <span>
              <Icon name="check" size={13} />
              No batch/group overlap
            </span>
            <span>
              <Icon name="check" size={13} />
              Actual range clear
            </span>
          </div>
        </div>
        <div className="preserve-note reschedule-preserve">
          <Icon name="history" />
          <p>
            <b>The original session will not disappear</b>
            <span>
              A new `CLASS_SESSION` will be created with `Reschedule_Of` linked
              to the original record. Affected students and faculty will receive
              targeted notifications.
            </span>
          </p>
        </div>
        <div className="modal-actions">
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            Keep original time
          </Button>
          <Button onClick={confirm} disabled={loading}>
            {loading ? (
              <>
                <span className="spinner" />
                Creating session...
              </>
            ) : (
              "Confirm reschedule"
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}

function StudentChangesView({
  sessions,
  publishedV4,
}: {
  sessions: Session[]
  publishedV4: boolean
}) {
  const [filter, setFilter] =
    useState<"ALL" | "CANCELLED" | "RESCHEDULED" | "EXTRA">("ALL")
  const dbmsCancelled =
    sessions.find((session) => session.id === 3)?.status === "CANCELLED"
  const vacancyReplacement = sessions.find((session) => session.id === 17)
  const dataStructuresReplacement = sessions.find(
    (session) => session.id === 18,
  )
  const mathematicsOriginal = sessions.find((session) => session.id === 4)
  const mathematicsReplacement = sessions.find((session) => session.id === 19)
  const extraClass = sessions.find((session) => session.id === 22)
  const changes = [
    ...(dbmsCancelled
      ? [
          {
            id: "dbms",
            type: "CANCELLED",
            date: "Monday · 14 October",
            title: "Database Management Systems cancelled",
            description:
              "The 2:00–2:50 PM session in LRC-007 was cancelled. Its original record remains in history.",
            accent: "rose",
            old: "DBMS · 2:00 PM",
            next: vacancyReplacement
              ? "Discrete Mathematics · 2:00 PM"
              : "Vacant period",
            status: vacancyReplacement
              ? "Replacement scheduled"
              : "Awaiting claim",
          },
        ]
      : []),
    ...(dataStructuresReplacement
      ? [
          {
            id: "dsa",
            type: "RESCHEDULED",
            date: "Wednesday · 16 October",
            title: "Data Structures moved to a new time",
            description:
              "The original 11:00–11:50 AM session remains preserved and a new session was created.",
            accent: "purple",
            old: "11:00–11:50 AM",
            next: "2:00–2:50 PM",
            status: "Room TB-106 unchanged",
          },
        ]
      : []),
    ...(mathematicsOriginal?.status === "CANCELLED"
      ? [
          {
            id: "math-cancel",
            type: "CANCELLED",
            date: "Monday · 14 October",
            title: "Discrete Mathematics cancelled",
            description:
              "Dr. Manushi Gupta cancelled the 3:00–3:50 PM class. Eligible faculty were notified of the vacancy.",
            accent: "rose",
            old: "3:00–3:50 PM",
            next: "Vacant period",
            status: "Original retained",
          },
        ]
      : []),
    ...(mathematicsReplacement
      ? [
          {
            id: "math-move",
            type: "RESCHEDULED",
            date: "Friday · 18 October",
            title: "Discrete Mathematics rescheduled",
            description:
              "Your Monday class moved to Friday while preserving the original schedule record.",
            accent: "purple",
            old: "Monday · 3:00 PM",
            next: "Friday · 10:00 AM",
            status: "EB2-206",
          },
        ]
      : []),
    ...(extraClass
      ? [
          {
            id: "extra",
            type: "EXTRA",
            date: "Thursday · 17 October",
            title: "Extra Discrete Mathematics class",
            description:
              "A naturally free period is now scheduled for Section B. This is not a vacancy-utilization session.",
            accent: "teal",
            old: "Naturally free",
            next: "2:00–2:50 PM",
            status: "EB2-206",
          },
        ]
      : []),
    ...(publishedV4
      ? [
          {
            id: "published",
            type: "RESCHEDULED",
            date: "Published just now",
            title: "Timetable version 4.0 is active",
            description:
              "Your timetable was refreshed from the newly published academic schedule.",
            accent: "blue",
            old: "Version 3.2",
            next: "Version 4.0",
            status: "Schedule updated",
          },
        ]
      : []),
  ]
  const visible = changes.filter(
    (change) => filter === "ALL" || change.type === filter,
  )
  return (
    <div className="page page-enter">
      <div className="page-header">
        <div>
          <div className="breadcrumb">
            Student <Icon name="chevron" size={12} /> Class changes
          </div>
          <div className="page-title">Class changes</div>
          <p>
            A clear history of every update affecting your Section B and Batch
            B1 schedule.
          </p>
        </div>
        <span className="published-badge">
          <i />
          <b>Live scope</b> · Section B / B1
        </span>
      </div>
      <div className="student-profile-scope">
        <div>
          <span>AM</span>
          <p>
            <small>STUDENT RECORD · #240101</small>
            <b>Aarav Mehta</b>
          </p>
        </div>
        <dl>
          <div>
            <dt>Section</dt>
            <dd>B</dd>
          </div>
          <div>
            <dt>Batch</dt>
            <dd>B1</dd>
          </div>
          <div>
            <dt>Program</dt>
            <dd>B.Tech CSE</dd>
          </div>
          <div>
            <dt>Semester</dt>
            <dd>3</dd>
          </div>
        </dl>
        <p>
          <Icon name="shield" size={14} />
          Changes outside this academic scope are hidden.
        </p>
      </div>
      <div className="change-filters">
        {(["ALL", "CANCELLED", "RESCHEDULED", "EXTRA"] as const).map((item) => (
          <button
            key={item}
            className={filter === item ? "active" : ""}
            onClick={() => setFilter(item)}
          >
            {item === "ALL" ? "All changes" : item.replace("_", " ")}
            <span>
              {item === "ALL"
                ? changes.length
                : changes.filter((change) => change.type === item).length}
            </span>
          </button>
        ))}
      </div>
      <div className="student-change-layout">
        <section className="student-change-list">
          {visible.map((change) => (
            <article
              className={`student-change-card change-${change.accent}`}
              key={change.id}
            >
              <div className="change-date">
                <span>
                  <Icon
                    name={
                      change.type === "CANCELLED"
                        ? "close"
                        : change.type === "EXTRA"
                          ? "spark"
                          : "history"
                    }
                  />
                </span>
                <small>{change.date}</small>
              </div>
              <div className="change-body">
                <div>
                  <span>{change.type}</span>
                  <b>{change.title}</b>
                </div>
                <p>{change.description}</p>
                <div className="change-comparison">
                  <span>
                    <small>
                      {change.type === "EXTRA" ? "BEFORE" : "ORIGINAL"}
                    </small>
                    <b>{change.old}</b>
                  </span>
                  <Icon name="arrow" size={15} />
                  <span>
                    <small>
                      {change.type === "CANCELLED" && !vacancyReplacement
                        ? "CURRENT"
                        : "UPDATED"}
                    </small>
                    <b>{change.next}</b>
                  </span>
                  <em>{change.status}</em>
                </div>
              </div>
            </article>
          ))}
          {visible.length === 0 && (
            <div className="student-change-empty">
              <Icon name="history" />
              <b>No {filter.toLowerCase()} changes</b>
              <p>Your current academic scope has no updates of this type.</p>
            </div>
          )}
        </section>
        <aside className="student-change-aside">
          <small>HOW HISTORY WORKS</small>
          <b>Nothing disappears</b>
          <div>
            <span>01</span>
            <p>
              <b>Original retained</b>
              <small>Cancelled and moved sessions remain auditable.</small>
            </p>
          </div>
          <div>
            <span>02</span>
            <p>
              <b>New session linked</b>
              <small>Replacement sessions point back to their origin.</small>
            </p>
          </div>
          <div>
            <span>03</span>
            <p>
              <b>Only your scope</b>
              <small>
                Section, batch, course, and elective enrollment determine
                visibility.
              </small>
            </p>
          </div>
          <footer>
            <Icon name="bell" size={14} />
            Every visible change generated a targeted notification.
          </footer>
        </aside>
      </div>
    </div>
  )
}

function FacultyHistoryView({ sessions }: { sessions: Session[] }) {
  const original = sessions.find((session) => session.id === 4)!
  const replacement = sessions.find((session) => session.id === 19)
  const changed = original.status !== "SCHEDULED"
  return (
    <div className="page page-enter">
      <div className="page-header">
        <div>
          <div className="breadcrumb">
            Workspace <Icon name="chevron" size={12} /> My records
          </div>
          <div className="page-title">My class history</div>
          <p>
            Only sessions assigned to Dr. Manushi Gupta and their preserved
            change chains.
          </p>
        </div>
        <Button variant="secondary" icon="filter">
          Filter history
        </Button>
      </div>
      <div className="faculty-history-summary">
        <div>
          <span>
            <Icon name="shield" />
          </span>
          <p>
            <small>OWNERSHIP SCOPE</small>
            <b>Only your teaching assignments are shown</b>
          </p>
        </div>
        <div>
          <small>CHANGES THIS WEEK</small>
          <b>{changed ? "1" : "0"}</b>
        </div>
        <div>
          <small>PRESERVED RECORDS</small>
          <b>{changed ? (replacement ? "2" : "1") : "0"}</b>
        </div>
      </div>
      <section className="history-panel faculty-history-panel">
        <div className="history-heading">
          <div>
            <small>DISCRETE MATHEMATICS · SECTION B</small>
            <b>Monday, 14 October · Original assignment</b>
          </div>
          <StatusBadge status={original.status} />
        </div>
        <div className="history-timeline">
          <div
            className={`timeline-entry ${
              original.status === "CANCELLED"
                ? "timeline-cancelled"
                : changed
                  ? "timeline-vacancy"
                  : ""
            }`}
          >
            <div className="timeline-rail">
              <span>
                <Icon name="calendar" size={15} />
              </span>
              {changed && <i />}
            </div>
            <div className="timeline-card">
              <div>
                <small>ORIGINAL CLASS_SESSION · #CS-20412</small>
                <StatusBadge status={original.status} />
              </div>
              <b>Discrete Mathematics</b>
              <p>Dr. Manushi Gupta · Section B · EB2-206</p>
              <footer>
                <span>Monday · 3:00–3:50 PM</span>
                <span>
                  {original.status === "CANCELLED"
                    ? "Cancelled by assigned faculty"
                    : changed
                      ? "Rescheduled by assigned faculty"
                      : "Published and active"}
                </span>
              </footer>
            </div>
          </div>
          {original.status === "CANCELLED" && (
            <div className="timeline-entry timeline-vacancy">
              <div className="timeline-rail">
                <span>
                  <Icon name="spark" size={15} />
                </span>
              </div>
              <div className="timeline-card">
                <div>
                  <small>VACANCY OPPORTUNITY</small>
                  <span className="timeline-state">OPEN</span>
                </div>
                <b>Exact period released</b>
                <p>
                  Eligible Section B faculty notified · claim deadline before
                  3:00 PM
                </p>
                <footer>
                  <span>Monday · 3:00–3:50 PM</span>
                  <span>Original session retained above</span>
                </footer>
              </div>
            </div>
          )}
          {replacement && (
            <div className="timeline-entry timeline-replacement">
              <div className="timeline-rail">
                <span>
                  <Icon name="check" size={15} />
                </span>
              </div>
              <div className="timeline-card">
                <div>
                  <small>NEW CLASS_SESSION · #CS-20458</small>
                  <StatusBadge status="RESCHEDULED" />
                </div>
                <b>Discrete Mathematics</b>
                <p>Dr. Manushi Gupta · Section B · EB2-206</p>
                <footer>
                  <span>Friday · 10:00–10:50 AM</span>
                  <span>`Reschedule_Of` → #CS-20412</span>
                </footer>
              </div>
            </div>
          )}
        </div>
        {!changed && (
          <div className="history-empty">
            <Icon name="history" />
            <b>No changes yet</b>
            <p>Your original class session is still active.</p>
          </div>
        )}
      </section>
    </div>
  )
}

function HistoryView({
  sessions,
  vacancy,
  role,
}: {
  sessions: Session[]
  vacancy: VacancyState
  role: Role
}) {
  const cancelled =
    sessions.find((session) => session.id === 3)?.status === "CANCELLED"
  const replacement = sessions.find((session) => session.id === 17)
  const rescheduled = sessions.find((session) => session.id === 18)
  return (
    <div className="page page-enter">
      <div className="page-header">
        <div>
          <div className="breadcrumb">
            Workspace <Icon name="chevron" size={12} /> History
          </div>
          <div className="page-title">
            {role === "STUDENT"
              ? "Class changes"
              : role === "FACULTY"
                ? "Class history"
                : "Timetable history"}
          </div>
          <p>An immutable, explainable timeline of every schedule change.</p>
        </div>
        <div className="header-actions">
          <Button variant="secondary" icon="filter">
            Filter history
          </Button>
        </div>
      </div>
      <div className="history-layout">
        <div className="history-main">
          <section className="history-panel">
            <div className="history-heading">
              <div>
                <small>SESSION CHAIN</small>
                <b>Monday · 14 October · Section B</b>
              </div>
              <span className={vacancy === "claimed" ? "chain-complete" : ""}>
                <Icon
                  name={vacancy === "claimed" ? "check" : "history"}
                  size={14}
                />
                {vacancy === "claimed" ? "Chain complete" : "Live record"}
              </span>
            </div>
            <div className="history-timeline">
              <div
                className={`timeline-entry ${
                  cancelled ? "timeline-cancelled" : ""
                }`}
              >
                <div className="timeline-rail">
                  <span>
                    <Icon name="calendar" size={15} />
                  </span>
                  <i />
                </div>
                <div className="timeline-card">
                  <div>
                    <small>ORIGINAL CLASS_SESSION · #CS-20418</small>
                    <StatusBadge
                      status={cancelled ? "CANCELLED" : "SCHEDULED"}
                    />
                  </div>
                  <b>Database Management Systems</b>
                  <p>Dr. S. Taruna · Section B · LRC-007</p>
                  <footer>
                    <span>2:00–2:50 PM</span>
                    <span>
                      {cancelled
                        ? "Marked cancelled at 1:12 PM"
                        : "Published in timetable v3.2"}
                    </span>
                  </footer>
                </div>
              </div>
              {cancelled && (
                <div className="timeline-entry timeline-vacancy">
                  <div className="timeline-rail">
                    <span>
                      <Icon name="spark" size={15} />
                    </span>
                    <i />
                  </div>
                  <div className="timeline-card">
                    <div>
                      <small>VACANCY OPPORTUNITY</small>
                      <span className="timeline-state">
                        {vacancy === "claimed" ? "CLAIMED" : "OPEN"}
                      </span>
                    </div>
                    <b>Exact period released</b>
                    <p>
                      Eligible Section B teaching assignments only · Deadline
                      before 2:00 PM
                    </p>
                    <footer>
                      <span>Created at 1:12 PM</span>
                      <span>Original session retained above</span>
                    </footer>
                  </div>
                </div>
              )}
              {replacement && (
                <div className="timeline-entry timeline-replacement">
                  <div className="timeline-rail">
                    <span>
                      <Icon name="check" size={15} />
                    </span>
                  </div>
                  <div className="timeline-card">
                    <div>
                      <small>NEW CLASS_SESSION · #CS-20441</small>
                      <StatusBadge status="VACANCY_UTILIZATION" />
                    </div>
                    <b>Discrete Mathematics</b>
                    <p>Dr. Manushi Gupta · Section B · LRC-007</p>
                    <footer>
                      <span>2:00–2:50 PM</span>
                      <span>`Vacancy_Of` → #CS-20418</span>
                    </footer>
                  </div>
                </div>
              )}
            </div>
            {!cancelled && (
              <div className="history-empty">
                <Icon name="history" />
                <b>No changes to this session</b>
                <p>Its original published schedule is still active.</p>
              </div>
            )}
          </section>
          <section className="reschedule-history-card">
            <div className="reschedule-history-head">
              <div>
                <small>RESCHEDULE CHAIN</small>
                <b>Data Structures · Wednesday</b>
              </div>
              <StatusBadge status={rescheduled ? "RESCHEDULED" : "SCHEDULED"} />
            </div>
            <div className="reschedule-compare">
              <div className={rescheduled ? "old-moved" : ""}>
                <small>ORIGINAL · #CS-20423</small>
                <b>11:00–11:50 AM</b>
                <span>TB-106 · Dr. Sonali Vyas</span>
              </div>
              <span>
                <Icon name="arrow" size={16} />
              </span>
              <div>
                <small>
                  {rescheduled ? "NEW · #CS-20452" : "CURRENT SESSION"}
                </small>
                <b>{rescheduled ? "2:00–2:50 PM" : "11:00–11:50 AM"}</b>
                <span>TB-106 · Dr. Sonali Vyas</span>
              </div>
            </div>
            <footer>
              {rescheduled ? (
                <>
                  <Icon name="check" size={14} />
                  New session links to the original through `Reschedule_Of`.
                  Both records remain auditable.
                </>
              ) : (
                <>
                  <Icon name="history" size={14} />
                  Use the timetable’s Data Structures card to preview the
                  rescheduling workflow.
                </>
              )}
            </footer>
          </section>
        </div>
        <aside className="audit-panel">
          <div className="audit-title">
            <Icon name="shield" />
            <div>
              <small>AUDIT INTEGRITY</small>
              <b>History preserved</b>
            </div>
          </div>
          <p>No session record was overwritten or deleted.</p>
          <dl>
            <div>
              <dt>Original class</dt>
              <dd>#CS-20418</dd>
            </div>
            <div>
              <dt>Vacancy claim</dt>
              <dd>{vacancy === "claimed" ? "#VC-0062" : "—"}</dd>
            </div>
            <div>
              <dt>Replacement class</dt>
              <dd>{replacement ? "#CS-20441" : "—"}</dd>
            </div>
            <div>
              <dt>Timetable version</dt>
              <dd>v3.2</dd>
            </div>
          </dl>
          <div className="audit-rule">
            <Icon name="check" size={14} />
            All links conform to the relational model.
          </div>
        </aside>
      </div>
    </div>
  )
}

function notificationPresentation(notification: BackendNotification) {
  const presentation: Record<
    string,
    { title: string; tone: string; icon: string }
  > = {
    CLASS_CANCELLED: {
      title: "Class cancelled",
      tone: "rose",
      icon: "calendar",
    },
    VACANT_SLOT_AVAILABLE: {
      title: "Vacant period available",
      tone: "purple",
      icon: "spark",
    },
    VACANT_SLOT_CLAIMED: {
      title: "Vacant period claimed",
      tone: "purple",
      icon: "check",
    },
    EXTRA_CLASS: {
      title: "Extra class scheduled",
      tone: "teal",
      icon: "book",
    },
    CLASS_RESCHEDULED: {
      title: "Class rescheduled",
      tone: "rose",
      icon: "history",
    },
    CLASS_UPDATED: {
      title: "Class updated",
      tone: "teal",
      icon: "check",
    },
  }
  const display = presentation[notification.notification_type] ?? {
    title: notification.notification_type.replace(/_/g, " "),
    tone: "teal",
    icon: "bell",
  }
  const elapsedMinutes = Math.max(
    0,
    Math.floor(
      (Date.now() - new Date(notification.created_at).getTime()) / 60_000,
    ),
  )

  return {
    id: notification.notification_id,
    type: notification.notification_type,
    message: notification.message,
    isRead: notification.is_read,
    time:
      elapsedMinutes < 1
        ? "Just now"
        : elapsedMinutes < 60
          ? `${elapsedMinutes} min ago`
          : new Intl.DateTimeFormat("en-IN", {
              day: "numeric",
              month: "short",
              hour: "2-digit",
              minute: "2-digit",
            }).format(new Date(notification.created_at)),
    ...display,
  }
}

function NotificationsPage({
  role,
  notifications,
  onMarkRead,
  onMarkAllRead,
}: {
  role: Role
  notifications: BackendNotification[]
  onMarkRead: (notificationId: number) => Promise<void>
  onMarkAllRead: () => Promise<void>
}) {
  const [tab, setTab] = useState<"ALL" | "UNREAD">("ALL")
  const [typeFilter, setTypeFilter] = useState("ALL")
  const [query, setQuery] = useState("")
  const items = notifications.map(notificationPresentation)
  const unread = items.filter((item) => !item.isRead).length
  const types = ["ALL", ...Array.from(new Set(items.map((item) => item.type)))]
  const visible = items.filter(
    (item) =>
      (tab === "ALL" || !item.isRead) &&
      (typeFilter === "ALL" || item.type === typeFilter) &&
      `${item.title} ${item.message}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  )
  const markAll = () => void onMarkAllRead()
  return (
    <div className="page page-enter">
      <div className="page-header">
        <div>
          <div className="breadcrumb">
            Workspace <Icon name="chevron" size={12} /> Notifications
          </div>
          <div className="page-title">Notifications</div>
          <p>Targeted updates for your {role.toLowerCase()} academic scope.</p>
        </div>
        <Button variant="secondary" onClick={markAll} disabled={unread === 0}>
          <Icon name="check" size={15} />
          Mark all as read
        </Button>
      </div>
      <div className="notification-stats">
        <div>
          <span>
            <Icon name="bell" />
          </span>
          <p>
            <small>UNREAD</small>
            <b>{unread}</b>
          </p>
        </div>
        <div>
          <span>
            <Icon name="shield" />
          </span>
          <p>
            <small>DELIVERY SCOPE</small>
            <b>
              {role === "ADMIN"
                ? "Operations"
                : role === "FACULTY"
                  ? "Own assignments"
                  : "Section B"}
            </b>
          </p>
        </div>
        <div>
          <span>
            <Icon name="check" />
          </span>
          <p>
            <small>DELIVERY STATUS</small>
            <b>Real time</b>
          </p>
        </div>
      </div>
      <div className="notifications-layout">
        <section className="notifications-list-panel">
          <div className="notifications-toolbar">
            <div>
              <button
                className={tab === "ALL" ? "active" : ""}
                onClick={() => setTab("ALL")}
              >
                All <span>{items.length}</span>
              </button>
              <button
                className={tab === "UNREAD" ? "active" : ""}
                onClick={() => setTab("UNREAD")}
              >
                Unread <span>{unread}</span>
              </button>
            </div>
            <label>
              <Icon name="search" size={15} />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search notifications..."
              />
            </label>
          </div>
          <div className="notification-type-filters">
            {types.map((type) => (
              <button
                key={type}
                className={typeFilter === type ? "active" : ""}
                onClick={() => setTypeFilter(type)}
              >
                {type === "ALL" ? "All types" : type.replace(/_/g, " ")}
              </button>
            ))}
          </div>
          <div className="full-notification-list">
            {visible.map((item) => {
              const isRead = item.isRead
              return (
                <button
                  key={item.id}
                  className={`full-notification ${isRead ? "is-read" : ""}`}
                  onClick={() => void onMarkRead(item.id)}
                >
                  <span className={`notification-${item.tone}`}>
                    <Icon name={item.icon} />
                  </span>
                  <div>
                    <div>
                      <small>{item.type.replace(/_/g, " ")}</small>
                      <time>{item.time}</time>
                    </div>
                    <b>{item.title}</b>
                    <p>{item.message}</p>
                  </div>
                  {!isRead && <i />}
                </button>
              )
            })}
          </div>
          {visible.length === 0 && (
            <div className="notifications-empty">
              <Icon name="bell" />
              <b>
                {tab === "UNREAD"
                  ? "You’re all caught up"
                  : "No notifications found"}
              </b>
              <p>
                {tab === "UNREAD"
                  ? "There are no unread updates in your academic scope."
                  : "Try changing the search or notification type."}
              </p>
            </div>
          )}
        </section>
        <aside className="notification-preferences">
          <small>DELIVERY RULES</small>
          <b>Why you see these</b>
          <div>
            <Icon name="users" size={15} />
            <p>
              <b>Academic scope</b>
              <span>
                {role === "STUDENT"
                  ? "Section B, batch, course, and elective-group assignments."
                  : role === "FACULTY"
                    ? "Your teaching assignments and classes you own."
                    : "Published timetable and operational changes."}
              </span>
            </p>
          </div>
          <div>
            <Icon name="shield" size={15} />
            <p>
              <b>Recipient integrity</b>
              <span>
                Each notification targets exactly one student or faculty
                recipient.
              </span>
            </p>
          </div>
          <div>
            <Icon name="check" size={15} />
            <p>
              <b>No unrelated updates</b>
              <span>
                Vacancies and class changes outside your scope are hidden.
              </span>
            </p>
          </div>
          <footer>
            <span>
              <i />
              Real-time delivery active
            </span>
            <small>Last synchronized just now</small>
          </footer>
        </aside>
      </div>
    </div>
  )
}

function NotificationPanel({
  onClose,
  onMarkAllRead,
  notifications,
}: {
  onClose: () => void
  onMarkAllRead: () => void
  notifications: BackendNotification[]
}) {
  const items = notifications.map(notificationPresentation)
  const unreadCount = items.filter((item) => !item.isRead).length
  return (
    <>
      <button
        className="drawer-backdrop"
        onClick={onClose}
        aria-label="Close notifications"
      />
      <aside className="notification-panel">
        <div className="notification-head">
          <div>
            <small>REAL-TIME UPDATES</small>
            <b>Notifications</b>
          </div>
          <button onClick={onClose} aria-label="Close notifications">
            <Icon name="close" />
          </button>
        </div>
        <div className="drawer-read-row">
          <span>
            {unreadCount} unread update{unreadCount === 1 ? "" : "s"}
          </span>
          <button onClick={onMarkAllRead} disabled={unreadCount === 0}>
            <Icon name="check" size={13} />
            Mark all read
          </button>
        </div>
        <div className="notification-tabs">
          <button className="active">All</button>
          <button disabled>
            Unread <span>{unreadCount}</span>
          </button>
        </div>
        <div className="notification-day">TODAY</div>
        {items.map((item) => (
          <NotificationItem
            key={item.id}
            tone={item.tone}
            icon={item.icon}
            title={item.title}
            text={item.message}
            time={item.time}
          />
        ))}
        <div className="notification-scope">
          <Icon name="shield" />
          <p>
            <b>Targeted by academic scope</b>
            <span>
              You only receive updates relevant to your role, section, batch,
              group, or teaching assignment.
            </span>
          </p>
        </div>
      </aside>
    </>
  )
}

function NotificationItem({
  tone,
  icon,
  title,
  text,
  time,
}: {
  tone: string
  icon: string
  title: string
  text: string
  time: string
}) {
  return (
    <div className="notification-item">
      <span className={`notification-${tone}`}>
        <Icon name={icon} />
      </span>
      <div>
        <b>{title}</b>
        <p>{text}</p>
        <small>{time}</small>
      </div>
      <i />
    </div>
  )
}

function AppRoot() {
  const [view, setView] = useState<View>(() =>
    window.location.hash === "#/" ? "landing" : "login",
  )
  const [loginRole, setLoginRole] = useState<Role>("ADMIN")
  const [loginIdentity, setLoginIdentity] = useState<UserIdentity>(
    defaultIdentities.ADMIN,
  )
  const [accessToken, setAccessToken] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    void supabase.auth.getSession().then(({ data }) => {
      const session = data.session
      const role = parseRole(session?.user.user_metadata?.role)
      if (!active || !session || !role) return

      setLoginRole(role)
      setLoginIdentity(
        resolveIdentity(
          role,
          session.user.email ?? "",
          typeof session.user.user_metadata?.full_name === "string"
            ? session.user.user_metadata.full_name
            : typeof session.user.user_metadata?.name === "string"
              ? session.user.user_metadata.name
              : undefined,
        ),
      )
      setAccessToken(session.access_token)
      setView("timetable")
    })

    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT" && active) {
        setAccessToken(null)
        setView("login")
      } else if (event === "TOKEN_REFRESHED" && session && active) {
        setAccessToken(session.access_token)
      }
    })

    return () => {
      active = false
      data.subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    const syncPublicRoute = () => {
      const route = readWorkspaceRoute()
      if (route && accessToken) {
        if (route.role === loginRole) setView(route.view)
        else setView("timetable")
      } else if (route) {
        setView("login")
      } else if (window.location.hash === "#/login") {
        setView("login")
      } else {
        setView("landing")
      }
    }
    window.addEventListener("popstate", syncPublicRoute)
    window.addEventListener("hashchange", syncPublicRoute)
    return () => {
      window.removeEventListener("popstate", syncPublicRoute)
      window.removeEventListener("hashchange", syncPublicRoute)
    }
  }, [accessToken, loginRole])

  useEffect(() => {
    if (view === "landing") {
      if (window.location.hash !== "#/")
        window.history.pushState(null, "", "#/")
      document.title = "Orario · Real-time academic operations"
    } else if (view === "login") {
      if (window.location.hash !== "#/login")
        window.history.pushState(null, "", "#/login")
      document.title = "Sign in · Orario"
    }
  }, [view])

  if (view === "landing") return <Landing onEnter={() => setView("login")} />
  if (view === "login")
    return (
      <Login
        onBack={() => setView("landing")}
        onLogin={(role, identity, nextAccessToken) => {
          setLoginRole(role)
          setLoginIdentity(identity)
          setAccessToken(nextAccessToken ?? null)
          setView("timetable")
        }}
      />
    )
  if (!accessToken) {
    return (
      <Login
        onBack={() => setView("landing")}
        onLogin={(role, identity, nextAccessToken) => {
          setLoginRole(role)
          setLoginIdentity(identity)
          setAccessToken(nextAccessToken)
          setView("timetable")
        }}
      />
    )
  }
  return (
    <AppShell
      initialRole={loginRole}
      initialIdentity={loginIdentity ?? defaultIdentities[loginRole]}
      accessToken={accessToken}
      onExit={() => {
        void supabase.auth.signOut()
        setAccessToken(null)
        setView("landing")
      }}
    />
  )
}

class AppErrorBoundary extends Component<{ children: ReactNode }, {
  error: Error | null
}> {
  state: { error: Error | null } = { error: null }

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Orario interface error", error, info)
  }



  render() {
    if (!this.state.error) return this.props.children
    return (
      <main className="app-error-page">
        <div className="app-error-card">
          <Brand />
          <span className="app-error-icon">
            <Icon name="settings" size={25} />
          </span>
          <small>RECOVERABLE INTERFACE ERROR</small>
          <div>Something interrupted this view</div>
          <p>
            Reload the interface. If the problem continues, verify the Supabase
            connection and deployed migrations.
          </p>
          <pre>{this.state.error.message}</pre>
          <section>
            <Button onClick={() => window.location.reload()} icon="arrow">
              Reload interface
            </Button>
          </section>
        </div>
      </main>
    )
  }
}

export default function App() {
  return (
    <AppErrorBoundary>
      <AppRoot />
    </AppErrorBoundary>
  )
}
