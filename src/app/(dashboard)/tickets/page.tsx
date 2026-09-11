"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button, PageLoader } from "@/components/ui";
import { TicketList } from "@/components/dashboard/TicketList";
import type { ApiResponse, TicketWithRelations } from "@/types";

export default function TicketsPage() {
  const [tickets, setTickets] = useState<TicketWithRelations[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch("/api/tickets?filter=my-tickets")
      .then((res) => res.json())
      .then((data: ApiResponse<TicketWithRelations[]>) => {
        if (data.success && data.data) {
          setTickets(data.data);
        }
      })
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Mis Tickets</h1>
          <p className="text-muted-foreground mt-1">
            Gestiona tus tickets de soporte
          </p>
        </div>
        <Link href="/tickets/new">
          <Button className="gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14" />
              <path d="M12 5v14" />
            </svg>
            Crear Ticket
          </Button>
        </Link>
      </div>

      {isLoading ? (
        <PageLoader />
      ) : (
        <TicketList tickets={tickets} />
      )}
    </div>
  );
}
