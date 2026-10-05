import type { ReactNode } from "react"
import Icon from "./Icon"

export default function Button({
  children,
  variant = "primary",
  icon,
  onClick,
  disabled = false,
  className = "",
}: {
  children: ReactNode
  variant?: "primary" | "secondary" | "ghost" | "danger"
  icon?: string
  onClick?: () => void
  disabled?: boolean
  className?: string
}) {
  return (
    <button
      className={`button button-${variant} ${className}`}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
      {icon && <Icon name={icon} size={16} />}
    </button>
  )
}
