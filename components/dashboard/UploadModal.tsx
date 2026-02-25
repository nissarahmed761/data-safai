"use client"

import { useState, useRef, useCallback } from "react"
import {
  X,
  Upload,
  FileSpreadsheet,
  FileJson,
  Check,
  AlertCircle,
  Loader2,
  ChevronDown,
} from "lucide-react"
import type { Project } from "./Sidebar"

interface UploadModalProps {
  open: boolean
  onClose: () => void
  projects: Project[]
  preselectedProjectId?: string | null
  onUploadComplete: () => void
  onCreateProject: (name: string) => Promise<void>
}

interface FileStatus {
  file: File
  status: "pending" | "uploading" | "done" | "error"
  error?: string
  result?: { fileId: string; rowCount: number; columnCount: number }
}

export default function UploadModal({
  open,
  onClose,
  projects,
  preselectedProjectId,
  onUploadComplete,
  onCreateProject,
}: UploadModalProps) {
  const [selectedProjectId, setSelectedProjectId] = useState<string>(
    preselectedProjectId ?? ""
  )
  const [files, setFiles] = useState<FileStatus[]>([])
  const [isDragOver, setIsDragOver] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [showNewProject, setShowNewProject] = useState(false)
  const [newProjectName, setNewProjectName] = useState("")
  const [creatingProject, setCreatingProject] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const addFiles = useCallback((newFiles: FileList | File[]) => {
    const accepted = Array.from(newFiles).filter((f) => {
      const ext = f.name.split(".").pop()?.toLowerCase()
      return ext === "csv" || ext === "json"
    })
    setFiles((prev) => [
      ...prev,
      ...accepted.map((file) => ({ file, status: "pending" as const })),
    ])
  }, [])

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    if (e.dataTransfer.files.length) {
      addFiles(e.dataTransfer.files)
    }
  }

  const handleCreateProject = async () => {
    if (!newProjectName.trim() || creatingProject) return
    setCreatingProject(true)
    try {
      await onCreateProject(newProjectName.trim())
      // After creating, the projects list will refresh.
      // We need to wait for it and select the new project.
      // For now, reset the form — the user picks from the refreshed dropdown.
      setNewProjectName("")
      setShowNewProject(false)
    } finally {
      setCreatingProject(false)
    }
  }

  const handleUpload = async () => {
    if (!selectedProjectId || files.length === 0) return
    setIsUploading(true)

    const formData = new FormData()
    files.forEach(({ file }) => formData.append("files", file))

    // Mark all as uploading
    setFiles((prev) => prev.map((f) => ({ ...f, status: "uploading" as const })))

    try {
      const res = await fetch(`/api/projects/${selectedProjectId}/files`, {
        method: "POST",
        body: formData,
      })

      if (!res.ok) {
        const err = await res.json()
        setFiles((prev) =>
          prev.map((f) => ({
            ...f,
            status: "error" as const,
            error: err.error || "Upload failed",
          }))
        )
        return
      }

      const { results } = await res.json()

      setFiles((prev) =>
        prev.map((f, i) => {
          const result = results[i]
          if (result?.error) {
            return { ...f, status: "error" as const, error: result.error }
          }
          return {
            ...f,
            status: "done" as const,
            result: {
              fileId: result.fileId,
              rowCount: result.rowCount,
              columnCount: result.columnCount,
            },
          }
        })
      )

      onUploadComplete()
    } catch {
      setFiles((prev) =>
        prev.map((f) => ({
          ...f,
          status: "error" as const,
          error: "Network error",
        }))
      )
    } finally {
      setIsUploading(false)
    }
  }

  const allDone = files.length > 0 && files.every((f) => f.status === "done")
  const hasErrors = files.some((f) => f.status === "error")

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-lg rounded-2xl border border-border bg-background p-6 shadow-2xl mx-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-foreground">
            Upload Files
          </h2>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Project selector */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-foreground mb-1.5">
            Project
          </label>
          {!showNewProject ? (
            <div className="flex gap-2">
              <div className="relative flex-1">
                <select
                  value={selectedProjectId}
                  onChange={(e) => setSelectedProjectId(e.target.value)}
                  className="w-full appearance-none rounded-lg border border-border bg-background px-3 py-2 pr-8 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  disabled={isUploading}
                >
                  <option value="">Select a project...</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
              </div>
              <button
                onClick={() => setShowNewProject(true)}
                className="shrink-0 rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors"
                disabled={isUploading}
              >
                New
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              <input
                autoFocus
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleCreateProject()
                  if (e.key === "Escape") {
                    setShowNewProject(false)
                    setNewProjectName("")
                  }
                }}
                placeholder="Project name..."
                className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary"
                disabled={creatingProject}
              />
              <button
                onClick={handleCreateProject}
                disabled={creatingProject || !newProjectName.trim()}
                className="shrink-0 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
              >
                {creatingProject ? "..." : "Create"}
              </button>
              <button
                onClick={() => {
                  setShowNewProject(false)
                  setNewProjectName("")
                }}
                className="shrink-0 rounded-lg border border-border px-3 py-2 text-sm text-muted-foreground hover:bg-muted"
              >
                Cancel
              </button>
            </div>
          )}
        </div>

        {/* Drop zone */}
        <div
          className={`relative rounded-xl border-2 border-dashed p-8 text-center transition-colors ${
            isDragOver
              ? "border-primary bg-primary/5"
              : "border-border/60 bg-muted/20"
          }`}
          onDragOver={(e) => {
            e.preventDefault()
            setIsDragOver(true)
          }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={handleDrop}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".csv,.json"
            className="hidden"
            onChange={(e) => {
              if (e.target.files) addFiles(e.target.files)
              e.target.value = ""
            }}
          />
          <Upload className="mx-auto h-8 w-8 text-muted-foreground/60 mb-3" />
          <p className="text-sm text-muted-foreground mb-1">
            Drag & drop files here, or{" "}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="text-primary font-medium hover:underline"
              disabled={isUploading}
            >
              browse
            </button>
          </p>
          <div className="flex items-center justify-center gap-3 text-xs text-muted-foreground/60">
            <span className="flex items-center gap-1">
              <FileSpreadsheet className="h-3 w-3" />
              .csv
            </span>
            <span className="flex items-center gap-1">
              <FileJson className="h-3 w-3" />
              .json
            </span>
            <span>up to 50MB</span>
          </div>
        </div>

        {/* File list */}
        {files.length > 0 && (
          <div className="mt-4 max-h-48 overflow-y-auto space-y-1.5">
            {files.map((f, i) => (
              <div
                key={`${f.file.name}-${i}`}
                className="flex items-center gap-2 rounded-lg border border-border/50 bg-muted/20 px-3 py-2"
              >
                {f.file.name.endsWith(".csv") ? (
                  <FileSpreadsheet className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                ) : (
                  <FileJson className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                )}
                <span className="flex-1 text-sm text-foreground truncate">
                  {f.file.name}
                </span>
                <span className="text-xs text-muted-foreground shrink-0">
                  {(f.file.size / 1024).toFixed(0)} KB
                </span>
                {f.status === "pending" && (
                  <button
                    onClick={() => removeFile(i)}
                    className="text-muted-foreground hover:text-foreground"
                    disabled={isUploading}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
                {f.status === "uploading" && (
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                )}
                {f.status === "done" && (
                  <Check className="h-3.5 w-3.5 text-green-500" />
                )}
                {f.status === "error" && (
                  <span className="flex items-center gap-1 text-xs text-destructive">
                    <AlertCircle className="h-3.5 w-3.5" />
                    {f.error}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="mt-5 flex items-center justify-end gap-2">
          {allDone ? (
            <button
              onClick={onClose}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Done
            </button>
          ) : (
            <>
              <button
                onClick={onClose}
                className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors"
                disabled={isUploading}
              >
                Cancel
              </button>
              <button
                onClick={handleUpload}
                disabled={
                  isUploading ||
                  !selectedProjectId ||
                  files.length === 0 ||
                  files.every((f) => f.status !== "pending")
                }
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
              >
                {isUploading ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Uploading...
                  </span>
                ) : (
                  `Upload ${files.length} file${files.length !== 1 ? "s" : ""}`
                )}
              </button>
            </>
          )}
        </div>

        {/* Retry hint */}
        {hasErrors && !isUploading && (
          <p className="mt-2 text-xs text-muted-foreground text-right">
            Remove failed files and try again.
          </p>
        )}
      </div>
    </div>
  )
}
