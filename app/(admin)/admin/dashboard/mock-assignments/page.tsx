"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/browser.client"
import studentIdsData from "../../../../../student-ids.json"

const ASSIGNMENT_ID = "32a8a8f4-d5f2-4bb1-acbc-122662c468de"
const BATCH_ID = "ae823c63-d860-47a5-b328-5c7c5c408a40"
const MODULE_ID = "1d0a6285-36c0-4fd2-92e9-5ad9b819ea78"
const FILE_NAME = "Poop.docx"
const BUCKET = "assignments"
const DOCX_CONTENT_TYPE =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document"

function buildStudentIds() {
  return Array.from(new Set(studentIdsData.map((s) => s.id)))
}

export default function MockAssignmentsPage() {
  const [studentIds] = useState<string[]>(buildStudentIds)
  const [running, setRunning] = useState(false)
  const [progress, setProgress] = useState(0)
  const [result, setResult] = useState<string>("")

  async function handleSeed() {
    setRunning(true)
    setResult("")
    setProgress(0)

    const supabase = createClient()
    const res = await fetch(`/${FILE_NAME}`)
    if (!res.ok) {
      setResult(`Failed to fetch ${FILE_NAME} from /public: ${res.status}`)
      setRunning(false)
      return
    }
    const blob = await res.blob()
    const file = new File([blob], FILE_NAME, { type: DOCX_CONTENT_TYPE })

    const folder = `${BATCH_ID}_${MODULE_ID}`
    const ok: string[] = []
    const failed: string[] = []

    for (let i = 0; i < studentIds.length; i++) {
      const studentId = studentIds[i]
      const filePath = `${folder}/${studentId}/${FILE_NAME}`
      try {
        const { error: uploadError } = await supabase.storage
          .from(BUCKET)
          .upload(filePath, file, { upsert: true })
        if (uploadError) throw uploadError

        const { error: insertError } = await supabase
          .from("student_assignments")
          .insert({
            assignment_id: ASSIGNMENT_ID,
            student_id: studentId,
            file_path: filePath,
            file_name: FILE_NAME,
          })
        if (insertError) throw insertError

        ok.push(studentId)
      } catch (e) {
        failed.push(
          `${studentId} → ${e instanceof Error ? e.message : String(e)}`
        )
      }
      setProgress(i + 1)
    }

    setRunning(false)
    setResult(
      `Inserted ${ok.length} / ${studentIds.length} rows using ${ASSIGNMENT_ID}${failed.length > 0 ? ` | ${failed.length} failed` : ""}`
    )
    if (ok.length > 0) setResult((r) => `${r}\nExample path: ${BATCH_ID}_${MODULE_ID}/${ok[0]}/${FILE_NAME}`)
  }

  return (
    <main className="mx-auto flex max-w-xl flex-col gap-6 p-8">
      <div className="rounded-xl border border-primary/10 bg-surface-container-lowest p-6 shadow-sm">
        <h1 className="text-[16px] font-[600] text-on-surface">
          Mock student assignments seed
        </h1>
        <p className="mt-1 text-[12px] text-on-surface-variant">
          Uploads {FILE_NAME} to the {BUCKET} bucket and inserts a
          &quot;student_assignments&quot; row per student from
          student-ids.json.
        </p>

        <dl className="mt-4 space-y-1 text-[12px] text-on-surface-variant">
          <div className="flex justify-between gap-4">
            <dt className="shrink-0">Students</dt>
            <dd className="truncate font-[600] text-on-surface">
              {studentIds.length}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="shrink-0">Assignment</dt>
            <dd className="truncate font-[600] text-on-surface">{ASSIGNMENT_ID}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="shrink-0">Folder</dt>
            <dd className="truncate font-[600] text-on-surface">{BATCH_ID}_…</dd>
          </div>
        </dl>

        <button
          type="button"
          onClick={handleSeed}
          disabled={running}
          className="mt-5 w-full cursor-pointer rounded-lg bg-primary px-4 py-2.5 text-[14px] font-[600] text-on-primary disabled:cursor-not-allowed disabled:opacity-50"
        >
          {running ? `Seeding… ${progress}/${studentIds.length}` : "Insert mock data"}
        </button>

        {running && (
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-surface-container-high">
            <div
              className="h-full rounded-full bg-primary transition-all duration-200"
              style={{
                width: `${studentIds.length > 0 ? (progress / studentIds.length) * 100 : 0}%`,
              }}
            />
          </div>
        )}

        {result && (
          <pre className="mt-4 whitespace-pre-wrap break-words rounded-lg border border-outline-variant/10 bg-surface-container-low/50 p-3 text-[12px] leading-[16px] text-on-surface">
            {result}
          </pre>
        )}
      </div>
    </main>
  )
}
