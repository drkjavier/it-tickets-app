"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import TextAlign from "@tiptap/extension-text-align";
import { useCallback, useEffect } from "react";

interface RichTextEditorProps {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
  editable?: boolean;
}

export function RichTextEditor({
  content,
  onChange,
  placeholder = "Escribe aquí...",
  editable = true,
}: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Image.configure({
        HTMLAttributes: {
          class: "max-w-full h-auto",
        },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: "text-blue-500 underline",
        },
      }),
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
      Placeholder.configure({
        placeholder,
      }),
    ],
    content,
    editable,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      handlePaste: (view, event) => {
        const items = event.clipboardData?.items;
        if (!items) return false;

        for (const item of items) {
          if (item.type.startsWith("image/")) {
            event.preventDefault();
            const file = item.getAsFile();
            if (file) {
              uploadImage(file);
            }
            return true;
          }
        }
        return false;
      },
    },
  });

  const handleImageUpload = useCallback(async () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";

    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;

      const formData = new FormData();
      formData.append("file", file);

      try {
        const response = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });
        const data = await response.json();

        if (data.success && data.data.url) {
          editor?.chain().focus().setImage({ src: data.data.url }).run();
        }
      } catch (error) {
      }
    };

    input.click();
  }, [editor]);

  const uploadImage = useCallback(async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      const data = await response.json();

      if (data.success && data.data.url) {
        editor?.chain().focus().setImage({ src: data.data.url }).run();
      }
    } catch (error) {
    }
  }, [editor]);

  if (!editor) {
    return null;
  }

  return (
    <div className="border border-gray-300 rounded-lg overflow-hidden">
      {editable && (
        <div className="bg-gray-50 border-b border-gray-300 p-2 flex gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={`p-1.5 rounded ${
              editor.isActive("bold") ? "bg-gray-300" : "hover:bg-gray-200"
            }`}
            title="Negrita"
          >
            <strong>B</strong>
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={`p-1.5 rounded ${
              editor.isActive("italic") ? "bg-gray-300" : "hover:bg-gray-200"
            }`}
            title="Cursiva"
          >
            <em>I</em>
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleStrike().run()}
            className={`p-1.5 rounded ${
              editor.isActive("strike") ? "bg-gray-300" : "hover:bg-gray-200"
            }`}
            title="Tachado"
          >
            <span className="line-through">S</span>
          </button>
          <div className="w-px bg-gray-300 mx-1" />
          <button
            type="button"
            onClick={() => editor.chain().focus().setTextAlign("left").run()}
            className={`p-1.5 rounded ${
              editor.isActive({ textAlign: "left" })
                ? "bg-gray-300"
                : "hover:bg-gray-200"
            }`}
            title="Alinear izquierda"
          >
            ≡
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().setTextAlign("center").run()}
            className={`p-1.5 rounded ${
              editor.isActive({ textAlign: "center" })
                ? "bg-gray-300"
                : "hover:bg-gray-200"
            }`}
            title="Alinear centro"
          >
            ≡
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().setTextAlign("right").run()}
            className={`p-1.5 rounded ${
              editor.isActive({ textAlign: "right" })
                ? "bg-gray-300"
                : "hover:bg-gray-200"
            }`}
            title="Alinear derecha"
          >
            ≡
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().setTextAlign("justify").run()}
            className={`p-1.5 rounded ${
              editor.isActive({ textAlign: "justify" })
                ? "bg-gray-300"
                : "hover:bg-gray-200"
            }`}
            title="Justificar"
          >
            ≡
          </button>
          <div className="w-px bg-gray-300 mx-1" />
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            className={`p-1.5 rounded ${
              editor.isActive("bulletList") ? "bg-gray-300" : "hover:bg-gray-200"
            }`}
            title="Lista"
          >
            •
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            className={`p-1.5 rounded ${
              editor.isActive("orderedList") ? "bg-gray-300" : "hover:bg-gray-200"
            }`}
            title="Lista numerada"
          >
            1.
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            className={`p-1.5 rounded ${
              editor.isActive("blockquote") ? "bg-gray-300" : "hover:bg-gray-200"
            }`}
            title="Cita"
          >
            &ldquo;
          </button>
          <div className="w-px bg-gray-300 mx-1" />
          <button
            type="button"
            onClick={handleImageUpload}
            className="p-1.5 rounded hover:bg-gray-200"
            title="Subir imagen"
          >
            🖼
          </button>
        </div>
      )}
      <EditorContent
        editor={editor}
        className="prose max-w-none p-4 min-h-[200px] focus:outline-none"
      />
    </div>
  );
}
