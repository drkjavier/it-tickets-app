"use client";

import { useEffect, useState, useCallback } from "react";
import { Button, Input, Select, Modal, PageLoader } from "@/components/ui";
import { useToast } from "@/components/ui/Toast";
import { useAuthStore } from "@/lib/store";
import type { ApiResponse } from "@/types";

interface Repo {
  id?: string;
  name: string;
  url: string;
}

interface PublishedUrl {
  id?: string;
  name: string;
  url: string;
  type: "API" | "WEB" | "DB" | "OTHER";
}

interface Project {
  id: string;
  name: string;
  abbreviation: string;
  repoUrl: string | null;
  repos: Repo[];
  publishedUrls: PublishedUrl[];
  envVars: string | null;
  environments: { id: string; name: string; url: string; type: string }[];
}

export default function ProjectsPage() {
  const { addToast } = useToast();
  const { user } = useAuthStore();
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
  const [detailProject, setDetailProject] = useState<Project | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    abbreviation: "",
    repoUrl: "",
    repos: [] as Repo[],
    publishedUrls: [] as PublishedUrl[],
    envVars: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isAdmin = user?.role === "ADMIN";

  const fetchProjects = useCallback(async () => {
    try {
      const response = await fetch("/api/projects");
      const data: ApiResponse<Project[]> = await response.json();
      if (data.success && data.data) {
        setProjects(data.data);
      }
    } catch {
      addToast({
        type: "error",
        title: "Error",
        message: "No se pudieron cargar los proyectos",
      });
    } finally {
      setIsLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const openCreateModal = () => {
    setEditingProject(null);
    setFormData({
      name: "",
      abbreviation: "",
      repoUrl: "",
      repos: [],
      publishedUrls: [],
      envVars: "",
    });
    setShowModal(true);
  };

  const openEditModal = (project: Project) => {
    setEditingProject(project);
    setFormData({
      name: project.name,
      abbreviation: project.abbreviation,
      repoUrl: project.repoUrl || "",
      repos: project.repos || [],
      publishedUrls: project.publishedUrls || [],
      envVars: project.envVars || "",
    });
    setShowModal(true);
  };

  const toggleSecrets = (projectId: string) => {
    setShowSecrets((prev) => ({ ...prev, [projectId]: !prev[projectId] }));
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const url = editingProject
        ? `/api/projects/${editingProject.id}`
        : "/api/projects";
      const method = editingProject ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await response.json();
      if (data.success) {
        setShowModal(false);
        addToast({
          type: "success",
          title: editingProject ? "Proyecto actualizado" : "Proyecto creado",
          message: `El proyecto ${formData.name} fue ${editingProject ? "actualizado" : "creado"} exitosamente`,
        });
        fetchProjects();
      } else {
        addToast({
          type: "error",
          title: "Error",
          message: data.error || "No se pudo guardar el proyecto",
        });
      }
    } catch {
      addToast({
        type: "error",
        title: "Error",
        message: "Error de conexión",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (project: Project) => {
    if (!confirm(`¿Estás seguro de eliminar el proyecto ${project.name}?`)) return;

    try {
      const response = await fetch(`/api/projects/${project.id}`, {
        method: "DELETE",
      });
      const data = await response.json();
      if (data.success) {
        addToast({
          type: "success",
          title: "Proyecto eliminado",
          message: `${project.name} fue eliminado correctamente`,
        });
        fetchProjects();
      } else {
        addToast({
          type: "error",
          title: "Error",
          message: data.error || "No se pudo eliminar el proyecto",
        });
      }
    } catch {
      addToast({
        type: "error",
        title: "Error",
        message: "Error de conexión",
      });
    }
  };

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      addToast({
        type: "success",
        title: "Copiado",
        message: `${label} copiado al portapapeles`,
      });
    } catch {
      addToast({
        type: "error",
        title: "Error",
        message: "No se pudo copiar al portapapeles",
      });
    }
  };

  const addRepo = () => {
    setFormData((prev) => ({
      ...prev,
      repos: [...prev.repos, { name: "", url: "" }],
    }));
  };

  const updateRepo = (index: number, field: keyof Repo, value: string) => {
    setFormData((prev) => ({
      ...prev,
      repos: prev.repos.map((r, i) => (i === index ? { ...r, [field]: value } : r)),
    }));
  };

  const removeRepo = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      repos: prev.repos.filter((_, i) => i !== index),
    }));
  };

  const addPublishedUrl = () => {
    setFormData((prev) => ({
      ...prev,
      publishedUrls: [...prev.publishedUrls, { name: "", url: "", type: "API" }],
    }));
  };

  const updatePublishedUrl = (index: number, field: keyof PublishedUrl, value: string) => {
    setFormData((prev) => ({
      ...prev,
      publishedUrls: prev.publishedUrls.map((p, i) =>
        i === index ? { ...p, [field]: value } : p
      ),
    }));
  };

  const removePublishedUrl = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      publishedUrls: prev.publishedUrls.filter((_, i) => i !== index),
    }));
  };

  const maskEnvVars = (text: string) => {
    if (!text) return "";
    return text
      .split(/\r?\n/)
      .map((line) => {
        const eqIndex = line.indexOf("=");
        if (eqIndex > -1) {
          const key = line.substring(0, eqIndex);
          const value = line.substring(eqIndex + 1);
          if (value.trim()) {
            return `${key}=••••••••`;
          }
        }
        return line;
      })
      .join("\n");
  };

  if (isLoading) {
    return <PageLoader />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Proyectos</h1>
          <p className="text-muted-foreground mt-1">
            Gestiona los proyectos y su configuración
          </p>
        </div>
        {isAdmin && (
          <Button onClick={openCreateModal} className="gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14" />
              <path d="M12 5v14" />
            </svg>
            Nuevo Proyecto
          </Button>
        )}
      </div>

      <div className="grid gap-4">
        {projects.map((project) => {
          const projectShowSecrets = showSecrets[project.id] || false;
          
          return (
            <div
              key={project.id}
              className="bg-card border border-border rounded-xl p-6 shadow-sm hover:border-primary/50 transition-colors max-h-[400px] overflow-hidden flex flex-col"
            >
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 flex-1 overflow-hidden">
                <div className="flex-1 overflow-hidden">
                  <div className="flex items-center gap-3 mb-3">
                    <h3 className="text-lg font-semibold text-foreground">{project.name}</h3>
                    <span className="px-2 py-0.5 bg-primary/10 text-primary rounded text-sm font-mono">
                      {project.abbreviation}
                    </span>
                  </div>

                  <div className="space-y-3 overflow-y-auto max-h-[280px] pr-2">
                    {project.repos && project.repos.length > 0 && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1 font-medium">REPOSITORIOS</p>
                        <div className="flex flex-wrap gap-2">
                          {project.repos.map((repo, i) => (
                            <div key={i} className="flex items-center gap-1">
                              <a
                                href={repo.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-2.5 py-1 bg-secondary rounded-md text-xs font-medium flex items-center gap-1.5 hover:bg-secondary/80"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
                                  <path d="M9 18c-4.51 2-5-2-7-2" />
                                </svg>
                                {repo.name}
                              </a>
                              <button
                                onClick={() => copyToClipboard(repo.url, `URL de ${repo.name}`)}
                                className="p-1 rounded hover:bg-secondary/80 text-muted-foreground hover:text-foreground"
                                title="Copiar URL"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
                                  <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
                                </svg>
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {project.publishedUrls && project.publishedUrls.length > 0 && (
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <p className="text-xs text-muted-foreground font-medium">URLS PUBLICADAS</p>
                          <button
                            onClick={() => toggleSecrets(project.id)}
                            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                          >
                            {projectShowSecrets ? (
                              <>
                                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                                  <line x1="1" y1="1" x2="23" y2="23" />
                                </svg>
                                Ocultar
                              </>
                            ) : (
                              <>
                                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                  <circle cx="12" cy="12" r="3" />
                                </svg>
                                Mostrar
                              </>
                            )}
                          </button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {project.publishedUrls.map((pub, i) => (
                            <div key={i} className="flex items-center gap-1">
                              <span
                                className="px-2.5 py-1 bg-emerald-500/10 text-emerald-600 rounded-md text-xs font-medium flex items-center gap-1.5"
                              >
                                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                                {pub.name}: {pub.type === "DB" && !projectShowSecrets ? "••••••••" : pub.url}
                              </span>
                              {!(pub.type === "DB" && !projectShowSecrets) && (
                                <button
                                  onClick={() => copyToClipboard(pub.url, `URL de ${pub.name}`)}
                                  className="p-1 rounded hover:bg-secondary/80 text-muted-foreground hover:text-foreground"
                                  title="Copiar URL"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
                                    <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
                                  </svg>
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {project.envVars && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1 font-medium">VARIABLES DE ENTORNO</p>
                        <pre className="text-xs bg-secondary/50 rounded p-2 font-mono text-foreground overflow-x-auto max-w-md">
                          {projectShowSecrets ? project.envVars : maskEnvVars(project.envVars)}
                        </pre>
                      </div>
                    )}

                    {project.environments.length > 0 && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1 font-medium">ENTORNOS</p>
                        <div className="flex gap-2 flex-wrap">
                          {project.environments.map((env) => (
                            <span
                              key={env.id}
                              className="px-2.5 py-1 bg-secondary rounded-md text-xs font-medium flex items-center gap-1.5"
                            >
                              <span className={`w-2 h-2 rounded-full ${
                                env.type === "PROD" ? "bg-red-500" :
                                env.type === "STAGING" ? "bg-amber-500" : "bg-emerald-500"
                              }`} />
                              {env.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <Button size="sm" variant="outline" onClick={() => setDetailProject(project)}>
                    Ver detalles
                  </Button>
                  {isAdmin && (
                    <>
                      <Button size="sm" variant="outline" onClick={() => openEditModal(project)}>
                        Editar
                      </Button>
                      <Button size="sm" variant="danger" onClick={() => handleDelete(project)}>
                        Eliminar
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {projects.length === 0 && (
          <div className="text-center py-12 bg-card rounded-xl border border-border">
            <div className="w-16 h-16 rounded-full bg-muted mx-auto mb-4 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground">
                <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">No hay proyectos</h3>
            <p className="text-muted-foreground mb-4">
              {isAdmin ? "Crea el primer proyecto del sistema" : "Aún no hay proyectos creados"}
            </p>
            {isAdmin && <Button onClick={openCreateModal}>Crear Proyecto</Button>}
          </div>
        )}
      </div>

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingProject ? "Editar Proyecto" : "Crear Proyecto"}
        size="lg"
      >
        <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Nombre del proyecto"
              value={formData.name}
              onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="Mi Proyecto"
              required
            />
            <Input
              label="Abreviatura"
              value={formData.abbreviation}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  abbreviation: e.target.value.slice(0, 5).toUpperCase(),
                }))
              }
              placeholder="PROJ"
              required
              maxLength={5}
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm font-medium text-foreground">
                Repositorios
              </label>
              <Button size="sm" variant="outline" onClick={addRepo}>
                + Agregar
              </Button>
            </div>
            {formData.repos.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-3 bg-secondary/50 rounded-lg">
                Sin repositorios agregados
              </p>
            )}
            <div className="space-y-2">
              {formData.repos.map((repo, index) => (
                <div key={index} className="flex gap-2 items-center">
                  <Input
                    value={repo.name}
                    onChange={(e) => updateRepo(index, "name", e.target.value)}
                    placeholder="Nombre (ej: Backend)"
                    className="flex-1"
                  />
                  <Input
                    value={repo.url}
                    onChange={(e) => updateRepo(index, "url", e.target.value)}
                    placeholder="https://github.com/..."
                    className="flex-[2]"
                  />
                  <Button size="icon" variant="ghost" onClick={() => removeRepo(index)} className="text-destructive">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                    </svg>
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm font-medium text-foreground">
                URLs Publicadas
              </label>
              <Button size="sm" variant="outline" onClick={addPublishedUrl}>
                + Agregar
              </Button>
            </div>
            {formData.publishedUrls.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-3 bg-secondary/50 rounded-lg">
                Sin URLs publicadas
              </p>
            )}
            <div className="space-y-2">
              {formData.publishedUrls.map((pub, index) => (
                <div key={index} className="flex gap-2 items-center">
                  <Select
                    value={pub.type}
                    onChange={(e) => updatePublishedUrl(index, "type", e.target.value)}
                    options={[
                      { value: "API", label: "API" },
                      { value: "WEB", label: "WEB" },
                      { value: "DB", label: "DB" },
                      { value: "OTHER", label: "OTHER" },
                    ]}
                    className="w-28"
                  />
                  <Input
                    value={pub.name}
                    onChange={(e) => updatePublishedUrl(index, "name", e.target.value)}
                    placeholder="Nombre"
                    className="flex-1"
                  />
                  <Input
                    value={pub.url}
                    onChange={(e) => updatePublishedUrl(index, "url", e.target.value)}
                    placeholder="https://"
                    className="flex-[2]"
                  />
                  <Button size="icon" variant="ghost" onClick={() => removePublishedUrl(index)} className="text-destructive">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                    </svg>
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm font-medium text-foreground">
                Variables de Entorno
              </label>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowSecrets((prev) => ({ ...prev, "edit-form": !prev["edit-form"] }))}
                className="gap-1"
              >
                {showSecrets["edit-form"] ? (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                    Ocultar
                  </>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                    Mostrar
                  </>
                )}
              </Button>
            </div>
            {showSecrets["edit-form"] ? (
              <textarea
                value={formData.envVars}
                onChange={(e) => setFormData((prev) => ({ ...prev, envVars: e.target.value }))}
                placeholder={`DATABASE_URL=postgresql://...\nAPI_KEY=your-api-key\nREDIS_URL=redis://...`}
                className="w-full h-40 px-3.5 py-2.5 bg-background border border-input rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-primary font-mono text-sm resize-y"
              />
            ) : (
              <div
                className="w-full h-40 px-3.5 py-2.5 bg-secondary/50 border border-input rounded-lg font-mono text-sm overflow-y-auto whitespace-pre-wrap"
                onClick={() => setShowSecrets((prev) => ({ ...prev, "edit-form": true }))}
              >
                {formData.envVars ? maskEnvVars(formData.envVars) : (
                  <span className="text-muted-foreground">Haz clic en "Mostrar" para editar las variables</span>
                )}
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-1.5">
              Ingresa las variables en formato CLAVE=VALOR, una por línea
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-border sticky bottom-0 bg-card">
            <Button variant="ghost" onClick={() => setShowModal(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting} isLoading={isSubmitting}>
              {isSubmitting ? "Guardando..." : editingProject ? "Actualizar" : "Crear"}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={!!detailProject}
        onClose={() => setDetailProject(null)}
        title="Detalles del Proyecto"
        size="lg"
      >
        {detailProject && (
          <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-2">
            <div className="flex items-center gap-3">
              <h3 className="text-xl font-semibold text-foreground">{detailProject.name}</h3>
              <span className="px-2 py-0.5 bg-primary/10 text-primary rounded text-sm font-mono">
                {detailProject.abbreviation}
              </span>
            </div>

            {detailProject.repos && detailProject.repos.length > 0 && (
              <div>
                <p className="text-sm font-medium text-foreground mb-2">Repositorios</p>
                <div className="space-y-2">
                  {detailProject.repos.map((repo, i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
                          <path d="M9 18c-4.51 2-5-2-7-2" />
                        </svg>
                        <span className="font-medium">{repo.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <a
                          href={repo.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-primary hover:underline"
                        >
                          {repo.url}
                        </a>
                        <button
                          onClick={() => copyToClipboard(repo.url, `URL de ${repo.name}`)}
                          className="p-1 rounded hover:bg-secondary/80 text-muted-foreground hover:text-foreground"
                          title="Copiar URL"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
                            <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {detailProject.publishedUrls && detailProject.publishedUrls.length > 0 && (
              <div>
                <div className="flex justify-between items-center mb-2">
                  <p className="text-sm font-medium text-foreground">URLs Publicadas</p>
                  <button
                    onClick={() => toggleSecrets(`detail-${detailProject.id}`)}
                    className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                  >
                    {showSecrets[`detail-${detailProject.id}`] ? (
                      <>
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                          <line x1="1" y1="1" x2="23" y2="23" />
                        </svg>
                        Ocultar
                      </>
                    ) : (
                      <>
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                        Mostrar
                      </>
                    )}
                  </button>
                </div>
                <div className="space-y-2">
                  {detailProject.publishedUrls.map((pub, i) => {
                    const detailShowSecrets = showSecrets[`detail-${detailProject.id}`] || false;
                    return (
                      <div key={i} className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg">
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${
                            pub.type === "API" ? "bg-blue-500" :
                            pub.type === "WEB" ? "bg-green-500" :
                            pub.type === "DB" ? "bg-purple-500" : "bg-gray-500"
                          }`} />
                          <span className="font-medium">{pub.name}</span>
                          <span className="text-xs text-muted-foreground">({pub.type})</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm">
                            {pub.type === "DB" && !detailShowSecrets ? "••••••••" : pub.url}
                          </span>
                          {!(pub.type === "DB" && !detailShowSecrets) && (
                            <button
                              onClick={() => copyToClipboard(pub.url, `URL de ${pub.name}`)}
                              className="p-1 rounded hover:bg-secondary/80 text-muted-foreground hover:text-foreground"
                              title="Copiar URL"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
                                <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
                              </svg>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {detailProject.envVars && (
              <div>
                <div className="flex justify-between items-center mb-2">
                  <p className="text-sm font-medium text-foreground">Variables de Entorno</p>
                  <button
                    onClick={() => toggleSecrets(`detail-env-${detailProject.id}`)}
                    className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                  >
                    {showSecrets[`detail-env-${detailProject.id}`] ? (
                      <>
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                          <line x1="1" y1="1" x2="23" y2="23" />
                        </svg>
                        Ocultar
                      </>
                    ) : (
                      <>
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                        Mostrar
                      </>
                    )}
                  </button>
                </div>
                <pre className="text-xs bg-secondary/50 rounded-lg p-4 font-mono text-foreground overflow-x-auto whitespace-pre-wrap">
                  {showSecrets[`detail-env-${detailProject.id}`] ? detailProject.envVars : maskEnvVars(detailProject.envVars)}
                </pre>
              </div>
            )}

            {detailProject.environments.length > 0 && (
              <div>
                <p className="text-sm font-medium text-foreground mb-2">Entornos</p>
                <div className="space-y-2">
                  {detailProject.environments.map((env) => (
                    <div key={env.id} className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <span className={`w-3 h-3 rounded-full ${
                          env.type === "PROD" ? "bg-red-500" :
                          env.type === "STAGING" ? "bg-amber-500" : "bg-emerald-500"
                        }`} />
                        <span className="font-medium">{env.name}</span>
                        <span className="text-xs text-muted-foreground">({env.type})</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-primary">{env.url}</span>
                        <button
                          onClick={() => copyToClipboard(env.url, `URL de ${env.name}`)}
                          className="p-1 rounded hover:bg-secondary/80 text-muted-foreground hover:text-foreground"
                          title="Copiar URL"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
                            <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
