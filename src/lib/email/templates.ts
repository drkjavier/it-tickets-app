const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export function getTicketUrl(ticketId: string): string {
  return `${APP_URL}/tickets/${ticketId}`;
}

export function ticketButtonHtml(ticketUrl: string): string {
  return `
    <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
      <p style="margin: 0 0 15px 0; color: #333;">Haz clic en el botón para ver el detalle del ticket:</p>
      <a href="${ticketUrl}" style="display: inline-block; background-color: #0070f3; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Ver Ticket</a>
    </div>
    <p style="color: #999; font-size: 12px; margin-top: 20px;">Si el botón no funciona, copia y pega este enlace en tu navegador:<br><a href="${ticketUrl}" style="color: #0070f3;">${ticketUrl}</a></p>
  `;
}

export function getThreadHeaders(ticketId: string): Record<string, string> {
  const threadRef = `<ticket-${ticketId}@it-tickets>`;
  const messageId = `<ticket-${ticketId}-${Date.now()}@it-tickets>`;
  return {
    "Message-ID": messageId,
    "In-Reply-To": threadRef,
    "References": threadRef,
  };
}

export function ticketCreatedEmailHtml(
  ticketCode: string,
  ticketId: string,
  ticketTitle: string
): string {
  const ticketUrl = getTicketUrl(ticketId);
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h1 style="color: #333; border-bottom: 2px solid #0070f3; padding-bottom: 10px;">Ticket ${ticketCode} Creado</h1>
      <p style="color: #666; font-size: 16px;"><strong>Título:</strong> ${ticketTitle}</p>
      <p style="color: #666; font-size: 16px;">Se ha creado un nuevo ticket de soporte.</p>
      ${ticketButtonHtml(ticketUrl)}
    </div>
  `;
}

export function ticketAssignedEmailHtml(
  ticketCode: string,
  ticketId: string,
  ticketTitle: string,
  assigneeName: string
): string {
  const ticketUrl = getTicketUrl(ticketId);
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h1 style="color: #333; border-bottom: 2px solid #0070f3; padding-bottom: 10px;">Ticket ${ticketCode} Asignado</h1>
      <p style="color: #666; font-size: 16px;"><strong>Título:</strong> ${ticketTitle}</p>
      <p style="color: #666; font-size: 16px;">El ticket ha sido asignado a: <strong>${assigneeName}</strong></p>
      ${ticketButtonHtml(ticketUrl)}
    </div>
  `;
}

export function notificationEmailHtml(
  ticketCode: string,
  ticketId: string,
  ticketTitle: string,
  fromStatus: string,
  toStatus: string
): string {
  const ticketUrl = getTicketUrl(ticketId);

  const statusLabels: Record<string, string> = {
    CREATED: "Creado",
    EN_COURSE: "En curso",
    IN_REVIEW: "En revisión",
    REJECTED: "Rechazado",
    TERMINATED: "Terminado",
  };

  const fromLabel = statusLabels[fromStatus] || fromStatus;
  const toLabel = statusLabels[toStatus] || toStatus;

  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h1 style="color: #333; border-bottom: 2px solid #0070f3; padding-bottom: 10px;">Ticket ${ticketCode}</h1>
      <p style="color: #666; font-size: 16px;"><strong>Título:</strong> ${ticketTitle}</p>
      <p style="color: #666; font-size: 16px;">El ticket ha cambiado de estado:</p>
      <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <p style="margin: 0 0 10px 0; color: #333;"><strong>Estado anterior:</strong> ${fromLabel}</p>
        <p style="margin: 0 0 15px 0; color: #333;"><strong>Estado actual:</strong> ${toLabel}</p>
      </div>
      ${ticketButtonHtml(ticketUrl)}
    </div>
  `;
}
