"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Highlight from "@tiptap/extension-highlight";

interface RichTextEditorProps {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: string;
}

function MenuButton({
  onClick,
  active,
  children,
  title,
}: {
  onClick: () => void;
  active?: boolean;
  children: React.ReactNode;
  title: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`px-2 py-1.5 rounded text-sm font-medium transition-colors ${
        active
          ? "bg-blue-100 text-blue-700"
          : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
      }`}
    >
      {children}
    </button>
  );
}

export default function RichTextEditor({
  content,
  onChange,
  placeholder = "Skriv her...",
  minHeight = "200px",
}: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
      }),
      Underline,
      Highlight.configure({ multicolor: false }),
    ],
    content,
    onUpdate: ({ editor: e }) => {
      onChange(e.getHTML());
    },
    editorProps: {
      attributes: {
        class: "prose prose-sm max-w-none focus:outline-none",
        style: `min-height: ${minHeight}`,
      },
    },
  });

  if (!editor) return null;

  return (
    <div className="border border-gray-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-0.5 px-2 py-1.5 bg-gray-50 border-b border-gray-200">
        <MenuButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          active={editor.isActive("heading", { level: 2 })}
          title="Overskrift"
        >
          <span className="text-xs font-bold">Overskrift</span>
        </MenuButton>
        <MenuButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          active={editor.isActive("heading", { level: 3 })}
          title="Underoverskrift"
        >
          <span className="text-xs font-bold">Underoverskrift</span>
        </MenuButton>

        <div className="w-px h-5 bg-gray-300 mx-1" />

        <MenuButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          active={editor.isActive("bold")}
          title="Fet (Ctrl+B)"
        >
          <strong>Fet</strong>
        </MenuButton>
        <MenuButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          active={editor.isActive("italic")}
          title="Kursiv (Ctrl+I)"
        >
          <em>Kursiv</em>
        </MenuButton>
        <MenuButton
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          active={editor.isActive("underline")}
          title="Understrek (Ctrl+U)"
        >
          <span className="underline">Understrek</span>
        </MenuButton>
        <MenuButton
          onClick={() => editor.chain().focus().toggleHighlight().run()}
          active={editor.isActive("highlight")}
          title="Utheving"
        >
          <span className="bg-yellow-200 px-0.5 rounded">Utheving</span>
        </MenuButton>

        <div className="w-px h-5 bg-gray-300 mx-1" />

        <MenuButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          active={editor.isActive("bulletList")}
          title="Punktliste"
        >
          <svg className="w-4 h-4 inline mr-0.5" viewBox="0 0 20 20" fill="currentColor"><circle cx="3" cy="5" r="2"/><rect x="7" y="4" width="12" height="2" rx="1"/><circle cx="3" cy="10" r="2"/><rect x="7" y="9" width="12" height="2" rx="1"/><circle cx="3" cy="15" r="2"/><rect x="7" y="14" width="12" height="2" rx="1"/></svg>
          <span className="text-xs">Punktliste</span>
        </MenuButton>
        <MenuButton
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          active={editor.isActive("orderedList")}
          title="Nummerert liste"
        >
          <svg className="w-4 h-4 inline mr-0.5" viewBox="0 0 20 20" fill="currentColor"><text x="0" y="7" fontSize="6" fontWeight="bold">1.</text><rect x="7" y="4" width="12" height="2" rx="1"/><text x="0" y="12" fontSize="6" fontWeight="bold">2.</text><rect x="7" y="9" width="12" height="2" rx="1"/><text x="0" y="17" fontSize="6" fontWeight="bold">3.</text><rect x="7" y="14" width="12" height="2" rx="1"/></svg>
          <span className="text-xs">Nummerert</span>
        </MenuButton>
      </div>

      {/* Editor */}
      <div className="px-4 py-3">
        {editor.isEmpty && (
          <div className="pointer-events-none absolute text-gray-400 text-sm">
            {placeholder}
          </div>
        )}
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}

export function RichTextViewer({ content }: { content: string }) {
  return (
    <div
      className="prose prose-sm max-w-none text-gray-700"
      dangerouslySetInnerHTML={{ __html: content }}
    />
  );
}
