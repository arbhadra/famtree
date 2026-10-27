import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { useEffect } from 'react';

/** Read-only story renderer. Parsing through the editor schema strips anything it doesn't allow. */
export function StoryView({ html }: { html: string }) {
  const editor = useEditor({
    editable: false,
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3] }, link: false, underline: false }),
    ],
    content: html,
    editorProps: { attributes: { class: 'story read' } },
  });
  useEffect(() => {
    if (editor && html !== editor.getHTML())
      editor.commands.setContent(html, { emitUpdate: false });
  }, [editor, html]);
  return <EditorContent editor={editor} />;
}
