"use client";

import { useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import type { TicketWithRelations, TicketStatus, Priority } from "@/types";

const STATUS_VARIANTS: Record<TicketStatus, "default" | "success" | "warning" | "danger" | "info"> = {
  CREATED: "info",
  EN_COURSE: "warning",
  IN_REVIEW: "info",
  REJECTED: "danger",
  TERMINATED: "success",
};

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

const PRIORITY_VARIANTS: Record<Priority, "default" | "success" | "warning" | "danger" | "info"> = {
  LOW: "default",
  MEDIUM: "info",
  HIGH: "warning",
  CRITICAL: "danger",
};

interface TicketListProps {
  tickets: TicketWithRelations[];
  showAssignment?: boolean;
}

export function TicketList({
  tickets,
  showAssignment = false,
}: TicketListProps) {
  const [filter, setFilter] = useState<TicketStatus | "ALL">("ALL");

  const filteredTickets =
    filter === "ALL"
      ? tickets
      : tickets.filter((t) => t.status === filter);

  const getBadgeCount = (status: TicketStatus) =>
    tickets.filter((t) => t.status === status).length;

  const statusFilters: (TicketStatus | "ALL")[] = [
    "ALL",
    "CREATED",
    "EN_COURSE",
    "IN_REVIEW",
    "REJECTED",
    "TERMINATED",
  ];

  return (
    <div className="space-y-6">
      <div className="flex gap-2 flex-wrap">
        {statusFilters.map((status) => {
          const count = status === "ALL" ? tickets.length : getBadgeCount(status as TicketStatus);
          const isActive = filter === status;
          return (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                isActive
                  ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25"
                  : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
              }`}
            >
              {status === "ALL" ? "Todos" : STATUS_LABELS[status as TicketStatus]} ({count})
            </button>
          );
        })}
      </div>

      <div className="space-y-3">
        {filteredTickets.map((ticket) => (
          <Link
            key={ticket.id}
            href={`/tickets/${ticket.id}`}
            className="group block bg-card border border-border rounded-xl p-3 sm:p-4 hover:border-primary/50 hover:shadow-lg transition-all duration-200"
          >
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 mb-2 sm:mb-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono font-bold text-xs sm:text-sm px-2 py-1 rounded-md bg-primary/10 text-primary">
                  {ticket.code}
                </span>
                <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors text-sm sm:text-base">
                  {ticket.title}
                </h3>
              </div>
              <div className="flex gap-2 flex-wrap">
                <Badge variant={PRIORITY_VARIANTS[ticket.priority]}>
                  {PRIORITY_LABELS[ticket.priority]}
                </Badge>
                <Badge variant={STATUS_VARIANTS[ticket.status]}>
                  {STATUS_LABELS[ticket.status]}
                </Badge>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs sm:text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z" />
                </svg>
                <span>{ticket.project.name}</span>
              </div>
              {showAssignment && ticket.assignedTo && (
                <div className="flex items-center gap-1">
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                  </svg>
                  <span>{ticket.assignedTo.name}</span>
                </div>
              )}
              <div className="flex items-center gap-1">
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
                  <line x1="16" x2="16" y1="2" y2="6" />
                  <line x1="8" x2="8" y1="2" y2="6" />
                  <line x1="3" x2="21" y1="10" y2="10" />
                </svg>
                <span>{new Date(ticket.createdAt).toLocaleDateString("es-ES", { day: "numeric", month: "short" })}</span>
              </div>
              {ticket._count && ticket._count.comments > 0 && (
                <div className="flex items-center gap-1">
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  </svg>
                  <span>{ticket._count.comments}</span>
                </div>
              )}
            </div>
          </Link>
        ))}

        {filteredTickets.length === 0 && (
          <div className="bg-card rounded-xl border border-border p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-muted mx-auto mb-4 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground">
                <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">No hay tickets</h3>
            <p className="text-muted-foreground">No se encontraron tickets con los filtros seleccionados.</p>
          </div>
        )}
      </div>
    </div>
  );
}
