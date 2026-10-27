import { useEditor, EditorContent, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { useEffect } from 'react';

interface Props {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
}

const TOOLS: {
  label: string;
  title: string;
  run: (e: Editor) => void;
  active: (e: Editor) => boolean;
}[] = [
  {
    label: 'B',
    title: 'Bold',
    run: (e) => e.chain().focus().toggleBold().run(),
    active: (e) => e.isActive('bold'),
  },
  {
    label: 'I',
    title: 'Italic',
    run: (e) => e.chain().focus().toggleItalic().run(),
    active: (e) => e.isActive('italic'),
  },
  {
    label: 'H2',
    title: 'Heading',
    run: (e) => e.chain().focus().toggleHeading({ level: 2 }).run(),
    active: (e) => e.isActive('heading', { level: 2 }),
  },
  {
    label: 'H3',
    title: 'Subheading',
    run: (e) => e.chain().focus().toggleHeading({ level: 3 }).run(),
    active: (e) => e.isActive('heading', { level: 3 }),
  },
  {
    label: '❝',
    title: 'Quote',
    run: (e) => e.chain().focus().toggleBlockquote().run(),
    active: (e) => e.isActive('blockquote'),
  },
  {
    label: '•',
    title: 'Bulleted list',
    run: (e) => e.chain().focus().toggleBulletList().run(),
    active: (e) => e.isActive('bulletList'),
  },
  {
    label: '1.',
    title: 'Numbered list',
    run: (e) => e.chain().focus().toggleOrderedList().run(),
    active: (e) => e.isActive('orderedList'),
  },
  {
    label: '—',
    title: 'Divider',
    run: (e) => e.chain().focus().setHorizontalRule().run(),
    active: () => false,
  },
];

/** TipTap story editor with a small formatting toolbar. Emits HTML. */
export function RichEditor({ value, onChange, placeholder }: Props) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3] }, link: false, underline: false }),
      Placeholder.configure({ placeholder: placeholder ?? 'Tell the story…' }),
    ],
    content: value,
    editorProps: {
      attributes: {
        class: 'story',
        'aria-label': 'Story',
        role: 'textbox',
        'aria-multiline': 'true',
      },
    },
    onUpdate: ({ editor }) => onChange(editor.isEmpty ? '' : editor.getHTML()),
  });

  // Keep in sync if the entry is replaced from outside (e.g. undo of a restore).
  useEffect(() => {
    if (
      editor &&
      !editor.isFocused &&
      value !== editor.getHTML() &&
      !(value === '' && editor.isEmpty)
    )
      editor.commands.setContent(value, { emitUpdate: false });
  }, [editor, value]);

  return (
    <div className="rich">
      {editor && (
        <div className="rich-tools" role="toolbar" aria-label="Formatting">
          {TOOLS.map((t) => (
            <button
              key={t.title}
              type="button"
              title={t.title}
              aria-label={t.title}
              aria-pressed={t.active(editor)}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => t.run(editor)}
            >
              {t.label}
            </button>
          ))}
          <span className="sep" />
          <button
            type="button"
            title="Undo"
            aria-label="Undo"
            onClick={() => editor.chain().focus().undo().run()}
          >
            ↶
          </button>
          <button
            type="button"
            title="Redo"
            aria-label="Redo"
            onClick={() => editor.chain().focus().redo().run()}
          >
            ↷
          </button>
        </div>
      )}
      <EditorContent editor={editor} />
    </div>
  );
}
