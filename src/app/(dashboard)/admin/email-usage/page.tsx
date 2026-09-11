"use client";

import { useEffect, useState } from "react";
import { PageLoader } from "@/components/ui";

interface EmailUsageStats {
  count: number;
  limit: number;
  provider: "brevo" | "resend";
  shouldAlert: boolean;
}

export default function EmailUsagePage() {
  const [stats, setStats] = useState<EmailUsageStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/email-usage")
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
        } else {
          setStats(data);
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading) {
    return <PageLoader />;
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Uso de Email</h1>
          <p className="text-muted-foreground mt-1">
            Estadísticas de envío de emails diarios
          </p>
        </div>
        <div className="bg-card rounded-xl border border-border p-6">
          <p className="text-destructive">Error: {error}</p>
        </div>
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  const percentage = (stats.count / stats.limit) * 100;
  const isWarning = percentage >= 90;
  const isCritical = stats.count >= stats.limit;

  const providerLabels = {
    brevo: "Brevo",
    resend: "Resend",
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Uso de Email</h1>
        <p className="text-muted-foreground mt-1">
          Estadísticas de envío de emails diarios
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card rounded-xl border border-border p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-primary"
              >
                <rect width="20" height="16" x="2" y="4" rx="2" />
                <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Emails enviados hoy</p>
              <p className="text-2xl font-bold text-foreground">
                {stats.count} / {stats.limit}
              </p>
            </div>
          </div>
          <div className="mt-4">
            <div className="h-3 bg-secondary rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  isCritical
                    ? "bg-destructive"
                    : isWarning
                    ? "bg-amber-500"
                    : "bg-primary"
                }`}
                style={{ width: `${Math.min(percentage, 100)}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {percentage.toFixed(1)}% utilizado
            </p>
          </div>
        </div>

        <div className="bg-card rounded-xl border border-border p-6">
          <p className="text-sm text-muted-foreground mb-2">Provider activo</p>
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                stats.provider === "brevo"
                  ? "bg-blue-500/10 text-blue-600 border border-blue-500/20"
                  : "bg-orange-500/10 text-orange-600 border border-orange-500/20"
              }`}
            >
              {providerLabels[stats.provider]}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-4">
            Cambiar en <code className="bg-secondary px-1 py-0.5 rounded">.env</code> con{" "}
            <code className="bg-secondary px-1 py-0.5 rounded">EMAIL_PROVIDER</code>
          </p>
        </div>

        <div className="bg-card rounded-xl border border-border p-6">
          <p className="text-sm text-muted-foreground mb-2">Estado</p>
          {isCritical ? (
            <div className="space-y-2">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-destructive/10 text-destructive border border-destructive/20">
                Límite alcanzado
              </span>
              <p className="text-xs text-destructive">
                Cambiar provider inmediatamente en .env
              </p>
            </div>
          ) : isWarning ? (
            <div className="space-y-2">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-amber-500/10 text-amber-600 border border-amber-500/20">
                Cerca del límite
              </span>
              <p className="text-xs text-muted-foreground">
                Considerar cambiar provider si continúa el alto volumen
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                Normal
              </span>
              <p className="text-xs text-muted-foreground">
                Uso dentro de los parámetros normales
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">
          Límites por Provider
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-secondary/30 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium text-foreground">Brevo</span>
              <span className="text-sm text-muted-foreground">300 emails/día</span>
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Warning</span>
                <span>280 (93%)</span>
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Límite</span>
                <span>300</span>
              </div>
            </div>
          </div>
          <div className="p-4 bg-secondary/30 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium text-foreground">Resend</span>
              <span className="text-sm text-muted-foreground">100 emails/día</span>
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Warning</span>
                <span>85 (85%)</span>
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Límite</span>
                <span>100</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">
          Cómo cambiar de provider
        </h2>
        <div className="space-y-3 text-sm text-muted-foreground">
          <div className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-medium">
              1
            </span>
            <p>Editar el archivo <code className="bg-secondary px-1 py-0.5 rounded">.env</code></p>
          </div>
          <div className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-medium">
              2
            </span>
            <p>Cambiar <code className="bg-secondary px-1 py-0.5 rounded">EMAIL_PROVIDER=brevo</code> a{" "}
              <code className="bg-secondary px-1 py-0.5 rounded">EMAIL_PROVIDER=resend</code></p>
          </div>
          <div className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-medium">
              3
            </span>
            <p>Reiniciar la aplicación</p>
          </div>
        </div>
      </div>
    </div>
  );
}
