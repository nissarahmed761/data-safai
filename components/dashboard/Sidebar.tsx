"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import {
  ChevronDown,
  ChevronRight,
  PanelLeftClose,
  PanelLeftOpen,
  FileSpreadsheet,
  FolderOpen,
  Sparkles,
  Plus,
  Trash2,
  Loader2,
  Upload,
} from "lucide-react"

export interface FileItem {
  id: string
  name: string
  originalName: string
  size: number
  mimeType: string | null
  currentVersionId: string | null
  createdAt: string
}

export interface Project {
  id: string
  name: string
  description: string | null
  source: "upload" | "github"
  githubRepo: string | null
  files: FileItem[]
  createdAt: string
}

interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
  projects: Project[]
  isLoading: boolean
  selectedFileId: string | null
  onFileSelect: (fileId: string) => void
  onCreateProject: (name: string) => Promise<void>
  onDeleteProject: (projectId: string) => Promise<void>
  onAddFile: (projectId: string) => void
}

export default function Sidebar({
  collapsed,
  onToggle,
  projects,
  isLoading,
  selectedFileId,
  onFileSelect,
  onCreateProject,
  onDeleteProject,
  onAddFile,
}: SidebarProps) {
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(
    new Set()
  )
  const [isCreating, setIsCreating] = useState(false)
  const [newProjectName, setNewProjectName] = useState("")
  const [createLoading, setCreateLoading] = useState(false)

  // Auto-expand new projects
  useEffect(() => {
    setExpandedProjects(new Set(projects.map((p) => p.id)))
  }, [projects.length])

  const toggleProject = (id: string) => {
    setExpandedProjects((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newProjectName.trim() || createLoading) return
    setCreateLoading(true)
    try {
      await onCreateProject(newProjectName.trim())
      setNewProjectName("")
      setIsCreating(false)
    } finally {
      setCreateLoading(false)
    }
  }

  return (
    <aside
      className={`flex h-full flex-col border-r border-border bg-card/50 transition-all duration-300 ease-in-out ${
        collapsed ? "w-12" : "w-60"
      }`}
    >
      {/* Header */}
      <div className="flex h-12 items-center justify-between px-3 border-b border-border shrink-0">
        {!collapsed && (
          <Link href="/" className="flex items-center gap-2 overflow-hidden">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary">
              <Sparkles className="h-3.5 w-3.5 text-primary-foreground" />
            </div>
            <span className="text-sm font-bold tracking-tight text-foreground truncate">
              Data <span className="text-primary">Safai</span>
            </span>
          </Link>
        )}
        <button
          onClick={onToggle}
          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors ${
            collapsed ? "mx-auto" : ""
          }`}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? (
            <PanelLeftOpen className="h-4 w-4" />
          ) : (
            <PanelLeftClose className="h-4 w-4" />
          )}
        </button>
      </div>

      {/* Projects tree */}
      {!collapsed ? (
        <div className="flex-1 overflow-y-auto py-2 px-2">
          {/* New project button */}
          <button
            onClick={() => setIsCreating(true)}
            className="flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-sm font-medium text-primary hover:bg-primary/10 transition-colors mb-1"
          >
            <Plus className="h-3.5 w-3.5 shrink-0" />
            <span>New Project</span>
          </button>

          {/* Inline create form */}
          {isCreating && (
            <form onSubmit={handleCreate} className="mb-2 px-1">
              <input
                autoFocus
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") {
                    setIsCreating(false)
                    setNewProjectName("")
                  }
                }}
                placeholder="Project name..."
                className="w-full rounded-md border border-border bg-background px-2 py-1 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary"
                disabled={createLoading}
              />
              <div className="flex gap-1 mt-1">
                <button
                  type="submit"
                  disabled={createLoading || !newProjectName.trim()}
                  className="flex-1 rounded-md bg-primary px-2 py-0.5 text-xs font-medium text-primary-foreground disabled:opacity-50"
                >
                  {createLoading ? "Creating..." : "Create"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsCreating(false)
                    setNewProjectName("")
                  }}
                  className="rounded-md px-2 py-0.5 text-xs text-muted-foreground hover:bg-muted"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          {/* Loading */}
          {isLoading && (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          )}

          {/* Project list */}
          <div className="space-y-0.5">
            {projects.map((project) => (
              <div key={project.id}>
                <div className="group flex items-center">
                  <button
                    onClick={() => toggleProject(project.id)}
                    className="flex flex-1 items-center gap-1.5 rounded-md px-2 py-1.5 text-sm font-medium text-foreground hover:bg-muted transition-colors min-w-0"
                  >
                    {expandedProjects.has(project.id) ? (
                      <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    )}
                    <FolderOpen className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <span className="truncate">{project.name}</span>
                  </button>
                  <button
                    onClick={() => onDeleteProject(project.id)}
                    className="hidden group-hover:flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                    aria-label="Delete project"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
                {expandedProjects.has(project.id) && (
                  <div className="ml-3 pl-3 border-l border-border/50 space-y-0.5">
                    {project.files.length === 0 && (
                      <p className="px-2 py-1 text-xs text-muted-foreground/60 italic">
                        No files yet
                      </p>
                    )}
                    {project.files.map((file) => (
                      <button
                        key={file.id}
                        onClick={() => onFileSelect(file.id)}
                        className={`flex w-full items-center gap-1.5 rounded-md px-2 py-1 text-sm transition-colors ${
                          selectedFileId === file.id
                            ? "bg-primary/10 text-primary font-medium"
                            : "text-muted-foreground hover:bg-muted hover:text-foreground"
                        }`}
                      >
                        <FileSpreadsheet className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{file.name}</span>
                      </button>
                    ))}
                    <button
                      onClick={() => onAddFile(project.id)}
                      className="flex w-full items-center gap-1.5 rounded-md px-2 py-1 text-xs text-muted-foreground/60 hover:text-primary hover:bg-primary/5 transition-colors"
                    >
                      <Upload className="h-3 w-3 shrink-0" />
                      <span>Add file</span>
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Empty state */}
          {!isLoading && projects.length === 0 && !isCreating && (
            <p className="px-2 py-4 text-xs text-center text-muted-foreground/60">
              No projects yet. Create one to get started.
            </p>
          )}
        </div>
      ) : (
        <div className="flex flex-col items-center pt-3 gap-2">
          <Link
            href="/"
            className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary"
          >
            <Sparkles className="h-3.5 w-3.5 text-primary-foreground" />
          </Link>
          <button
            onClick={() => {
              onToggle()
              setTimeout(() => setIsCreating(true), 300)
            }}
            className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            aria-label="New project"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      )}
    </aside>
  )
}
