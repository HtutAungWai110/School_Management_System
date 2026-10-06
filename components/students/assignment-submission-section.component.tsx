"use client"

import { useEffect, useState } from "react"
import { CheckCircle2, Loader2, Upload } from "lucide-react"

import { Button } from "@/components/ui/button"
import { ConfirmDialog } from "@/components/ui/confirm-dialog.component"
import { useProfileStore } from "@/components/profile/profile.state"
import { createClient } from "@/lib/supabase/browser.client"
import {
  ASSIGNMENT_BUCKET,
  WORD_ACCEPT,
  WORD_REJECTION,
  buildSubmissionPath,
  isWordFile,
  wordContentType,
} from "@/lib/assignment.util"
import type { StudentAssignmentSubmission } from "@/types/student-assignment.type"

function formatTurnedIn(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export default function AssignmentSubmissionSection({
  assignmentId,
  batchId,
  moduleId,
}: {
  assignmentId: string
  batchId: string
  moduleId: string
}) {
  const studentId = useProfileStore((state) => state.profile.id)

  const [submission, setSubmission] = useState<StudentAssignmentSubmission | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [confirming, setConfirming] = useState(false)
  const [withdrawing, setWithdrawing] = useState(false)
  const [withdrawError, setWithdrawError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    fetch(`/api/assignments/student_assignments/${assignmentId}`, {
      credentials: "include",
    })
      .then((res) => {
        if (!res.ok) throw new Error("We couldn't check this assignment.")
        return res.json() as Promise<StudentAssignmentSubmission | null>
      })
      .then((json) => {
        if (cancelled) return
        setSubmission(json)
        setLoading(false)
      })
      .catch((err) => {
        if (cancelled) return
        setLoadError(err instanceof Error ? err.message : "Something went wrong.")
        setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [assignmentId])

  function onPick(event: React.ChangeEvent<HTMLInputElement>) {
    const picked = event.target.files?.[0]
    if (!picked) {
      setFile(null)
      setFileError(null)
      return
    }

    if (!isWordFile(picked)) {
      setFile(null)
      setFileError(WORD_REJECTION)
      return
    }

    setFile(picked)
    setFileError(null)
  }

  /** Uploads to Storage first, then records the row. The row is only written
   *  once the object exists, so a submission never points at a missing file. */
  async function onUpload() {
    if (!file || !studentId) return

    setUploading(true)
    setUploadError(null)

    try {
      const supabase = createClient()
      const filePath = buildSubmissionPath(batchId, moduleId, studentId, file.name)

      const { error: uploadError } = await supabase.storage
        .from(ASSIGNMENT_BUCKET)
        .upload(filePath, file, { contentType: wordContentType(file), upsert: true })

      if (uploadError) throw new Error(uploadError.message)

      /* The storage key is only meaningful inside the bucket, so the row gets
         the public URL — that is what a teacher or a report can actually open. */
      const {
        data: { publicUrl },
      } = supabase.storage.from(ASSIGNMENT_BUCKET).getPublicUrl(filePath)

      const res = await fetch(`/api/assignments/student_assignments/${assignmentId}`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ file_path: publicUrl, file_name: file.name }),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => null)
        throw new Error(body?.error ?? "We couldn't record your submission.")
      }

      setSubmission((await res.json()) as StudentAssignmentSubmission)
      setFile(null)
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Something went wrong. Please try again.")
    } finally {
      setUploading(false)
    }
  }

  async function onWithdraw() {
    setWithdrawing(true)
    setWithdrawError(null)

    try {
      const res = await fetch(`/api/assignments/student_assignments/${assignmentId}`, {
        method: "DELETE",
        credentials: "include",
      })

      if (!res.ok) {
        const body = await res.json().catch(() => null)
        throw new Error(body?.error ?? "We couldn't withdraw your submission.")
      }

      setSubmission(null)
      setFile(null)
      setWithdrawError(null)
      setConfirming(false)
    } catch (err) {
      setWithdrawError(
        err instanceof Error ? err.message : "Something went wrong. Please try again."
      )
      setConfirming(false)
    } finally {
      setWithdrawing(false)
    }
  }

  if (loading) {
    return (
      <p className="flex items-center gap-2 text-[13px] leading-5 text-on-surface-variant">
        <Loader2 className="size-3.5 animate-spin" />
        Checking your submission…
      </p>
    )
  }

  if (loadError) {
    return (
      <p role="alert" className="text-[13px] leading-5 text-destructive">
        {loadError} Reload the page to try again.
      </p>
    )
  }

  if (submission) {
    return (
      <div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <span className="flex items-center gap-1.5 text-[13px] font-medium leading-5 text-primary">
            <CheckCircle2 className="size-4" />
            Turned in
          </span>
          <span className="font-mono text-[12px] leading-5 text-on-surface">
            {submission.file_name}
          </span>
          <span className="font-mono text-[11px] leading-5 text-on-surface-variant">
            {formatTurnedIn(submission.turned_in_at)}
          </span>
          <Button
            type="button"
            size="sm"
            className="ml-auto bg-red-900"
            onClick={() => setConfirming(true)}
          >
            Withdraw submission
          </Button>
        </div>

        {withdrawError && (
          <p role="alert" className="mt-2 text-[13px] leading-5 text-destructive">
            {withdrawError}
          </p>
        )}

        <ConfirmDialog
          open={confirming}
          title="Withdraw this submission?"
          description="Your file is removed and you can upload again while the deadline is open."
          confirmLabel="Withdraw"
          cancelLabel="Keep submission"
          variant="destructive"
          isSubmitting={withdrawing}
          onConfirm={onWithdraw}
          onCancel={() => setConfirming(false)}
        />
      </div>
    )
  }

  return (
    <div>
      <p className="text-[13px] font-medium leading-5 text-on-surface">Not submitted yet</p>

      <div className="mt-2 flex flex-wrap items-center gap-3">
        <input
          type="file"
          accept={WORD_ACCEPT}
          onChange={onPick}
          aria-label="Choose a Word document"
          className="max-w-full text-[13px] text-on-surface-variant file:mr-3 file:cursor-pointer file:rounded-md file:border-0 file:bg-brand-soft file:px-2.5 file:py-1 file:text-[12px] file:font-medium file:text-primary"
        />

        <Button type="button" size="sm" disabled={!file || uploading} onClick={onUpload}>
          {uploading ? (
            <>
              <Loader2 className="animate-spin" />
              Uploading…
            </>
          ) : (
            <>
              <Upload />
              Upload assignment
            </>
          )}
        </Button>
      </div>

      {uploadError ? (
        <p role="alert" className="mt-2 text-[13px] leading-5 text-destructive">
          {uploadError}
        </p>
      ) : fileError ? (
        <p role="alert" className="mt-2 text-[13px] leading-5 text-destructive">
          {fileError}
        </p>
      ) : (
        <p className="mt-2 text-[12px] leading-5 text-on-surface-variant">
          Word documents only — .doc or .docx.
        </p>
      )}
    </div>
  )
}
