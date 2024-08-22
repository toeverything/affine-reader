import { useEffect, useState } from "react";
import { Doc } from "@blocksuite/store";
import { useEditor } from "../editor/context";

import styles from "../doc-editor.module.css";

const Sidebar = () => {
  const { collection, editor } = useEditor()!;
  const [docs, setDocs] = useState<Doc[]>([]);

  useEffect(() => {
    if (!collection || !editor) return;
    const updateDocs = () => {
      const docs = [...collection.docs.values()].map((blocks) =>
        blocks.getDoc()
      );
      setDocs(docs);
    };
    updateDocs();

    const disposable = [
      collection.slots.docUpdated.on(updateDocs),
      editor.slots.docLinkClicked.on(updateDocs),
    ];

    return () => disposable.forEach((d) => d.dispose());
  }, [collection, editor]);

  return (
    <div className={styles.sidebar}>
      <div className={styles.sidebarHeader}>All Docs</div>
      <div className={styles.docList}>
        {docs.map((doc) => (
          <div
            className={styles.docItem}
            data-active={editor?.doc === doc}
            key={doc.id}
            onClick={() => {
              if (editor) editor.doc = doc;
              const docs = [...collection.docs.values()].map((blocks) =>
                blocks.getDoc()
              );
              setDocs(docs);
            }}
          >
            {doc.meta?.title || "Untitled"}
          </div>
        ))}
      </div>
    </div>
  );
};

export default Sidebar;
