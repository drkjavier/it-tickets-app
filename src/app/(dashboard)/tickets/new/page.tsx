"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, Select } from "@/components/ui";
import { RichTextEditor } from "@/components/tiptap/RichTextEditor";
import { useAuthStore } from "@/lib/store";
import type { ApiResponse } from "@/types";
import type { Priority } from "@/types";

interface CreateTicketData {
  title: string;
  description: string;
  priority: Priority;
  projectId: string;
  taggedUserIds: string[];
}

interface Project {
  id: string;
  name: string;
  abbreviation: string;
}

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

export default function NewTicketPage() {
  const router = useRouter();
  const { user: currentUser } = useAuthStore();
  const [projects, setProjects] = useState<Project[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<"LOW" | "MEDIUM" | "HIGH" | "CRITICAL">("MEDIUM");
  const [projectId, setProjectId] = useState("");
  const [taggedUserIds, setTaggedUserIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [projectsRes, usersRes] = await Promise.all([
          fetch("/api/projects"),
          fetch("/api/users/taggable"),
        ]);

        const projectsData = await projectsRes.json();
        const usersData = await usersRes.json();

        const projectsResult = projectsData as ApiResponse<Project[]>;
        const usersResult = usersData as ApiResponse<User[]>;

        if (projectsResult.success && projectsResult.data) {
          setProjects(projectsResult.data);
        }

        if (usersResult.success && usersResult.data) {
          setUsers(usersResult.data);
          const adminIds = usersResult.data
            .filter((u: User) => u.role === "ADMIN")
            .map((u: User) => u.id);
          
          // Incluir al usuario logueado si no es ADMIN
          const defaultTaggedIds = [...adminIds];
          if (currentUser && !adminIds.includes(currentUser.id)) {
            defaultTaggedIds.push(currentUser.id);
          }
          
          setTaggedUserIds(defaultTaggedIds);
        }
      } catch (error) {
        // Silently handle error
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [currentUser]);

  const [errors, setErrors] = useState<{ project?: string; title?: string; description?: string }>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const newErrors: typeof errors = {};
    
    if (!projectId) {
      newErrors.project = "Debes seleccionar un proyecto";
    }
    
    if (!title.trim()) {
      newErrors.title = "El título es requerido";
    }
    
    if (!description.trim() || description === "<p></p>") {
      newErrors.description = "La descripción es requerida";
    }
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    
    setErrors({});
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description, priority, projectId, taggedUserIds }),
      });

      const result = await response.json();

      if (result.success) {
        router.push(`/tickets/${result.data.id}`);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleUser = (userId: string) => {
    const user = users.find((u) => u.id === userId);
    // No permitir remover usuarios ADMIN ni al usuario logueado
    const isLocked = user?.role === "ADMIN" || userId === currentUser?.id;
    if (isLocked && taggedUserIds.includes(userId)) {
      return;
    }
    
    setTaggedUserIds((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  const filteredUsers = users.filter(
    (user) =>
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const taggedUsers = users.filter((u) => taggedUserIds.includes(u.id));

  const addUserByEmail = (email: string) => {
    const user = users.find((u) => u.email.toLowerCase() === email.toLowerCase());
    if (user && !taggedUserIds.includes(user.id)) {
      setTaggedUserIds((prev) => [...prev, user.id]);
    }
    setSearchQuery("");
    setShowDropdown(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const listLength = searchQuery ? filteredUsers.length : filteredUsers.slice(0, 5).length;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev < listLength - 1 ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : listLength - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (searchQuery.startsWith("@")) {
        const email = searchQuery.slice(1);
        addUserByEmail(email);
      } else if (highlightedIndex >= 0 && listLength > 0) {
        const user = searchQuery ? filteredUsers[highlightedIndex] : filteredUsers.slice(0, 5)[highlightedIndex];
        if (user) {
          toggleUser(user.id);
          setSearchQuery("");
          setHighlightedIndex(-1);
          setShowDropdown(false);
        }
      }
    } else if (e.key === "Escape") {
      setShowDropdown(false);
      setHighlightedIndex(-1);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground">Cargando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Crear Nuevo Ticket</h1>
        <p className="text-muted-foreground mt-1">
          Completa el formulario para crear un ticket de soporte
        </p>
      </div>

      <div className="bg-card rounded-xl border border-border shadow-sm">
        <form
          onSubmit={handleSubmit}
          className="p-4 sm:p-6 space-y-6"
        >
          <div className="space-y-4">
            <div>
              <Input
                label="Título"
                type="text"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  if (e.target.value.trim()) {
                    setErrors((prev) => ({ ...prev, title: undefined }));
                  }
                }}
                maxLength={125}
                required
                placeholder="Describe el problema brevemente"
                hint={`${title.length}/125 caracteres`}
              />
              {errors.title && (
                <p className="text-sm text-red-500 mt-1">{errors.title}</p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Select
                label="Criticidad"
                value={priority}
                onChange={(e) => setPriority(e.target.value as typeof priority)}
                options={[
                  { value: "LOW", label: "🟢 Baja" },
                  { value: "MEDIUM", label: "🟡 Media" },
                  { value: "HIGH", label: "🟠 Alta" },
                  { value: "CRITICAL", label: "🔴 Crítica" },
                ]}
              />

              <Select
                label="Proyecto"
                value={projectId}
                onChange={(e) => {
                  setProjectId(e.target.value);
                  if (e.target.value) {
                    setErrors({});
                  }
                }}
                options={[
                  { value: "", label: "Selecciona un proyecto..." },
                  ...projects.map((p) => ({
                    value: p.id,
                    label: `${p.name} (${p.abbreviation})`,
                  })),
                ]}
              />
              {errors.project && (
                <p className="text-sm text-red-500 mt-1">{errors.project}</p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              Descripción
            </label>
            <RichTextEditor
              content={description}
              onChange={(value) => {
                setDescription(value);
                if (value.trim() && value !== "<p></p>") {
                  setErrors((prev) => ({ ...prev, description: undefined }));
                }
              }}
              placeholder="Describe detalladamente el problema o solicitud"
            />
            {errors.description && (
              <p className="text-sm text-red-500 mt-1">{errors.description}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Notificar a
            </label>

            <div className="space-y-3">
              {taggedUsers.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {taggedUsers.map((user) => {
                    const isAdmin = user.role === "ADMIN";
                    const isCurrentUser = user.id === currentUser?.id;
                    const isLocked = isAdmin || isCurrentUser;
                    return (
                      <div
                        key={user.id}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium ${
                          isLocked
                            ? "bg-violet-500/10 text-violet-600 cursor-default"
                            : "bg-primary/10 text-primary group"
                        }`}
                      >
                        <span className={`w-5 h-5 rounded-full flex items-center justify-center text-primary-foreground text-xs ${
                          isLocked ? "bg-violet-500" : "bg-primary"
                        }`}>
                          {user.name.charAt(0).toUpperCase()}
                        </span>
                        <span>{user.name}</span>
                        <span className="text-primary/60 text-xs">@{user.email.split("@")[0]}</span>
                        {!isLocked ? (
                          <button
                            type="button"
                            onClick={() => toggleUser(user.id)}
                            className="ml-1 opacity-60 hover:opacity-100"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M18 6 6 18" />
                              <path d="m6 6 12 12" />
                            </svg>
                          </button>
                        ) : (
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="ml-1 opacity-40">
                            <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                          </svg>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="relative" ref={dropdownRef}>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">@</span>
                  <input
                    ref={inputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setShowDropdown(true);
                    }}
                    onFocus={() => setShowDropdown(true)}
                    onKeyDown={handleKeyDown}
                    placeholder="Buscar usuario por correo..."
                    className="w-full pl-8 pr-3 py-2 border border-input rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-primary"
                  />
                </div>

                {showDropdown && searchQuery && (
                  <div className="absolute z-10 w-full mt-1 bg-card border border-border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                    {filteredUsers.length > 0 ? (
                      filteredUsers.map((user, idx) => {
                        const isTagged = taggedUserIds.includes(user.id);
                        const isAdmin = user.role === "ADMIN";
                        const isCurrentUser = user.id === currentUser?.id;
                        const isDisabled = (isAdmin || isCurrentUser) && isTagged;
                        
                        return (
                          <button
                            key={user.id}
                            type="button"
                            onClick={() => {
                              if (!isDisabled) {
                                toggleUser(user.id);
                                setSearchQuery("");
                                setShowDropdown(false);
                              }
                            }}
                            disabled={isDisabled}
                            className={`w-full px-3 py-2 text-left flex items-center gap-2 ${
                              isDisabled
                                ? "opacity-50 cursor-not-allowed"
                                : idx === highlightedIndex
                                ? "bg-primary/10 text-primary"
                                : "hover:bg-secondary/50"
                            }`}
                          >
                            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                              isAdmin || isCurrentUser
                                ? "bg-violet-500 text-white"
                                : isTagged
                                ? "bg-primary/30 text-primary"
                                : idx === highlightedIndex
                                ? "bg-primary text-primary-foreground"
                                : "bg-primary/10 text-primary"
                            }`}>
                              {user.name.charAt(0).toUpperCase()}
                            </span>
                            <div className="flex-1 min-w-0">
                              <p className={`text-sm font-medium truncate ${idx === highlightedIndex && !isDisabled ? "text-primary" : "text-foreground"}`}>{user.name}</p>
                              <p className="text-xs text-muted-foreground truncate">@{user.email}</p>
                            </div>
                            {isAdmin && (
                              <span className="px-1.5 py-0.5 bg-violet-500/10 text-violet-600 rounded text-xs">Admin</span>
                            )}
                            {isCurrentUser && !isAdmin && (
                              <span className="px-1.5 py-0.5 bg-violet-500/10 text-violet-600 rounded text-xs">Tú</span>
                            )}
                            {user.role === "IT" && !isAdmin && !isCurrentUser && (
                              <span className="px-1.5 py-0.5 bg-cyan-500/10 text-cyan-600 rounded text-xs">IT</span>
                            )}
                            {isTagged && !isAdmin && !isCurrentUser && (
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
                                <path d="M20 6 9 17l-5-5" />
                              </svg>
                            )}
                            {isDisabled && (
                              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-violet-500">
                                <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                              </svg>
                            )}
                          </button>
                        );
                      })
                    ) : (
                      <div className="px-3 py-2 text-sm text-muted-foreground">
                        No se encontraron usuarios
                      </div>
                    )}
                  </div>
                )}

                {showDropdown && !searchQuery && filteredUsers.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-card border border-border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                    <div className="px-3 py-2 text-xs text-muted-foreground border-b border-border">
                      Selecciona un usuario para agregar
                    </div>
                    {filteredUsers.slice(0, 5).map((user, idx) => {
                      const isTagged = taggedUserIds.includes(user.id);
                      const isAdmin = user.role === "ADMIN";
                      const isCurrentUser = user.id === currentUser?.id;
                      const isDisabled = (isAdmin || isCurrentUser) && isTagged;
                      
                      return (
                        <button
                          key={user.id}
                          type="button"
                          onClick={() => {
                            if (!isDisabled) {
                              toggleUser(user.id);
                              setSearchQuery("");
                              setShowDropdown(false);
                            }
                          }}
                          disabled={isDisabled}
                          className={`w-full px-3 py-2 text-left flex items-center gap-2 ${
                            isDisabled
                              ? "opacity-50 cursor-not-allowed"
                              : idx === highlightedIndex
                              ? "bg-primary/10 text-primary"
                              : "hover:bg-secondary/50"
                          }`}
                        >
                          <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                            isAdmin || isCurrentUser
                              ? "bg-violet-500 text-white"
                              : isTagged
                              ? "bg-primary/30 text-primary"
                              : idx === highlightedIndex
                              ? "bg-primary text-primary-foreground"
                              : "bg-primary/10 text-primary"
                          }`}>
                            {user.name.charAt(0).toUpperCase()}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-medium truncate ${idx === highlightedIndex && !isDisabled ? "text-primary" : "text-foreground"}`}>{user.name}</p>
                            <p className="text-xs text-muted-foreground truncate">@{user.email}</p>
                          </div>
                          {isAdmin && (
                            <span className="px-1.5 py-0.5 bg-violet-500/10 text-violet-600 rounded text-xs">Admin</span>
                          )}
                          {isCurrentUser && !isAdmin && (
                            <span className="px-1.5 py-0.5 bg-violet-500/10 text-violet-600 rounded text-xs">Tú</span>
                          )}
                          {user.role === "IT" && !isAdmin && !isCurrentUser && (
                            <span className="px-1.5 py-0.5 bg-cyan-500/10 text-cyan-600 rounded text-xs">IT</span>
                          )}
                          {isTagged && !isAdmin && !isCurrentUser && (
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
                              <path d="M20 6 9 17l-5-5" />
                            </svg>
                          )}
                          {isDisabled && (
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-violet-500">
                              <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                            </svg>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <p className="text-xs text-muted-foreground">
                Usa <kbd className="px-1 py-0.5 bg-secondary rounded text-foreground">↑</kbd> <kbd className="px-1 py-0.5 bg-secondary rounded text-foreground">↓</kbd> para navegar, <kbd className="px-1 py-0.5 bg-secondary rounded text-foreground">Enter</kbd> para seleccionar, <kbd className="px-1 py-0.5 bg-secondary rounded text-foreground">Esc</kbd> para cerrar
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4 border-t border-border">
            <Button
              type="button"
              variant="ghost"
              onClick={() => router.push("/tickets")}
            >
              Cancelar
            </Button>
            <Button type="submit" isLoading={isSubmitting}>
              {isSubmitting ? "Creando..." : "Crear Ticket"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
