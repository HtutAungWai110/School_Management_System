import type { AttendanceSession } from "@/types/attendance.type"

export type ModuleAttendanceStats = {
  moduleId: string
  code: string
  title: string
  sessions: number
  present: number
  late: number
  absent: number
  total: number
}

export function buildModuleAttendanceStats(
  sessions: AttendanceSession[]
): ModuleAttendanceStats[] {
  const byModule = new Map<string, ModuleAttendanceStats>()
  for (const session of sessions) {
    const mod = session.modules
    if (!mod) continue
    const key = mod.id
    let stats = byModule.get(key)
    if (!stats) {
      stats = {
        moduleId: mod.id,
        code: mod.code ?? "",
        title: mod.title ?? "",
        sessions: 0,
        present: 0,
        late: 0,
        absent: 0,
        total: 0,
      }
      byModule.set(key, stats)
    }
    stats.sessions += 1
    for (const students of Object.values(session.attendances)) {
      for (const s of students) {
        stats.total += 1
        if (s.status === "present") stats.present += 1
        else if (s.status === "late") stats.late += 1
        else stats.absent += 1
      }
    }
  }
  return [...byModule.values()].sort((a, b) => b.total - a.total)
}

export type StudentModuleRate = {
  studentId: string
  fullName: string
  email: string
  phone: string
  modules: Array<{
    moduleId: string
    code: string
    title: string
    present: number
    total: number
    percentage: number
  }>
}

type StudentAcc = {
  studentId: string
  fullName: string
  email: string
  phone: string
  modules: Map<
    string,
    { moduleId: string; code: string; title: string; present: number; total: number }
  >
}

export function buildStudentModuleRates(
  sessions: AttendanceSession[]
): StudentModuleRate[] {
  const byStudent = new Map<string, StudentAcc>()
  for (const session of sessions) {
    const mod = session.modules
    if (!mod) continue
    for (const students of Object.values(session.attendances)) {
      for (const s of students) {
        let acc = byStudent.get(s.student_id)
        if (!acc) {
          acc = {
            studentId: s.student_id,
            fullName: s.full_name ?? "Unknown student",
            email: s.email ?? "",
            phone: s.phone ?? "",
            modules: new Map(),
          }
          byStudent.set(s.student_id, acc)
        }
        let m = acc.modules.get(mod.id)
        if (!m) {
          m = {
            moduleId: mod.id,
            code: mod.code ?? "",
            title: mod.title ?? "",
            present: 0,
            total: 0,
          }
          acc.modules.set(mod.id, m)
        }
        m.total += 1
        if (s.status === "present") m.present += 1
      }
    }
  }
  return [...byStudent.values()]
    .map((acc) => ({
      studentId: acc.studentId,
      fullName: acc.fullName,
      email: acc.email,
      phone: acc.phone,
      modules: [...acc.modules.values()]
        .map((m) => ({
          ...m,
          percentage: m.total ? Math.round((m.present / m.total) * 1000) / 10 : 0,
        }))
        .sort((a, b) => b.percentage - a.percentage),
    }))
    .sort((a, b) => a.fullName.localeCompare(b.fullName))
}