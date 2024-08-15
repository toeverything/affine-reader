"use client";

import {
  CollectionData,
  EditorProvider,
  useCollectionData,
} from "./components/EditorProvider";
import Sidebar from "./components/Sidebar";
import EditorContainer from "./components/EditorContainer";
import styles from "./doc-editor.module.css";
import { PageRenderer } from "../workspace-renderer";
import { reader } from "@/reader";
import { useMemo } from "react";

const parseCollectionData = (data: CollectionData) => {
  const pages = reader.workspaceDocToPagesMeta(data.rootDoc);
  const page = data.activeDoc ? reader.pageDocToMD(data.activeDoc) : null;
  return { pages, page };
};

export function DocEditor() {
  const data = useCollectionData();
  const { pages, page } = useMemo(() => parseCollectionData(data), [data]);
  return (
    <div className={styles.app}>
      <EditorProvider>
        <Sidebar />
        <div className={styles.mainContent}>
          <EditorContainer />
          {page && <PageRenderer page={page} pages={pages} />}
        </div>
      </EditorProvider>
    </div>
  );
}
