"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/lib/store";
import {
  TicketsByStatusChart,
  AssignedTicketsChart,
  RejectedByUserChart,
  RatingChart,
} from "@/components/dashboard/Charts";
import { PageLoader } from "@/components/ui/Skeleton";
import type { ApiResponse } from "@/types";

interface DashboardStats {
  totalMyTickets: number;
  ticketsByStatus: Record<string, number>;
  assignedTickets?: {
    total: number;
    byStatus: Record<string, number>;
  };
  adminStats?: {
    rejectedByUser: { name: string; count: number }[];
    avgRating: number;
    totalRatings: number;
  };
}

export default function DashboardPage() {
  const { user } = useAuthStore();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch("/api/dashboard")
      .then((res) => res.json())
      .then((data: ApiResponse<DashboardStats>) => {
        if (data.success && data.data) {
          setStats(data.data);
        }
      })
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading) {
    return <PageLoader />;
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Bienvenido de vuelta, {user?.name}
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>En línea</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card rounded-xl border border-border p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-foreground">Tickets por Estado</h2>
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
                <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z" />
              </svg>
            </div>
          </div>
          <TicketsByStatusChart
            data={stats?.ticketsByStatus as Record<"CREATED" | "EN_COURSE" | "IN_REVIEW" | "REJECTED" | "TERMINATED", number>}
          />
        </div>

        {user?.role !== "USER" && stats?.assignedTickets && (
          <div className="bg-card rounded-xl border border-border p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-foreground">Tickets Asignados</h2>
              <div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-cyan-500">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
              </div>
            </div>
            <AssignedTicketsChart
              data={stats.assignedTickets.byStatus as Record<"CREATED" | "EN_COURSE" | "IN_REVIEW" | "REJECTED" | "TERMINATED", number>}
            />
          </div>
        )}
      </div>

      {user?.role === "ADMIN" && stats?.adminStats && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-card rounded-xl border border-border p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-foreground">Tickets Rechazados</h2>
              <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-500">
                  <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
                  <path d="M12 9v4" />
                  <path d="M12 17h.01" />
                </svg>
              </div>
            </div>
            <RejectedByUserChart data={stats.adminStats.rejectedByUser} />
          </div>

          <div className="bg-card rounded-xl border border-border p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-foreground">Calificaciones</h2>
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-500">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
              </div>
            </div>
            <RatingChart
              avgRating={stats.adminStats.avgRating}
              totalRatings={stats.adminStats.totalRatings}
            />
          </div>
        </div>
      )}

      {!stats && (
        <div className="bg-card rounded-xl border border-border p-8 shadow-sm text-center">
          <div className="w-16 h-16 rounded-full bg-muted mx-auto mb-4 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground">
              <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-2">Sin datos disponibles</h3>
          <p className="text-muted-foreground">¡Crea tu primer ticket para comenzar!</p>
        </div>
      )}
    </div>
  );
}
