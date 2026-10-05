import type { ReactNode } from "react"

type Role = "ADMIN" | "FACULTY" | "STUDENT"

export default function AppTopbar({
  role,
  unreadCount,
  renderIcon,
  onMenu,
  onSearch,
  onNotifications,
}: {
  role: Role
  unreadCount: number
  renderIcon: (name: string, size?: number) => ReactNode
  onMenu: () => void
  onSearch: () => void
  onNotifications: () => void
}) {
  return (
    <header className="topbar">
      <button
        className="menu-button"
        onClick={onMenu}
        aria-label="Open navigation"
      >
        {renderIcon("menu")}
      </button>
      <div className="topbar-context">
        <span>JK Lakshmipat University</span>
        <i />
        Institute of Engineering & Technology
      </div>
      <div className="topbar-actions">
        <button className="search-button" onClick={onSearch}>
          {renderIcon("search", 17)}
          <span>Search screens and actions...</span>
          <kbd>⌘ K</kbd>
        </button>
        <button
          className="icon-button notification-button"
          onClick={onNotifications}
          aria-label={`${unreadCount} unread notifications`}
        >
          {renderIcon("bell")}
          {unreadCount > 0 && (
            <span key={unreadCount}>
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>
        <div className="topbar-role">
          <span>{role}</span>
        </div>
      </div>
    </header>
  )
}
