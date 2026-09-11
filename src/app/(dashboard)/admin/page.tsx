"use client";

import { useEffect, useState } from "react";
import { Badge, PageLoader } from "@/components/ui";
import type { ApiResponse, TicketStatus, TicketWithRelations } from "@/types";

const STATUS_LABELS: Record<TicketStatus, string> = {
  CREATED: "Creado",
  EN_COURSE: "En curso",
  IN_REVIEW: "En revisión",
  REJECTED: "Rechazado",
  TERMINATED: "Terminado",
};

const STATUS_COLORS: Record<TicketStatus, string> = {
  CREATED: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  EN_COURSE: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  IN_REVIEW: "bg-purple-500/10 text-purple-600 border-purple-500/20",
  REJECTED: "bg-red-500/10 text-red-600 border-red-500/20",
  TERMINATED: "bg-green-500/10 text-green-600 border-green-500/20",
};

interface ITUser {
  id: string;
  name: string;
  email: string;
  role: string;
  tickets: TicketWithRelations[];
}

export default function AdminDashboardPage() {
  const [itUsers, setItUsers] = useState<ITUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | TicketStatus>("all");

  useEffect(() => {
    fetch("/api/users")
      .then((res) => res.json())
      .then((data: ApiResponse<ITUser[]>) => {
        if (data.success && data.data) {
          const itUsersWithTickets = data.data
            .filter((u) => u.role === "IT" || u.role === "ADMIN")
            .map((u) => ({
              ...u,
              tickets: [] as TicketWithRelations[],
            }));
          setItUsers(itUsersWithTickets);
        }
      });

    fetch("/api/tickets?filter=all")
      .then((res) => res.json())
      .then((data: ApiResponse<TicketWithRelations[]>) => {
        if (data.success && data.data) {
          setItUsers((prev) =>
            prev.map((user) => ({
              ...user,
              tickets: data.data!.filter((t) => t.assignedToId === user.id),
            }))
          );
        }
      })
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading) {
    return <PageLoader />;
  }

  const getTicketsByStatus = (tickets: TicketWithRelations[], status: TicketStatus) =>
    tickets.filter((t) => t.status === status).length;

  const filteredUsers = itUsers.map((user) => ({
    ...user,
    tickets:
      filter === "all"
        ? user.tickets
        : user.tickets.filter((t) => t.status === filter),
  }));

  const totalTickets = itUsers.reduce((sum, u) => sum + u.tickets.length, 0);
  const totalActive = itUsers.reduce(
    (sum, u) =>
      sum +
      u.tickets.filter(
        (t) => t.status !== "TERMINATED" && t.status !== "REJECTED"
      ).length,
    0
  );
  const totalInProgress = itUsers.reduce(
    (sum, u) => sum + getTicketsByStatus(u.tickets, "EN_COURSE"),
    0
  );
  const totalInReview = itUsers.reduce(
    (sum, u) => sum + getTicketsByStatus(u.tickets, "IN_REVIEW"),
    0
  );
  const totalCompleted = itUsers.reduce(
    (sum, u) => sum + getTicketsByStatus(u.tickets, "TERMINATED"),
    0
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard IT</h1>
        <p className="text-muted-foreground mt-1">
          Estadísticas y rendimiento del equipo IT
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-4 text-white shadow-lg">
          <p className="text-sm opacity-80">Total Asignados</p>
          <p className="text-3xl font-bold mt-1">{totalTickets}</p>
        </div>
        <div className="bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl p-4 text-white shadow-lg">
          <p className="text-sm opacity-80">En Progreso</p>
          <p className="text-3xl font-bold mt-1">{totalInProgress}</p>
        </div>
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-4 text-white shadow-lg">
          <p className="text-sm opacity-80">En Revisión</p>
          <p className="text-3xl font-bold mt-1">{totalInReview}</p>
        </div>
        <div className="bg-gradient-to-br from-emerald-500 to-green-600 rounded-xl p-4 text-white shadow-lg">
          <p className="text-sm opacity-80">Completados</p>
          <p className="text-3xl font-bold mt-1">{totalCompleted}</p>
        </div>
        <div className="bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl p-4 text-white shadow-lg">
          <p className="text-sm opacity-80">Activos</p>
          <p className="text-3xl font-bold mt-1">{totalActive}</p>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setFilter("all")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            filter === "all"
              ? "bg-primary text-primary-foreground shadow-lg"
              : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
          }`}
        >
          Todos
        </button>
        {Object.entries(STATUS_LABELS).map(([status, label]) => (
          <button
            key={status}
            onClick={() => setFilter(status as TicketStatus)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              filter === status
                ? "bg-primary text-primary-foreground shadow-lg"
                : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredUsers.map((user) => (
          <div
            key={user.id}
            className="bg-card rounded-xl border border-border shadow-sm overflow-hidden"
          >
            <div className="p-4 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center text-primary-foreground font-bold text-lg">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-foreground truncate">
                    {user.name}
                  </p>
                  <p className="text-sm text-muted-foreground truncate">
                    {user.email}
                  </p>
                </div>
                <Badge
                  variant={
                    user.role === "ADMIN" ? "info" : "default"
                  }
                >
                  {user.role === "ADMIN" ? "Admin" : "IT"}
                </Badge>
              </div>
            </div>

            <div className="p-4 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">
                  Tickets {filter === "all" ? "totales" : filter.toLowerCase()}
                </span>
                <span className="text-2xl font-bold text-foreground">
                  {user.tickets.length}
                </span>
              </div>

              {filter === "all" && (
                <div className="space-y-2">
                  {Object.entries(STATUS_LABELS).map(([status, label]) => {
                    const count = getTicketsByStatus(user.tickets, status as TicketStatus);
                    if (count === 0) return null;
                    return (
                      <div key={status} className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${STATUS_COLORS[status as TicketStatus].split(" ")[0].replace("bg-", "bg-").replace("/10", "")}`}
                            style={{
                              width: `${(count / Math.max(user.tickets.length, 1)) * 100}%`,
                            }}
                          />
                        </div>
                        <span className="text-xs font-medium text-muted-foreground w-6 text-right">
                          {count}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}

              {filter !== "all" && user.tickets.length > 0 && (
                <div className="space-y-2">
                  {user.tickets.slice(0, 5).map((ticket) => (
                    <div
                      key={ticket.id}
                      className="flex items-center gap-2 p-2 bg-secondary/30 rounded-lg"
                    >
                      <span className="font-mono text-xs text-primary">
                        {ticket.code}
                      </span>
                      <span className="flex-1 text-sm text-foreground truncate">
                        {ticket.title}
                      </span>
                      <Badge
                        variant={
                          ticket.priority === "CRITICAL"
                            ? "danger"
                            : ticket.priority === "HIGH"
                            ? "warning"
                            : "default"
                        }
                        className="text-xs"
                      >
                        {ticket.priority === "CRITICAL"
                          ? "🔴"
                          : ticket.priority === "HIGH"
                          ? "🟠"
                          : "🟡"}
                      </Badge>
                    </div>
                  ))}
                  {user.tickets.length > 5 && (
                    <p className="text-xs text-muted-foreground text-center">
                      +{user.tickets.length - 5} más
                    </p>
                  )}
                </div>
              )}

              {user.tickets.length === 0 && (
                <div className="text-center py-4">
                  <p className="text-sm text-muted-foreground">
                    Sin tickets {filter !== "all" ? STATUS_LABELS[filter].toLowerCase() : ""}
                  </p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {filteredUsers.length === 0 && (
        <div className="bg-card rounded-xl border border-border p-8 text-center">
          <p className="text-muted-foreground">No hay usuarios IT registrados</p>
        </div>
      )}
    </div>
  );
}
