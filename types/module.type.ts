export type Level = {
  id: string
  description: string
  created_at: string
  modules_level: {
    modules: Module
  }[]
}

export type ModuleLevel = {
  required: string
  levels: Level
}

export type Module = {
  id: string
  code: string
  title: string
  modules_level: ModuleLevel[]
}
