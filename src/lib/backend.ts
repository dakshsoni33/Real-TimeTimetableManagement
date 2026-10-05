import { supabase } from "./supabase"

export class BackendError extends Error {
  status: number

  constructor(message: string, status = 400) {
    super(message)
    this.name = "BackendError"
    this.status = status
  }
}

function unwrap<T>(data: T | null, error: { message: string } | null) {
  if (error) throw new BackendError(error.message)
  return data as T
}

export type BackendIdentity = {
  id: string
  email: string | null
  role: string | null
  fullName: string | null
}

export type BackendNotification = {
  notification_id: number
  notification_type: string
  message: string
  created_at: string
  is_read: boolean
  class_id: number
}

export type BackendRoom = {
  room_id: number
  room_number: string
  room_type: string
  capacity: number
  status: "AVAILABLE" | "MAINTENANCE"
}

export type BackendTimeSlot = {
  slot_id: number
  start_time: string
  end_time: string
}

export type BackendTimetable = {
  timetable_id: number
  semester: string
  academic_year: string
  version: number
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED"
  published_at: string | null
}

export type BackendAssignment = {
  assignment_id: number
  course_id: number
  section_id: number
  batch_id: number | null
  course: { course_name: string } | { course_name: string }[] | null
  section:
    | { section_name: string; year: number; program: string }
    | { section_name: string; year: number; program: string }[]
    | null
  batch: { batch_name: string } | { batch_name: string }[] | null
}

export type BackendClaim = {
  claim_id: number
  class_id: number
  course_id: number
  section_id: number
  claimed_at: string
  claim_deadline: string
  status: "OPEN" | "CLAIMED" | "EXPIRED" | "CANCELLED"
}

export type ScheduleRange = {
  from?: string
  to?: string
}

export async function getBackendIdentity(accessToken: string) {
  const { data, error } = await supabase.auth.getUser(accessToken)
  const user = unwrap(data.user, error)
  return {
    id: user.id,
    email: user.email ?? null,
    role:
      typeof user.user_metadata?.role === "string"
        ? user.user_metadata.role
        : null,
    fullName:
      typeof user.user_metadata?.full_name === "string"
        ? user.user_metadata.full_name
        : typeof user.user_metadata?.name === "string"
          ? user.user_metadata.name
          : null,
  } satisfies BackendIdentity
}

export async function getBackendNotifications(unreadOnly = false) {
  let query = supabase
    .from("notification")
    .select(
      "notification_id, notification_type, message, created_at, is_read, class_id",
    )
    .order("created_at", { ascending: false })

  if (unreadOnly) query = query.eq("is_read", false)
  const { data, error } = await query
  return unwrap(data, error) as BackendNotification[]
}

export async function markBackendNotificationRead(notificationId: number) {
  const { data, error } = await supabase
    .from("notification")
    .update({ is_read: true })
    .eq("notification_id", notificationId)
    .select(
      "notification_id, notification_type, message, created_at, is_read, class_id",
    )
    .single()
  return unwrap(data, error) as BackendNotification
}

export async function getBackendRooms() {
  const { data, error } = await supabase
    .from("room")
    .select("room_id, room_number, room_type, capacity, status")
    .order("room_number")
  return unwrap(data, error) as BackendRoom[]
}

export async function getBackendTimeSlots() {
  const { data, error } = await supabase
    .from("time_slot")
    .select("slot_id, start_time, end_time")
    .order("start_time")
  return unwrap(data, error) as BackendTimeSlot[]
}

export async function getBackendTimetables() {
  const { data, error } = await supabase
    .from("timetable")
    .select(
      "timetable_id, semester, academic_year, version, status, published_at",
    )
    .order("version", { ascending: false })
  return unwrap(data, error) as BackendTimetable[]
}

export async function getBackendAssignments() {
  const { data, error } = await supabase
    .from("teaching_assignment")
    .select(`
      assignment_id, course_id, section_id, batch_id,
      course:course_id(course_name),
      section:section_id(section_name, year, program),
      batch:batch_id(batch_name)
    `)
    .order("assignment_id")
  return unwrap(data, error) as unknown as BackendAssignment[]
}

export async function getBackendClaims() {
  const { data, error } = await supabase
    .from("vacant_slot_claim")
    .select(
      "claim_id, class_id, course_id, section_id, claimed_at, claim_deadline, status",
    )
    .order("claimed_at", { ascending: false })
  return unwrap(data, error) as BackendClaim[]
}

