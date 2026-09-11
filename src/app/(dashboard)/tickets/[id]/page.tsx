"use client";

import { useEffect, useState, useCallback, use } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/store";
import { Button, Badge, Modal, PageLoader } from "@/components/ui";
import { RichTextEditor } from "@/components/tiptap/RichTextEditor";
import type { ApiResponse, TicketStatus, Priority, ResolutionType, BranchType } from "@/types";
import type { TicketWithRelations } from "@/types";

const STATUS_LABELS: Record<TicketStatus, string> = {
  CREATED: "Creado",
  EN_COURSE: "En curso",
  IN_REVIEW: "En revisión",
  REJECTED: "Rechazado",
  TERMINATED: "Terminado",
};

const PRIORITY_LABELS: Record<Priority, string> = {
  LOW: "Baja",
  MEDIUM: "Media",
  HIGH: "Alta",
  CRITICAL: "Crítica",
};

export default function TicketDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { user } = useAuthStore();
  const [ticket, setTicket] = useState<TicketWithRelations | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"info" | "subtasks">("info");
  const [newComment, setNewComment] = useState("");
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [rating, setRating] = useState(5);
  const [showStatusHistory, setShowStatusHistory] = useState(false);
  const [newSubtask, setNewSubtask] = useState("");
  const [showReassignModal, setShowReassignModal] = useState(false);
  const [availableUsers, setAvailableUsers] = useState<Array<{ id: string; name: string; email: string; role: string }>>([]);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [isReassigning, setIsReassigning] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showResolutionModal, setShowResolutionModal] = useState(false);
  const [newResolutionType, setNewResolutionType] = useState<ResolutionType | "">("");
  const [newBranchName, setNewBranchName] = useState("");
  const [newBranchType, setNewBranchType] = useState<BranchType | "">("");
  const [newDbScript, setNewDbScript] = useState("");
  const [isAddingResolution, setIsAddingResolution] = useState(false);
  const [expandedScripts, setExpandedScripts] = useState<Set<string>>(new Set());

  const fetchTicket = useCallback(async () => {
    try {
      const response = await fetch(`/api/tickets/${id}`);
      const data: ApiResponse<TicketWithRelations> = await response.json();
      if (data.success && data.data) {
        setTicket(data.data);
      }
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchTicket();
  }, [fetchTicket]);

  const handleStatusChange = async (newStatus: TicketStatus) => {
    try {
      const response = await fetch(`/api/tickets/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      const data = await response.json();
      if (data.success) {
        fetchTicket();
        if (newStatus === "TERMINATED" && ticket?.createdById === user?.id) {
          setRating(5);
          setShowRatingModal(true);
        }
      }
    } catch (error) {
    }
  };

  const handleSelfAssign = async () => {
    if (!user) return;
    try {
      const response = await fetch(`/api/tickets/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assignedToId: user.id }),
      });

      const data = await response.json();
      if (data.success) {
        fetchTicket();
      }
    } catch (error) {
    }
  };

  const fetchAvailableUsers = async () => {
    try {
      const response = await fetch("/api/users/taggable");
      const data: ApiResponse<Array<{ id: string; name: string; email: string; role: string }>> = await response.json();
      if (data.success && data.data) {
        setAvailableUsers(data.data.filter(u => u.role === "IT" || u.role === "ADMIN"));
      }
    } catch (error) {
    }
  };

  const handleReassign = async () => {
    if (!selectedUserId) return;
    setIsReassigning(true);
    try {
      const response = await fetch(`/api/tickets/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assignedToId: selectedUserId }),
      });

      const data = await response.json();
      if (data.success) {
        fetchTicket();
        setShowReassignModal(false);
        setSelectedUserId("");
      }
    } catch (error) {
    } finally {
      setIsReassigning(false);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;

    setIsSubmittingComment(true);
    try {
      const response = await fetch(`/api/tickets/${id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: newComment }),
      });

      const data = await response.json();
      if (data.success) {
        setNewComment("");
        fetchTicket();
      }
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handleToggleSubtask = async (subtaskId: string, isCompleted: boolean) => {
    try {
      await fetch(`/api/tickets/${id}/subtasks/${subtaskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isCompleted: !isCompleted }),
      });
      fetchTicket();
    } catch (error) {
    }
  };

  const handleAddSubtask = async () => {
    if (!newSubtask.trim()) return;

    try {
      await fetch(`/api/tickets/${id}/subtasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newSubtask }),
      });
      setNewSubtask("");
      fetchTicket();
    } catch (error) {
    }
  };

  const handleRating = async () => {
    try {
      await fetch(`/api/tickets/${id}/rating`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating }),
      });
      setShowRatingModal(false);
      fetchTicket();
    } catch (error) {
    }
  };

  const handleDeleteTicket = async () => {
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/tickets/${id}`, {
        method: "DELETE",
      });
      const data = await response.json();
      
      if (data.success) {
        router.push("/tickets");
      }
    } finally {
      setIsDeleting(false);
    }
  };

  const handleAddResolution = async () => {
    if (!newResolutionType) return;

    setIsAddingResolution(true);
    try {
      const response = await fetch(`/api/tickets/${id}/resolutions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: newResolutionType,
          branchName: newResolutionType === "CODE" ? newBranchName : null,
          branchType: newResolutionType === "CODE" ? newBranchType : null,
          dbScript: newResolutionType === "DATABASE" ? newDbScript : null,
        }),
      });
      const data = await response.json();
      
      if (data.success) {
        fetchTicket();
        setNewResolutionType("");
        setNewBranchName("");
        setNewBranchType("");
        setNewDbScript("");
      }
    } finally {
      setIsAddingResolution(false);
    }
  };

  const handleDeleteResolution = async (resolutionId: string) => {
    if (!confirm("¿Estás seguro de eliminar esta resolución?")) return;

    try {
      const response = await fetch(`/api/tickets/${id}/resolutions?resolutionId=${resolutionId}`, {
        method: "DELETE",
      });
      const data = await response.json();
      
      if (data.success) {
        fetchTicket();
      }
    } catch (error) {
    }
  };

  const toggleScript = (resolutionId: string) => {
    setExpandedScripts((prev) => {
      const next = new Set(prev);
      if (next.has(resolutionId)) {
        next.delete(resolutionId);
      } else {
        next.add(resolutionId);
      }
      return next;
    });
  };

  const openResolutionModal = () => {
    setShowResolutionModal(true);
    setNewResolutionType("");
    setNewBranchName("");
    setNewBranchType("");
    setNewDbScript("");
  };

  if (isLoading) {
    return <PageLoader />;
  }

  if (!ticket) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground">
            <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-foreground">Ticket no encontrado</h3>
        <Button variant="outline" onClick={() => router.push("/tickets")}>
          Volver a Mis Tickets
        </Button>
      </div>
    );
  }

  const canChangeToTerminated =
    ticket.status === "IN_REVIEW" && (ticket.createdById === user?.id || user?.role === "ADMIN");
  const canChangeToRejected =
    ticket.status === "IN_REVIEW" && (ticket.createdById === user?.id || user?.role === "ADMIN");
  const canMoveToReview =
    ticket.status === "EN_COURSE" &&
    (user?.role === "ADMIN" || user?.role === "IT");
  const canTakeTicket =
    ticket.status === "CREATED" &&
    !ticket.assignedTo &&
    (user?.role === "ADMIN" || user?.role === "IT");
  const canResumeTicket =
    ticket.status === "REJECTED" &&
    (user?.role === "ADMIN" || user?.role === "IT");
  const canRequestReview =
    ticket.status === "REJECTED" &&
    user?.id === ticket.createdById;

  const tabs: { id: "info" | "subtasks"; label: string; count: number | null }[] = [
    { id: "info", label: "Información", count: null },
    ...((user?.role === "ADMIN" || user?.role === "IT")
      ? [{ id: "subtasks" as const, label: "Subtareas", count: ticket.subtasks?.length || 0 }]
      : []),
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
        <div className="space-y-2 pr-12 sm:pr-0">
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            <span className="font-mono font-bold text-sm sm:text-lg px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-md bg-primary/10 text-primary">
              {ticket.code}
            </span>
            <Badge
              variant={
                ticket.priority === "CRITICAL"
                  ? "danger"
                  : ticket.priority === "HIGH"
                  ? "warning"
                  : "default"
              }
              className="text-xs sm:text-sm"
            >
              {PRIORITY_LABELS[ticket.priority]}
            </Badge>
            <Badge variant="info" className="text-xs sm:text-sm">{STATUS_LABELS[ticket.status]}</Badge>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground leading-tight">{ticket.title}</h1>
        </div>
        <div className="flex flex-wrap sm:flex-nowrap gap-2">
          {(user?.role === "ADMIN" || user?.role === "IT") && (
            <Button
              variant="outline"
              onClick={openResolutionModal}
              className="gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3"
              size="sm"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
              </svg>
              <span className="hidden sm:inline">Resolución</span>
            </Button>
          )}
          {user?.role === "ADMIN" && (
            <Button
              variant="danger"
              onClick={() => setShowDeleteModal(true)}
              className="gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3"
              size="sm"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 6h18" />
                <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
              </svg>
              <span className="hidden sm:inline">Eliminar</span>
            </Button>
          )}
          <Button variant="outline" onClick={() => router.push("/tickets")} className="gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3" size="sm">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m15 18-6-6 6-6" />
            </svg>
            <span className="hidden sm:inline">Volver</span>
          </Button>
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
        <div className="border-b border-border">
          <div className="flex overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 sm:px-6 py-3 text-xs sm:text-sm font-medium whitespace-nowrap transition-colors relative ${
                  activeTab === tab.id
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <span className="flex items-center gap-2">
                  {tab.label}
                  {tab.count !== null && (
                    <span className={`px-1.5 py-0.5 rounded-full text-xs ${
                      activeTab === tab.id
                        ? "bg-primary/10 text-primary"
                        : "bg-secondary text-secondary-foreground"
                    }`}>
                      {tab.count}
                    </span>
                  )}
                </span>
                {activeTab === tab.id && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="p-4 sm:p-6">
          {activeTab === "info" && (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-3">Descripción</h3>
                <div
                  className="prose max-w-none p-4 bg-secondary/50 rounded-lg"
                  dangerouslySetInnerHTML={{ __html: ticket.description }}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 bg-secondary/30 rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">Proyecto</p>
                  <p className="font-medium text-foreground flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z" />
                    </svg>
                    {ticket.project.name}
                  </p>
                </div>
                <div className="p-4 bg-secondary/30 rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">Asignado a</p>
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium text-foreground flex items-center gap-2">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                        <circle cx="9" cy="7" r="4" />
                      </svg>
                      {ticket.assignedTo?.name || "Sin asignar"}
                    </p>
                    {user?.role === "ADMIN" && (
                      <button
                        type="button"
                        onClick={() => {
                          fetchAvailableUsers();
                          setShowReassignModal(true);
                        }}
                        className="text-xs text-primary hover:text-primary/80 flex items-center gap-1"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M17 1l4 4-4 4" />
                          <path d="M3 11V9a4 4 0 0 1 4-4h14" />
                          <path d="M7 23l-4-4 4-4" />
                          <path d="M21 13v2a4 4 0 0 1-4 4H3" />
                        </svg>
                        Reasignar
                      </button>
                    )}
                  </div>
                </div>
                <div className="p-4 bg-secondary/30 rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">Creado por</p>
                  <p className="font-medium text-foreground flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="8" r="5" />
                      <path d="M20 21a8 8 0 0 0-16 0" />
                    </svg>
                    {ticket.createdBy.name}
                  </p>
                </div>
                <div className="p-4 bg-secondary/30 rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">Fecha de creación</p>
                  <p className="font-medium text-foreground flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
                      <line x1="16" x2="16" y1="2" y2="6" />
                      <line x1="8" x2="8" y1="2" y2="6" />
                      <line x1="3" x2="21" y1="10" y2="10" />
                    </svg>
                    {new Date(ticket.createdAt).toLocaleString("es-ES", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>

              {ticket.taggedUsers && ticket.taggedUsers.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-3">Usuarios notificados</h3>
                  <div className="flex flex-wrap gap-2">
                    {ticket.taggedUsers.map((tag) => (
                      <span
                        key={tag.id}
                        className="px-3 py-1.5 bg-secondary rounded-lg text-sm flex items-center gap-1.5"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="8" r="5" />
                          <path d="M20 21a8 8 0 0 0-16 0" />
                        </svg>
                        {tag.user.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {ticket.rating && (
                  <div className="p-4 bg-amber-500/10 rounded-lg border border-amber-500/20">
                    <h3 className="text-sm font-medium text-amber-600 mb-2">Calificación</h3>
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <svg
                          key={star}
                          xmlns="http://www.w3.org/2000/svg"
                          width="24"
                          height="24"
                          viewBox="0 0 24 24"
                          fill={star <= ticket.rating! ? "#f59e0b" : "transparent"}
                          stroke={star <= ticket.rating! ? "#f59e0b" : "var(--muted-foreground)"}
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                        </svg>
                      ))}
                    </div>
                  </div>
                )}

                {ticket.statusHistory && ticket.statusHistory.length > 0 && (() => {
                  const totalSeconds = ticket.statusHistory.reduce((sum, h) => sum + (h.durationSeconds || 0), 0);
                  return (
                    <button
                      onClick={() => setShowStatusHistory(true)}
                      className="p-4 bg-secondary/30 rounded-lg border border-border hover:border-primary/50 hover:bg-secondary/50 transition-colors text-left"
                    >
                      <div className="flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
                          <circle cx="12" cy="12" r="10" />
                          <polyline points="12 6 12 12 16 14" />
                        </svg>
                        <span className="text-sm font-medium text-foreground">Historial</span>
                      </div>
                      {totalSeconds > 0 && (
                        <div className="mt-2 flex items-center gap-2">
                          <span className="px-2 py-0.5 bg-primary/10 text-primary rounded-full text-xs font-medium">
                            {Math.floor(totalSeconds / 3600)}h {Math.floor((totalSeconds % 3600) / 60)}m
                          </span>
                          <span className="text-xs text-muted-foreground">tiempo total</span>
                        </div>
                      )}
                    </button>
                  );
                })()}
              </div>

              <div className="flex flex-wrap gap-2 sm:gap-3 pt-4 border-t border-border">
                {canTakeTicket && (
                  <Button onClick={handleSelfAssign} className="bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white shadow-lg shadow-blue-500/25 text-xs sm:text-sm">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1 sm:mr-2">
                      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                      <circle cx="9" cy="7" r="4" />
                      <line x1="19" x2="19" y1="8" y2="14" />
                      <line x1="22" x2="16" y1="11" y2="11" />
                    </svg>
                    <span className="hidden sm:inline">Tomar Ticket</span>
                    <span className="sm:hidden">Tomar</span>
                  </Button>
                )}
                {canMoveToReview && (
                  <Button onClick={() => handleStatusChange("IN_REVIEW")} className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white shadow-lg shadow-amber-500/25 text-xs sm:text-sm">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1 sm:mr-2">
                      <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
                      <path d="M21 3v5h-5" />
                    </svg>
                    <span className="hidden sm:inline">Enviar a Revisión</span>
                    <span className="sm:hidden">Revisión</span>
                  </Button>
                )}
                {canResumeTicket && (
                  <Button onClick={() => handleStatusChange("EN_COURSE")} className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white shadow-lg shadow-cyan-500/25 text-xs sm:text-sm">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1 sm:mr-2">
                      <polygon points="5 3 19 12 5 21 5 3" />
                    </svg>
                    <span className="hidden sm:inline">Reanudar Trabajo</span>
                    <span className="sm:hidden">Reanudar</span>
                  </Button>
                )}
                {canRequestReview && (
                  <Button onClick={() => handleStatusChange("IN_REVIEW")} className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white shadow-lg shadow-amber-500/25 text-xs sm:text-sm">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1 sm:mr-2">
                      <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
                      <path d="M21 3v5h-5" />
                    </svg>
                    <span className="hidden sm:inline">Solicitar Revisión</span>
                    <span className="sm:hidden">Revisión</span>
                  </Button>
                )}
                {canChangeToTerminated && (
                  <Button onClick={() => handleStatusChange("TERMINATED")} className="bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white shadow-lg shadow-emerald-500/25 text-xs sm:text-sm">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1 sm:mr-2">
                      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                      <path d="m9 11 3 3L22 4" />
                    </svg>
                    <span className="hidden sm:inline">Aprobar y Finalizar</span>
                    <span className="sm:hidden">Aprobar</span>
                  </Button>
                )}
                {canChangeToRejected && (
                  <Button variant="danger" onClick={() => handleStatusChange("REJECTED")} className="shadow-lg shadow-red-500/25 text-xs sm:text-sm">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1 sm:mr-2">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="15" y1="9" x2="9" y2="15" />
                      <line x1="9" y1="9" x2="15" y2="15" />
                    </svg>
                    Rechazar
                  </Button>
                )}
              </div>
            </div>
          )}

          {activeTab === "subtasks" && (user?.role === "ADMIN" || user?.role === "IT") && (
            <div className="space-y-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newSubtask}
                  onChange={(e) => setNewSubtask(e.target.value)}
                  placeholder="Nueva subtarea..."
                  className="flex-1 px-3 py-2 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring text-sm"
                  onKeyDown={(e) => e.key === "Enter" && handleAddSubtask()}
                />
                <Button onClick={handleAddSubtask} className="text-sm">Agregar</Button>
              </div>

              <div className="space-y-2">
                {ticket.subtasks?.map((subtask) => (
                  <label
                    key={subtask.id}
                    className="flex items-center gap-2 sm:gap-3 p-3 sm:p-4 bg-secondary/50 rounded-lg cursor-pointer hover:bg-secondary transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={subtask.isCompleted}
                      onChange={() =>
                        handleToggleSubtask(subtask.id, subtask.isCompleted)
                      }
                      className="w-5 h-5 rounded border-input text-primary focus:ring-primary"
                    />
                    <span
                      className={`flex-1 ${
                        subtask.isCompleted ? "line-through text-muted-foreground" : "text-foreground"
                      }`}
                    >
                      {subtask.title}
                    </span>
                  </label>
                ))}
                {(!ticket.subtasks || ticket.subtasks.length === 0) && (
                  <div className="text-center py-8">
                    <div className="w-12 h-12 rounded-full bg-muted mx-auto mb-3 flex items-center justify-center">
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground">
                        <path d="M9 11l3 3L22 4" />
                        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                      </svg>
                    </div>
                    <p className="text-muted-foreground">No hay subtareas</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
        <div className="border-b border-border px-6 py-4">
          <h3 className="font-semibold text-foreground flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            Comentarios ({ticket.comments?.length || 0})
          </h3>
        </div>
        <div className="p-4 sm:p-6 space-y-4">
          <RichTextEditor
            content={newComment}
            onChange={setNewComment}
            placeholder="Escribe un comentario..."
            editable={true}
          />
          <div className="flex justify-end">
            <Button
              onClick={handleAddComment}
              disabled={isSubmittingComment || !newComment.trim()}
              isLoading={isSubmittingComment}
            >
              Enviar Comentario
            </Button>
          </div>

          <div className="space-y-4 pt-4 border-t border-border">
            {ticket.comments?.slice().reverse().map((comment) => (
              <div key={comment.id} className="bg-secondary/50 p-3 sm:p-4 rounded-lg">
                <div className="flex justify-between items-start mb-2 sm:mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-xs font-semibold text-primary">
                        {comment.user.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <span className="font-medium text-foreground">{comment.user.name}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(comment.createdAt).toLocaleString("es-ES", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
                <div
                  className="prose max-w-none text-sm"
                  dangerouslySetInnerHTML={{ __html: comment.content }}
                />
              </div>
            ))}
            {(!ticket.comments || ticket.comments.length === 0) && (
              <div className="text-center py-8">
                <div className="w-12 h-12 rounded-full bg-muted mx-auto mb-3 flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  </svg>
                </div>
                <p className="text-muted-foreground">No hay comentarios</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <Modal
        isOpen={showRatingModal}
        onClose={() => {}}
        title="¡Ticket Finalizado!"
        size="sm"
      >
        <div className="text-center py-4">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 mx-auto mb-4 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <path d="m9 11 3 3L22 4" />
            </svg>
          </div>
          <p className="text-lg font-medium text-foreground mb-2">¡Gracias por tu trabajo!</p>
          <p className="text-muted-foreground mb-6">¿Cómo fue tu experiencia con este soporte?</p>
          <div className="flex justify-center gap-2 mb-6">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                onClick={() => setRating(star)}
                className="text-5xl hover:scale-110 transition-transform focus:outline-none"
              >
                <span className={star <= rating ? "text-amber-400" : "text-muted-foreground/30"}>
                  ★
                </span>
              </button>
            ))}
          </div>
          <div className="flex gap-3 justify-center">
            <Button onClick={handleRating} disabled={rating === 0}>
              Enviar Calificación
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={showStatusHistory}
        onClose={() => setShowStatusHistory(false)}
        title="Historial de Cambios"
        size="md"
      >
        <div className="space-y-3">
          {[...ticket?.statusHistory || []].reverse().map((history, index) => (
            <div key={history.id} className="flex items-start gap-3 p-3 bg-secondary/30 rounded-lg">
              <div className="flex flex-col items-center">
                <div className="w-3 h-3 rounded-full bg-primary" />
                {index < (ticket?.statusHistory?.length || 0) - 1 && (
                  <div className="w-0.5 h-8 bg-border mt-1" />
                )}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-foreground">
                    {STATUS_LABELS[history.toStatus as TicketStatus] || history.toStatus}
                  </span>
                  {history.fromStatus && (
                    <span className="text-muted-foreground text-sm">
                      ← {STATUS_LABELS[history.fromStatus as TicketStatus] || history.fromStatus}
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {new Date(history.createdAt).toLocaleString("es-ES", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
              {history.durationSeconds && (
                <span className="text-xs text-primary bg-primary/10 px-2 py-1 rounded-full">
                  {Math.floor(history.durationSeconds / 3600)}h {Math.floor((history.durationSeconds % 3600) / 60)}m
                </span>
              )}
            </div>
          ))}
        </div>
      </Modal>

      <Modal
        isOpen={showReassignModal}
        onClose={() => {
          setShowReassignModal(false);
          setSelectedUserId("");
        }}
        title="Reasignar Ticket"
        size="sm"
      >
        <div className="space-y-4">
          <div className="p-3 bg-secondary/50 rounded-lg">
            <p className="text-sm text-muted-foreground mb-1">Ticket actual</p>
            <p className="font-medium text-foreground">{ticket?.code} - {ticket?.title}</p>
            {ticket?.assignedTo && (
              <p className="text-sm text-muted-foreground mt-1">
                Asignado a: <span className="font-medium">{ticket.assignedTo.name}</span>
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              Nuevo asignado
            </label>
            <select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              className="w-full px-3 py-2 border border-input rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">Selecciona un usuario...</option>
              {availableUsers.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.email}) - {u.role === "ADMIN" ? "Admin" : "IT"}
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-3 justify-end pt-2">
            <Button
              variant="ghost"
              onClick={() => {
                setShowReassignModal(false);
                setSelectedUserId("");
              }}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleReassign}
              isLoading={isReassigning}
              disabled={!selectedUserId}
            >
              Reasignar
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Eliminar Ticket"
        size="sm"
      >
        <div className="space-y-4">
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
            <div className="flex items-start gap-3">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-500 flex-shrink-0">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
              <div>
                <p className="font-medium text-foreground mb-1">¿Estás seguro?</p>
                <p className="text-sm text-muted-foreground">
                  Esta acción eliminará permanentemente el ticket <span className="font-mono font-bold">{ticket?.code}</span> y todos sus datos asociados. Esta acción no se puede deshacer.
                </p>
              </div>
            </div>
          </div>

          <div className="flex gap-3 justify-end">
            <Button
              variant="ghost"
              onClick={() => setShowDeleteModal(false)}
              disabled={isDeleting}
            >
              Cancelar
            </Button>
            <Button
              variant="danger"
              onClick={handleDeleteTicket}
              isLoading={isDeleting}
            >
              Eliminar Ticket
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={showResolutionModal}
        onClose={() => setShowResolutionModal(false)}
        title="Resoluciones del Ticket"
        size="lg"
      >
        <div className="space-y-6">
          {/* Lista de resoluciones existentes */}
          <div>
            <h3 className="text-sm font-medium text-foreground mb-3">
              Resoluciones ({ticket?.resolutions?.length || 0})
            </h3>
            {ticket?.resolutions && ticket.resolutions.length > 0 ? (
              <div className="space-y-3">
                {ticket.resolutions.map((resolution) => (
                  <div
                    key={resolution.id}
                    className="p-4 bg-secondary/30 rounded-lg border border-border"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge
                            variant={
                              resolution.type === "CODE"
                                ? "info"
                                : resolution.type === "DATABASE"
                                ? "warning"
                                : "default"
                            }
                          >
                            {resolution.type === "CODE"
                              ? "Código"
                              : resolution.type === "DATABASE"
                              ? "Base de Datos"
                              : resolution.type === "INSTALLATION"
                              ? "Instalación"
                              : "Reparación"}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {new Date(resolution.createdAt).toLocaleDateString("es-ES")}
                          </span>
                        </div>
                        {resolution.type === "CODE" && resolution.branchName && (
                          <p className="text-sm text-foreground">
                            <span className="font-medium">Branch:</span>{" "}
                            <code className="px-2 py-0.5 bg-secondary rounded text-xs font-mono">
                              {resolution.branchName}
                            </code>
                            {resolution.branchType && (
                              <span className="ml-2 px-2 py-0.5 bg-blue-500/10 text-blue-600 rounded text-xs">
                                {resolution.branchType}
                              </span>
                            )}
                          </p>
                        )}
                        {resolution.type === "DATABASE" && resolution.dbScript && (
                          <div>
                            <p className="text-sm font-medium text-foreground mb-1">Script SQL:</p>
                            <pre className={`text-xs bg-secondary/50 rounded p-2 font-mono text-foreground overflow-x-auto whitespace-pre-wrap ${expandedScripts.has(resolution.id) ? "" : "max-h-32"}`}>
                              {resolution.dbScript}
                            </pre>
                            <button
                              onClick={() => toggleScript(resolution.id)}
                              className="mt-1 text-xs text-primary hover:text-primary/80 font-medium"
                            >
                              {expandedScripts.has(resolution.id) ? "Ver menos" : "Ver más"}
                            </button>
                          </div>
                        )}
                      </div>
                      {(user?.role === "ADMIN" || user?.role === "IT") && (
                        <button
                          onClick={() => handleDeleteResolution(resolution.id)}
                          className="p-1.5 rounded-lg text-red-500 hover:bg-red-500/10 transition-colors"
                          title="Eliminar resolución"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M3 6h18" />
                            <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                            <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                No hay resoluciones registradas
              </p>
            )}
          </div>

          {/* Formulario para agregar nueva resolución */}
          {(user?.role === "ADMIN" || user?.role === "IT") && (
            <div className="border-t border-border pt-6">
              <h3 className="text-sm font-medium text-foreground mb-3">
                Agregar Nueva Resolución
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Tipo de resolución
                  </label>
                  <select
                    value={newResolutionType}
                    onChange={(e) => setNewResolutionType(e.target.value as ResolutionType)}
                    className="w-full px-3 py-2 border border-input rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="">Selecciona un tipo...</option>
                    <option value="CODE">Código (Branch)</option>
                    <option value="DATABASE">Base de Datos (Script)</option>
                    <option value="INSTALLATION">Instalación</option>
                    <option value="REPAIR">Reparación</option>
                  </select>
                </div>

                {newResolutionType === "CODE" && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Tipo de Branch
                      </label>
                      <select
                        value={newBranchType}
                        onChange={(e) => setNewBranchType(e.target.value as BranchType)}
                        className="w-full px-3 py-2 border border-input rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                      >
                        <option value="">Selecciona el tipo...</option>
                        <option value="BACKEND">Backend</option>
                        <option value="FRONTEND">Frontend</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Nombre de la Branch
                      </label>
                      <input
                        type="text"
                        value={newBranchName}
                        onChange={(e) => setNewBranchName(e.target.value)}
                        placeholder="ej: feature/fix-login-bug"
                        className="w-full px-3 py-2 border border-input rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                    </div>
                  </>
                )}

                {newResolutionType === "DATABASE" && (
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Script SQL
                    </label>
                    <textarea
                      value={newDbScript}
                      onChange={(e) => setNewDbScript(e.target.value)}
                      placeholder="INSERT INTO ...&#10;UPDATE ...&#10;DELETE FROM ..."
                      className="w-full h-32 px-3 py-2 border border-input rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring font-mono text-sm resize-y"
                    />
                  </div>
                )}

                <div className="flex justify-end gap-3">
                  <Button
                    variant="ghost"
                    onClick={() => setShowResolutionModal(false)}
                  >
                    Cerrar
                  </Button>
                  <Button
                    onClick={handleAddResolution}
                    isLoading={isAddingResolution}
                    disabled={!newResolutionType || (newResolutionType === "CODE" && (!newBranchName || !newBranchType))}
                  >
                    Agregar Resolución
                  </Button>
                </div>
              </div>
            </div>
          )}

          {!(user?.role === "ADMIN" || user?.role === "IT") && (
            <div className="flex justify-end">
              <Button
                variant="ghost"
                onClick={() => setShowResolutionModal(false)}
              >
                Cerrar
              </Button>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
