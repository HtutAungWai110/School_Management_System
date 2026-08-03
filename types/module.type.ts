export type Level = {
  id: string
  description: string
}

export type ModuleLevel = {
  required: string
  levels: {
    id: string
    description: string
  }
}

export type Module = {
  id: string
  code: string
  title: string
  modules_level: ModuleLevel[]
}
