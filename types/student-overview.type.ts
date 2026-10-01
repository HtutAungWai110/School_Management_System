export interface OverviewBatch {
  id: string
  batch_name: string
  status: string
}

export interface OverviewSession {
  id: string
  batch_id: string
  module_id: string
  day_of_week: number
  start_time: string
  end_time: string
  status: string
  batches: { batch_name: string } | null
  modules: { code: string; title: string } | null
  profiles: { full_name: string } | null
  classes: { class_number: string; location: string } | null
}

export interface OverviewData {
  coursesEnrolledCount: number | null
  assignedBatches: OverviewBatch[] | null
  timetableData: OverviewSession[] | null
}