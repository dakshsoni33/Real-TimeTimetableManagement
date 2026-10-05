import type { ReactNode } from "react"
import Button from "./Button"

type Role = "ADMIN" | "FACULTY" | "STUDENT"

type NavigationGroup = {
  group: string
  items: {
    label: string
    icon: string
    view?: string
  }[]
}

type SidebarIdentity = {
  initials: string
  fullName: string
}

export default function AppSidebar({
  open,
  role,
  activeView,
  groups,
  brand,
  identity,
  renderIcon,
  onClose,
  onNavigate,
  onExit,
}: {
  open: boolean
  role: Role
  activeView: string
  groups: NavigationGroup[]
  brand: ReactNode
  identity: SidebarIdentity
  renderIcon: (name: string, size?: number) => ReactNode
  onClose: () => void
  onNavigate: (view: string) => void
  onExit: () => void
}) {
  return (
    <aside className={`sidebar ${open ? "sidebar-open" : ""}`}>
      <div className="sidebar-head">
        {brand}
        <button
          className="mobile-close"
          onClick={onClose}
          aria-label="Close navigation"
        >
          {renderIcon("close")}
        </button>
      </div>
      <div className="role-switch">
        <Button variant="ghost" className="active" disabled>
          {role[0] + role.slice(1).toLowerCase()}
        </Button>
      </div>
      <nav>
        {groups.map((group) => (
          <div className="nav-group" key={group.group}>
            <div className="nav-label">{group.group}</div>
            {group.items.map((item) => (
              <button
                key={item.label}
                className={`nav-item ${
                  item.view === activeView ? "active" : ""
                }`}
                onClick={() => item.view && onNavigate(item.view)}
                disabled={!item.view}
                title={
                  !item.view ? "Available in the next review phase" : undefined
                }
              >
                {renderIcon(item.icon, 18)}
                <span>{item.label}</span>
                {!item.view && <small>Soon</small>}
              </button>
            ))}
          </div>
        ))}
      </nav>
      <div className="sidebar-foot">
        <div className="system-health">
          <span>
            <i />
            All systems operational
          </span>
          <small>Last synced just now</small>
        </div>
        <button className="profile" onClick={onExit}>
          <span className="avatar">{identity.initials}</span>
          <span>
            <b>{identity.fullName}</b>
            <small>{role[0] + role.slice(1).toLowerCase()}</small>
          </span>
          {renderIcon("chevron", 16)}
        </button>
      </div>
    </aside>
  )
}
