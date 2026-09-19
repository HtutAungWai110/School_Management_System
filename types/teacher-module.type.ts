export type TeacherModuleLevel = {
  id: string
  description: string
}

export type TeacherModule = {
  code: string
  title: string
  levels: TeacherModuleLevel[]
}

export type ModuleLevelRaw = {
  levels: TeacherModuleLevel
}

export type TeacherModuleRaw = {
  code: string
  title: string
  modules_level: ModuleLevelRaw[]
}

export type TeacherModuleAssignment = {
  id: string
  teacher_id: string
  module_id: string
  assigned_at: string
  modules: TeacherModule
}

export type GetModulesResponse = {
  formattedData: TeacherModuleAssignment[]
}

export type TeacherModuleQueryRow = {
  id: string
  teacher_id: string
  module_id: string
  assigned_at: string
  modules: TeacherModuleRaw
}

export type TeacherModuleRow = {
  id: string
  teacher_id: string
  module_id: string
  assigned_at: string
  modules: TeacherModule
}
