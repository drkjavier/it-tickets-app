"use client";

import { useState } from "react";
import { Button } from "./Button";
import { Input } from "./Input";
import type { Priority } from "@/types";

interface CreateTicketFormProps {
  projects: { id: string; name: string; abbreviation: string }[];
  users: { id: string; name: string; email: string }[];
  onSubmit: (data: CreateTicketData) => Promise<void>;
  onCancel: () => void;
}

export interface CreateTicketData {
  title: string;
  description: string;
  priority: Priority;
  projectId: string;
  taggedUserIds: string[];
}

export function CreateTicketForm({
  projects,
  users,
  onSubmit,
  onCancel,
}: CreateTicketFormProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<Priority>("MEDIUM");
  const [projectId, setProjectId] = useState(projects[0]?.id || "");
  const [taggedUserIds, setTaggedUserIds] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onSubmit({ title, description, priority, projectId, taggedUserIds });
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleUser = (userId: string) => {
    setTaggedUserIds((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        label="Título"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        maxLength={125}
        required
        placeholder="Describe el problema brevemente"
      />
      <p className="text-sm text-gray-500">{title.length}/125 caracteres</p>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Descripción
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
          rows={6}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Describe detalladamente el problema o solicitud"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Prioridad
          </label>
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value as Priority)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="LOW">Baja</option>
            <option value="MEDIUM">Media</option>
            <option value="HIGH">Alta</option>
            <option value="CRITICAL">Crítica</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Proyecto
          </label>
          <select
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name} ({project.abbreviation})
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Usuarios a notificar
        </label>
        <div className="flex flex-wrap gap-2">
          {users.map((user) => (
            <button
              key={user.id}
              type="button"
              onClick={() => toggleUser(user.id)}
              className={`px-3 py-1 rounded-full text-sm ${
                taggedUserIds.includes(user.id)
                  ? "bg-blue-100 text-blue-800 border border-blue-300"
                  : "bg-gray-100 text-gray-700 border border-gray-300"
              }`}
            >
              {user.name}
            </button>
          ))}
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Creando..." : "Crear Ticket"}
        </Button>
      </div>
    </form>
  );
}
