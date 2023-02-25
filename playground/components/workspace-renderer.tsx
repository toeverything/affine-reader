import { use } from "react";
import { getBlocksuiteReader } from "blocksuite-reader";

import styles from "./workspace-renderer.module.css";

export function WorkspaceRenderer({ workspaceId }: { workspaceId: string }) {
  const reader = getBlocksuiteReader({
    workspaceId,
  });
  const pages = use(reader.getWorkspacePages(true));
  return (
    <div>
      {pages
        ? pages.map((page) => (
            <div key={page.id}>
              <h1>{page.title}</h1>
              <article>
                <pre className={styles.markdown}>{page.md}</pre>
              </article>
            </div>
          ))
        : "failed to load pages"}
    </div>
  );
}