export async function claimBackendVacancy(classId: number, courseId: number) {
  const { data, error } = await supabase.rpc("claim_vacant_slot", {
    p_class_id: classId,
    p_course_id: courseId,
  })
  return { replacementClassId: unwrap(data, error) as number }
}

export async function cancelBackendClass(classId: number) {
  const { data, error } = await supabase.rpc("cancel_class_session", {
    p_class_id: classId,
  })
  return { cancelledClassId: unwrap(data, error) as number }
}

export type RescheduleClassInput = {
  classDate: string
  slotId: number
  roomId: number
}

export async function rescheduleBackendClass(
  classId: number,
  change: RescheduleClassInput,
) {
  const { data, error } = await supabase.rpc("reschedule_class_session", {
    p_class_id: classId,
    p_class_date: change.classDate,
    p_slot_id: change.slotId,
    p_room_id: change.roomId,
  })
  return { replacementClassId: unwrap(data, error) as number }
}

export type ExtraClassInput = {
  timetableId: number
  courseId: number
  sectionId: number
  batchId?: number | null
  groupId?: number | null
  roomId: number
  slotId: number
  classDate: string
}

export async function createBackendExtraClass(input: ExtraClassInput) {
  const { data, error } = await supabase.rpc("create_extra_class", {
    p_timetable_id: input.timetableId,
    p_course_id: input.courseId,
    p_section_id: input.sectionId,
    p_batch_id: input.batchId ?? null,
    p_group_id: input.groupId ?? null,
    p_room_id: input.roomId,
    p_slot_id: input.slotId,
    p_class_date: input.classDate,
  })
  return { classId: unwrap(data, error) as number }
}

export async function publishBackendTimetable(timetableId: number) {
  const { data, error } = await supabase.rpc("publish_timetable", {
    p_timetable_id: timetableId,
  })
  return { timetableId: unwrap(data, error) as number }
}

export type MasterKind =
  | "students"
  | "sections"
  | "batches"
  | "electives"
  | "faculty"
  | "courses"
  | "rooms"
  | "slots"
  | "assignments"

const masterQueries: Record<
  MasterKind,
  { table: string; select: string; order: string }
> = {
  students: {
    table: "student",
    select:
      "student_id, name, email, section_id, batch_id, section:section_id(section_name), batch:batch_id(batch_name)",
    order: "student_id",
  },
  sections: {
    table: "section",
    select: "section_id, section_name, year, program",
    order: "section_id",
  },
  batches: {
    table: "batch",
    select: "batch_id, batch_name, section_id, section:section_id(section_name)",
    order: "batch_id",
  },
  electives: {
    table: "elective_group",
    select: "group_id, group_name, course_id, course:course_id(course_name)",
    order: "group_id",
  },
  faculty: {
    table: "faculty",
    select: "faculty_id, name, email, department",
    order: "faculty_id",
  },
  courses: {
    table: "course",
    select: "course_id, course_name, credits",
    order: "course_id",
  },
  rooms: {
    table: "room",
    select: "room_id, room_number, room_type, capacity, status",
    order: "room_id",
  },
  slots: {
    table: "time_slot",
    select: "slot_id, start_time, end_time",
    order: "slot_id",
  },
  assignments: {
    table: "teaching_assignment",
    select:
      "assignment_id, faculty_id, course_id, section_id, batch_id, faculty:faculty_id(name), course:course_id(course_name), section:section_id(section_name), batch:batch_id(batch_name)",
    order: "assignment_id",
  },
}

function displayValue(value: unknown): string {
  if (value === null || value === undefined) return "—"
  if (Array.isArray(value)) return displayValue(value[0])
  if (typeof value === "object") {
    return Object.values(value as Record<string, unknown>)
      .map(displayValue)
      .filter((item) => item !== "—")
      .join(" · ")
  }
  return String(value)
}

export async function getBackendMasterRows(kind: MasterKind) {
  const config = masterQueries[kind]
  const { data, error } = await supabase
    .from(config.table)
    .select(config.select)
    .order(config.order)
  const records = unwrap(data, error) as unknown as Record<string, unknown>[]
  return records.map((record) => Object.values(record).map(displayValue))
}
