"use client"

import { useState, useEffect, useCallback } from "react"
import { useUser, UserButton } from "@clerk/nextjs"
import { redirect } from "next/navigation"
import {
  Upload,
  FileSpreadsheet,
  FileJson,
  Plus,
  Loader2,
  Github,
  ChevronLeft,
  ChevronRight,
  History,
} from "lucide-react"
import Sidebar, { type Project } from "@/components/dashboard/Sidebar"
import AIPanel from "@/components/dashboard/AIPanel"
import UploadModal from "@/components/dashboard/UploadModal"
import ThemeToggle from "@/components/ThemeToggle"

interface FileData {
  id: string
  name: string
  originalName: string
  size: number
  mimeType: string
  projectId: string
  currentVersion: {
    id: string
    versionNumber: number
    rowCount: number
    columnCount: number
    columns: { name: string; type: string }[]
    changeDescription: string
    changedBy: string
    createdAt: string
  }
  versions: {
    id: string
    versionNumber: number
    rowCount: number
    columnCount: number
    changeDescription: string
    changedBy: string
    createdAt: string
  }[]
  data: Record<string, unknown>[]
  pagination: {
    page: number
    pageSize: number
    totalRows: number
    totalPages: number
  }
}

export default function DashboardPage() {
  const { isSignedIn, isLoaded } = useUser()
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null)
  const [projects, setProjects] = useState<Project[]>([])
  const [projectsLoading, setProjectsLoading] = useState(true)
  const [uploadModalOpen, setUploadModalOpen] = useState(false)
  const [fileData, setFileData] = useState<FileData | null>(null)
  const [fileLoading, setFileLoading] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)

  const fetchProjects = useCallback(async () => {
    try {
      const res = await fetch("/api/projects")
      if (res.ok) {
        const data = await res.json()
        setProjects(data)
      }
    } catch (err) {
      console.error("Failed to fetch projects:", err)
    } finally {
      setProjectsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      fetchProjects()
    }
  }, [isLoaded, isSignedIn, fetchProjects])

  // Fetch file data when selected
  const fetchFileData = useCallback(async (fileId: string, page = 1) => {
    setFileLoading(true)
    try {
      const res = await fetch(`/api/files/${fileId}?page=${page}&pageSize=50`)
      if (res.ok) {
        const data = await res.json()
        setFileData(data)
        setCurrentPage(page)
      }
    } catch (err) {
      console.error("Failed to fetch file:", err)
    } finally {
      setFileLoading(false)
    }
  }, [])

  useEffect(() => {
    if (selectedFileId) {
      fetchFileData(selectedFileId, 1)
    } else {
      setFileData(null)
    }
  }, [selectedFileId, fetchFileData])

  const handleCreateProject = async (name: string) => {
    const res = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    })
    if (res.ok) {
      await fetchProjects()
    }
  }

  const handleDeleteProject = async (projectId: string) => {
    const res = await fetch(`/api/projects/${projectId}`, { method: "DELETE" })
    if (res.ok) {
      setProjects((prev) => prev.filter((p) => p.id !== projectId))
      const deleted = projects.find((p) => p.id === projectId)
      if (deleted?.files.some((f) => f.id === selectedFileId)) {
        setSelectedFileId(null)
      }
    }
  }

  if (isLoaded && !isSignedIn) {
    redirect("/sign-in")
  }

  if (!isLoaded) {
    return (
      <div className="flex h-full items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="flex h-full">
      {/* Sidebar */}
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed((c) => !c)}
        projects={projects}
        isLoading={projectsLoading}
        selectedFileId={selectedFileId}
        onFileSelect={setSelectedFileId}
        onCreateProject={handleCreateProject}
        onDeleteProject={handleDeleteProject}
      />

      {/* Main Area */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Top Bar */}
        <div className="flex h-12 items-center justify-end gap-3 border-b border-border px-4 shrink-0">
          <ThemeToggle />
          <UserButton
            appearance={{
              elements: {
                userButtonAvatarBox: "w-7 h-7",
              },
            }}
          />
        </div>

        {/* Content + AI Panel */}
        <div className="flex flex-1 flex-col gap-4 p-4 min-h-0 overflow-hidden">
          {/* Main Content */}
          <div className="flex-1 min-h-0 overflow-y-auto">
            {fileLoading ? (
              <div className="h-full flex items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : fileData ? (
              /* Real File Viewer */
              <div className="h-full rounded-xl border border-border bg-card/50 p-6 flex flex-col">
                {/* File header */}
                <div className="flex items-center gap-2 mb-4 pb-3 border-b border-border/50 shrink-0">
                  <FileSpreadsheet className="h-4 w-4 text-primary" />
                  <span className="text-sm font-semibold text-foreground">
                    {fileData.name}
                  </span>
                  <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                    {fileData.name.endsWith(".json") ? "JSON" : "CSV"}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {fileData.currentVersion.rowCount} rows &middot;{" "}
                    {fileData.currentVersion.columnCount} cols
                  </span>
                  {fileData.versions.length > 1 && (
                    <span className="ml-auto flex items-center gap-1 text-xs text-muted-foreground">
                      <History className="h-3 w-3" />
                      v{fileData.currentVersion.versionNumber}
                    </span>
                  )}
                </div>

                {/* Table */}
                <div className="flex-1 min-h-0 overflow-auto rounded-lg border border-border">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-muted/60 backdrop-blur-sm">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider border-b border-border w-12">
                          #
                        </th>
                        {fileData.currentVersion.columns.map((col) => (
                          <th
                            key={col.name}
                            className="px-3 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider border-b border-border"
                          >
                            <span>{col.name}</span>
                            <span className="ml-1 text-[10px] text-muted-foreground/50 lowercase">
                              {col.type}
                            </span>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50">
                      {fileData.data.map((row, i) => (
                        <tr
                          key={i}
                          className="hover:bg-muted/30 transition-colors"
                        >
                          <td className="px-3 py-2 text-xs text-muted-foreground tabular-nums">
                            {(currentPage - 1) * 50 + i + 1}
                          </td>
                          {fileData.currentVersion.columns.map((col) => (
                            <td
                              key={col.name}
                              className="px-3 py-2 text-foreground max-w-[200px] truncate"
                            >
                              {row[col.name] === null ||
                              row[col.name] === undefined ||
                              row[col.name] === "" ? (
                                <span className="text-muted-foreground/40 italic text-xs">
                                  null
                                </span>
                              ) : (
                                String(row[col.name])
                              )}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                <div className="flex items-center justify-between pt-3 shrink-0">
                  <p className="text-xs text-muted-foreground">
                    Showing{" "}
                    {Math.min(
                      (currentPage - 1) * 50 + 1,
                      fileData.pagination.totalRows
                    )}
                    –
                    {Math.min(
                      currentPage * 50,
                      fileData.pagination.totalRows
                    )}{" "}
                    of {fileData.pagination.totalRows} rows &middot; Give
                    instructions to the AI below to clean this data.
                  </p>
                  {fileData.pagination.totalPages > 1 && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() =>
                          fetchFileData(selectedFileId!, currentPage - 1)
                        }
                        disabled={currentPage === 1}
                        className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted disabled:opacity-30"
                      >
                        <ChevronLeft className="h-3.5 w-3.5" />
                      </button>
                      <span className="text-xs text-muted-foreground tabular-nums px-2">
                        {currentPage} / {fileData.pagination.totalPages}
                      </span>
                      <button
                        onClick={() =>
                          fetchFileData(selectedFileId!, currentPage + 1)
                        }
                        disabled={
                          currentPage === fileData.pagination.totalPages
                        }
                        className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted disabled:opacity-30"
                      >
                        <ChevronRight className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* Empty / Import State */
              <div className="h-full flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border/60 bg-card/30">
                <div className="max-w-md text-center space-y-5">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
                    <Upload className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-foreground mb-1">
                      Import your data
                    </h2>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      Upload CSV/JSON files or connect a GitHub repository.
                      <br />
                      View and clean your data with AI assistance.
                    </p>
                  </div>
                  <div className="flex items-center justify-center gap-3">
                    <button
                      onClick={() => setUploadModalOpen(true)}
                      className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
                    >
                      <Plus className="h-4 w-4" />
                      Upload Files
                    </button>
                    <button
                      className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-muted opacity-60 cursor-not-allowed"
                      title="Coming soon — GitHub import"
                      disabled
                    >
                      <Github className="h-4 w-4" />
                      Import Repository
                    </button>
                  </div>
                  <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <FileSpreadsheet className="h-3 w-3" />
                      .csv
                    </span>
                    <span className="flex items-center gap-1">
                      <FileJson className="h-3 w-3" />
                      .json
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* AI Panel */}
          <div className="h-56 shrink-0">
            <AIPanel />
          </div>
        </div>
      </div>

      {/* Upload Modal */}
      <UploadModal
        open={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        projects={projects}
        onUploadComplete={fetchProjects}
        onCreateProject={handleCreateProject}
      />
    </div>
  )
} 