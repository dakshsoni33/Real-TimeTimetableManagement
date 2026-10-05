import { supabase } from "./supabase"

export type LiveScheduleSession = {
  id: number
  timetableId: number
  courseId: number
  sectionId: number | null
  batchId: number | null
  groupId: number | null
  roomId: number
  slotId: number
  classDate: string | null
  day: string
  slot: number
  course: string
  code: string
  faculty: string
  room: string
  section: string
  scope?: string
  status:
    | "SCHEDULED"
    | "CANCELLED"
    | "EXTRA"
    | "VACANCY_UTILIZATION"
    | "RESCHEDULED"
  tone: "blue" | "teal" | "purple" | "rose"
  rescheduleOf?: number
}

type Relation = Record<string, unknown> | Record<string, unknown>[] | null

type ScheduleRow = {
  class_id: number
  timetable_id: number
  course_id: number
  section_id: number | null
  batch_id: number | null
  group_id: number | null
  room_id: number
  slot_id: number
  class_date: string | null
  class_type: "REGULAR" | "EXTRA" | "VACANCY_UTILIZATION"
  status: "SCHEDULED" | "CANCELLED" | "COMPLETED"
  reschedule_of: number | null
  course: Relation
  faculty: Relation
  section: Relation
  batch: Relation
  elective_group: Relation
  room: Relation
  time_slot: Relation
  timetable: Relation
}

function firstRelation(value: Relation) {
  return Array.isArray(value) ? (value[0] ?? null) : value
}

function relationText(value: Relation, key: string, fallback: string) {
  const relation = firstRelation(value)
  const field = relation?.[key]
  return typeof field === "string" && field.trim() ? field : fallback
}

function courseCode(courseName: string, courseId: number) {
  const prefix = courseName
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 4)
    .toUpperCase()
  return `${prefix || "COURSE"}-${courseId}`
}

function dayFromDate(value: string | null) {
  if (!value) return "Monday"
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00Z`))
}

function slotFromRelation(value: Relation) {
  const startTime = relationText(value, "start_time", "09:00")
  const hour = Number(startTime.slice(0, 2))
  return [9, 10, 11, 12, 14, 15, 16].indexOf(hour)
}

function sessionState(row: ScheduleRow) {
  if (row.status === "CANCELLED") {
    return { status: "CANCELLED" as const, tone: "rose" as const }
  }
  if (row.class_type === "VACANCY_UTILIZATION") {
    return {
      status: "VACANCY_UTILIZATION" as const,
      tone: "purple" as const,
    }
  }
  if (row.class_type === "EXTRA") {
    return { status: "EXTRA" as const, tone: "teal" as const }
  }
  if (row.reschedule_of) {
    return { status: "RESCHEDULED" as const, tone: "purple" as const }
  }
  return { status: "SCHEDULED" as const, tone: "blue" as const }
}

export async function getLiveSchedule() {
  const { data, error } = await supabase
    .from("class_session")
    .select(`
      class_id, timetable_id, course_id, section_id, batch_id, group_id,
      room_id, slot_id, class_date, class_type, status, reschedule_of,
      course:course_id(course_name),
      faculty:faculty_id(name),
      section:section_id(section_name),
      batch:batch_id(batch_name),
      elective_group:group_id(group_name),
      room:room_id(room_number),
      time_slot:slot_id(start_time),
      timetable:timetable_id!inner(version, status)
    `)
    .eq("timetable.status", "PUBLISHED")
    .order("class_date")
    .order("slot_id")

  if (error) throw error

  const rows = (data ?? []) as unknown as ScheduleRow[]
  const sessions = rows
    .map((row): LiveScheduleSession | null => {
      const slot = slotFromRelation(row.time_slot)
      if (slot < 0) return null

      const course = relationText(row.course, "course_name", "Untitled course")
      const batch = relationText(row.batch, "batch_name", "")
      const group = relationText(row.elective_group, "group_name", "")
      const state = sessionState(row)

      return {
        id: row.class_id,
        timetableId: row.timetable_id,
        courseId: row.course_id,
        sectionId: row.section_id,
        batchId: row.batch_id,
        groupId: row.group_id,
        roomId: row.room_id,
        slotId: row.slot_id,
        classDate: row.class_date,
        day: dayFromDate(row.class_date),
        slot,
        course,
        code: courseCode(course, row.course_id),
        faculty: relationText(row.faculty, "name", "Faculty pending"),
        room: relationText(row.room, "room_number", "Room pending"),
        section: relationText(row.section, "section_name", "All"),
        scope: batch || group || undefined,
        status: state.status,
        tone: state.tone,
        rescheduleOf: row.reschedule_of ?? undefined,
      }
    })
    .filter((session): session is LiveScheduleSession => Boolean(session))

  const timetable = firstRelation(rows[0]?.timetable ?? null)
  const version = timetable?.version

  return {
    sessions,
    version:
      typeof version === "number" || typeof version === "string"
        ? String(version)
        : "Live",
  }
}
