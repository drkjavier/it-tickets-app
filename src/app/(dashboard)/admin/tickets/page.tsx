"use client";

import { useEffect, useState } from "react";
import { Button, Badge, Modal, PageLoader, Select } from "@/components/ui";
import type { ApiResponse, TicketStatus, Priority, TicketWithRelations } from "@/types";

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

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

export default function AdminTicketsPage() {
  const [tickets, setTickets] = useState<TicketWithRelations[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<TicketWithRelations | null>(null);
  const [assigneeId, setAssigneeId] = useState("");
  const [isAssigning, setIsAssigning] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/tickets?unassigned=true").then((res) => res.json()),
      fetch("/api/users").then((res) => res.json()),
    ])
      .then(([ticketsData, usersData]) => {
        const ticketsResult = ticketsData as ApiResponse<TicketWithRelations[]>;
        const usersResult = usersData as ApiResponse<User[]>;
        if (ticketsResult.success && ticketsResult.data) {
          setTickets(ticketsResult.data);
        }
        if (usersResult.success && usersResult.data) {
          setUsers(usersResult.data.filter((u) => u.role === "IT" || u.role === "ADMIN"));
        }
      })
      .finally(() => setIsLoading(false));
  }, []);

  const handleAssign = async () => {
    if (!selectedTicket || !assigneeId) return;

    setIsAssigning(true);
    try {
      const response = await fetch(`/api/tickets/${selectedTicket.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assignedToId: assigneeId }),
      });

      const data = await response.json();
      if (data.success) {
        setTickets((prev) => prev.filter((t) => t.id !== selectedTicket.id));
        setSelectedTicket(null);
        setAssigneeId("");
      }
    } finally {
      setIsAssigning(false);
    }
  };

  const itUsers = users.filter((u) => u.role === "IT");

  if (isLoading) {
    return <PageLoader />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Tickets Sin Asignar</h1>
        <p className="text-muted-foreground mt-1">
          {tickets.length} ticket{tickets.length !== 1 ? "s" : ""} pendiente{tickets.length !== 1 ? "s" : ""} de asignar
        </p>
      </div>

      {tickets.length === 0 ? (
        <div className="bg-card rounded-xl border border-border p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-green-500/10 mx-auto mb-4 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-500">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <path d="m9 11 3 3L22 4" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-2">¡Todo asignado!</h3>
          <p className="text-muted-foreground">No hay tickets pendientes de asignar.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {tickets.map((ticket) => (
            <div
              key={ticket.id}
              className="bg-card border border-border rounded-xl p-4 hover:border-primary/50 transition-colors"
            >
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-3">
                  <span className="font-mono font-bold text-sm px-2 py-1 rounded-md bg-primary/10 text-primary">
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
                  >
                    {PRIORITY_LABELS[ticket.priority]}
                  </Badge>
                  <Badge variant="info">{STATUS_LABELS[ticket.status]}</Badge>
                </div>
                <Button size="sm" onClick={() => setSelectedTicket(ticket)}>
                  Asignar
                </Button>
              </div>
              <h3 className="font-semibold text-foreground mb-2">{ticket.title}</h3>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z" />
                  </svg>
                  <span>{ticket.project.name}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="8" r="5" />
                    <path d="M20 21a8 8 0 0 0-16 0" />
                  </svg>
                  <span>{ticket.createdBy.name}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
                    <line x1="16" x2="16" y1="2" y2="6" />
                    <line x1="8" x2="8" y1="2" y2="6" />
                    <line x1="3" x2="21" y1="10" y2="10" />
                  </svg>
                  <span>{new Date(ticket.createdAt).toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" })}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        isOpen={!!selectedTicket}
        onClose={() => {
          setSelectedTicket(null);
          setAssigneeId("");
        }}
        title="Asignar Ticket"
        size="xl"
      >
        {selectedTicket && (
          <div className="space-y-4">
            <div className="p-4 bg-gradient-to-r from-primary/5 to-primary/10 rounded-xl border border-primary/20">
              <div className="flex items-center gap-2 mb-2">
                <span className="font-mono font-bold text-sm px-2 py-0.5 rounded-md bg-primary/20 text-primary">
                  {selectedTicket.code}
                </span>
                <Badge
                  variant={
                    selectedTicket.priority === "CRITICAL"
                      ? "danger"
                      : selectedTicket.priority === "HIGH"
                      ? "warning"
                      : "default"
                  }
                >
                  {PRIORITY_LABELS[selectedTicket.priority]}
                </Badge>
                <Badge variant="info">{STATUS_LABELS[selectedTicket.status]}</Badge>
              </div>
              <h3 className="font-semibold text-foreground text-lg mb-2">{selectedTicket.title}</h3>
              <p className="text-sm text-muted-foreground mb-3">{selectedTicket.project.name}</p>
              <div
                className="prose prose-sm max-w-none p-3 bg-card/50 rounded-lg text-sm"
                dangerouslySetInnerHTML={{ __html: selectedTicket.description }}
              />
            </div>

            <Select
              label="Asignar a"
              value={assigneeId}
              onChange={(e) => setAssigneeId(e.target.value)}
              options={[
                { value: "", label: "Selecciona un usuario..." },
                ...itUsers.map((u) => ({
                  value: u.id,
                  label: `${u.name} (${u.email})`,
                })),
              ]}
            />

            <div className="flex gap-3 justify-end pt-2">
              <Button variant="ghost" onClick={() => { setSelectedTicket(null); setAssigneeId(""); }}>
                Cancelar
              </Button>
              <Button onClick={handleAssign} isLoading={isAssigning} disabled={!assigneeId}>
                Asignar
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
