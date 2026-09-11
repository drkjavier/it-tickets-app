"use client";

import { useEffect, useState, useCallback } from "react";
import { Button, Input, PasswordInput, Select, Modal, PageLoader } from "@/components/ui";
import { useToast } from "@/components/ui/Toast";
import type { ApiResponse } from "@/types";

interface User {
  id: string;
  email: string;
  name: string;
  role: "ADMIN" | "IT" | "USER";
  createdAt: string;
  totalTickets: number;
}

const ROLE_LABELS: Record<string, string> = {
  ADMIN: "Administrador",
  IT: "Técnico IT",
  USER: "Usuario",
};

const ROLE_COLORS: Record<string, string> = {
  ADMIN: "bg-violet-500/10 text-violet-600 border-violet-500/20",
  IT: "bg-cyan-500/10 text-cyan-600 border-cyan-500/20",
  USER: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
};

export default function UsersPage() {
  const { addToast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);
  const [showEditNameModal, setShowEditNameModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [editName, setEditName] = useState("");

  const [formData, setFormData] = useState({
    email: "",
    name: "",
    role: "USER" as "ADMIN" | "IT" | "USER",
    password: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/users");
      const data: ApiResponse<User[]> = await response.json();
      if (data.success && data.data) {
        setUsers(data.data);
      }
    } catch {
      addToast({
        type: "error",
        title: "Error",
        message: "No se pudieron cargar los usuarios",
      });
    } finally {
      setIsLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const result: ApiResponse<User> = await response.json();

      if (result.success) {
        addToast({
          type: "success",
          title: "Usuario creado",
          message: `El usuario ${formData.name} fue creado exitosamente`,
        });
        setShowCreateModal(false);
        setFormData({ email: "", name: "", role: "USER", password: "" });
        fetchUsers();
      } else {
        addToast({
          type: "error",
          title: "Error",
          message: result.error || "No se pudo crear el usuario",
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

  const handleDeleteUser = async (user: User) => {
    if (!confirm(`¿Estás seguro de eliminar al usuario ${user.name}?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/users?id=${user.id}`, {
        method: "DELETE",
      });

      const result: ApiResponse = await response.json();

      if (result.success) {
        addToast({
          type: "success",
          title: "Usuario eliminado",
          message: `${user.name} fue eliminado correctamente`,
        });
        fetchUsers();
      } else {
        addToast({
          type: "error",
          title: "Error",
          message: result.error || "No se pudo eliminar el usuario",
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

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: selectedUser.id,
          action: "resetPassword",
          newPassword,
        }),
      });

      const result: ApiResponse = await response.json();

      if (result.success) {
        addToast({
          type: "success",
          title: "Contraseña reiniciada",
          message: `La contraseña de ${selectedUser.name} fue actualizada`,
        });
        setShowResetPasswordModal(false);
        setSelectedUser(null);
        setNewPassword("");
      } else {
        addToast({
          type: "error",
          title: "Error",
          message: result.error || "No se pudo reiniciar la contraseña",
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

  const handleEditName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: selectedUser.id,
          action: "updateName",
          newName: editName,
        }),
      });

      const result: ApiResponse<User> = await response.json();

      if (result.success) {
        addToast({
          type: "success",
          title: "Nombre actualizado",
          message: `El nombre fue cambiado exitosamente`,
        });
        setShowEditNameModal(false);
        setSelectedUser(null);
        setEditName("");
        fetchUsers();
      } else {
        addToast({
          type: "error",
          title: "Error",
          message: result.error || "No se pudo actualizar el nombre",
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

  const openEditNameModal = (user: User) => {
    setSelectedUser(user);
    setEditName(user.name);
    setShowEditNameModal(true);
  };

  const openResetPasswordModal = (user: User) => {
    setSelectedUser(user);
    setNewPassword("");
    setShowResetPasswordModal(true);
  };

  if (isLoading) {
    return <PageLoader />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Gestión de Usuarios</h1>
          <p className="text-muted-foreground mt-1">
            Administra los usuarios del sistema
          </p>
        </div>
        <Button onClick={() => setShowCreateModal(true)} className="gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14" />
            <path d="M12 5v14" />
          </svg>
          Nuevo Usuario
        </Button>
      </div>

      <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-secondary/50">
                <th className="text-left px-6 py-4 text-sm font-medium text-muted-foreground">Usuario</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-muted-foreground">Rol</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-muted-foreground">Tickets</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-muted-foreground">Fecha de creación</th>
                <th className="text-right px-6 py-4 text-sm font-medium text-muted-foreground">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-b border-border hover:bg-secondary/30 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
                        <span className="text-sm font-semibold text-primary-foreground">
                          {user.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{user.name}</p>
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium border ${ROLE_COLORS[user.role]}`}>
                      {ROLE_LABELS[user.role]}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium ${
                      user.totalTickets > 0
                        ? "bg-blue-500/10 text-blue-600 border border-blue-500/20"
                        : "bg-secondary text-secondary-foreground"
                    }`}>
                      {user.totalTickets} ticket{user.totalTickets !== 1 ? "s" : ""}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-muted-foreground">
                    {new Date(user.createdAt).toLocaleDateString("es-ES", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditNameModal(user)}
                        title="Editar nombre"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                          <path d="m15 5 4 4" />
                        </svg>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openResetPasswordModal(user)}
                        title="Reiniciar contraseña"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 2v6h-6" />
                          <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
                          <path d="M3 22v-6h6" />
                          <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
                        </svg>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteUser(user)}
                        disabled={user.totalTickets > 0}
                        title={user.totalTickets > 0 ? "No se puede eliminar: tiene tickets activos" : "Eliminar usuario"}
                        className={user.totalTickets > 0 ? "opacity-50 cursor-not-allowed" : ""}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-destructive">
                          <path d="M3 6h18" />
                          <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                          <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                          <line x1="10" x2="10" y1="11" y2="17" />
                          <line x1="14" x2="14" y1="11" y2="17" />
                        </svg>
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {users.length === 0 && (
          <div className="text-center py-12">
            <div className="w-16 h-16 rounded-full bg-muted mx-auto mb-4 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <line x1="19" x2="19" y1="8" y2="14" />
                <line x1="22" x2="16" y1="11" y2="11" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">No hay usuarios</h3>
            <p className="text-muted-foreground mb-4">Crea el primer usuario del sistema</p>
            <Button onClick={() => setShowCreateModal(true)}>Crear Usuario</Button>
          </div>
        )}
      </div>

      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Crear Nuevo Usuario"
        size="md"
      >
        <form onSubmit={handleCreateUser} className="space-y-4">
          <Input
            label="Nombre completo"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Juan Pérez"
            required
          />
          <Input
            label="Correo electrónico"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            placeholder="juan@empresa.com"
            required
          />
          <Select
            label="Rol"
            value={formData.role}
            onChange={(e) => setFormData({ ...formData, role: e.target.value as "ADMIN" | "IT" | "USER" })}
            options={[
              { value: "USER", label: "Usuario" },
              { value: "IT", label: "Técnico IT" },
              { value: "ADMIN", label: "Administrador" },
            ]}
          />
          <PasswordInput
            label="Contraseña inicial"
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            placeholder="Mínimo 8 caracteres"
            required
          />
          <p className="text-xs text-muted-foreground">
            El usuario deberá cambiar esta contraseña al primer inicio de sesión
          </p>
          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <Button type="button" variant="ghost" onClick={() => setShowCreateModal(false)}>
              Cancelar
            </Button>
            <Button type="submit" isLoading={isSubmitting}>
              Crear Usuario
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={showResetPasswordModal}
        onClose={() => {
          setShowResetPasswordModal(false);
          setSelectedUser(null);
          setNewPassword("");
        }}
        title={`Reiniciar Contraseña de ${selectedUser?.name || ""}`}
        size="sm"
      >
        <form onSubmit={handleResetPassword} className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Ingresa la nueva contraseña para <strong>{selectedUser?.name}</strong>
          </p>
          <PasswordInput
            label="Nueva contraseña"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Mínimo 8 caracteres"
            required
          />
          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setShowResetPasswordModal(false);
                setSelectedUser(null);
                setNewPassword("");
              }}
            >
              Cancelar
            </Button>
            <Button type="submit" isLoading={isSubmitting}>
              Reiniciar
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={showEditNameModal}
        onClose={() => {
          setShowEditNameModal(false);
          setSelectedUser(null);
          setEditName("");
        }}
        title={`Editar Nombre de ${selectedUser?.name || ""}`}
        size="sm"
      >
        <form onSubmit={handleEditName} className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Ingresa el nuevo nombre para <strong>{selectedUser?.name}</strong>
          </p>
          <Input
            label="Nombre completo"
            type="text"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            placeholder="Nuevo nombre"
            required
          />
          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setShowEditNameModal(false);
                setSelectedUser(null);
                setEditName("");
              }}
            >
              Cancelar
            </Button>
            <Button type="submit" isLoading={isSubmitting}>
              Guardar
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
