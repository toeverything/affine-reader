import { useEffect, useRef } from "react";
import { useEditor } from "../editor/context";

const EditorContainer = ({ style }: { style?: React.CSSProperties }) => {
  const { editor } = useEditor()!;

  const editorContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (editorContainerRef.current && editor) {
      editorContainerRef.current.innerHTML = "";
      editorContainerRef.current.appendChild(editor);
    }
  }, [editor]);

  return (
    <div
      style={{ width: "100%", height: "100%", ...style }}
      ref={editorContainerRef}
    ></div>
  );
};

export default EditorContainer;
