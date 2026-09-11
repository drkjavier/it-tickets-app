"use client";

import { useEffect, useState } from "react";
import { TicketList } from "@/components/dashboard/TicketList";
import type { ApiResponse, TicketWithRelations } from "@/types";

export default function AssignmentsPage() {
  const [tickets, setTickets] = useState<TicketWithRelations[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch("/api/tickets?filter=my-assignments")
      .then((res) => res.json())
      .then((data: ApiResponse<TicketWithRelations[]>) => {
        if (data.success && data.data) {
          setTickets(data.data);
        }
      })
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Mis Asignaciones</h1>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <p className="text-gray-500">Cargando...</p>
        </div>
      ) : (
        <TicketList tickets={tickets} showAssignment />
      )}
    </div>
  );
}
