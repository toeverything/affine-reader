import { getBlocksuiteReader } from "affine-reader";

import "./prism.css";

import { use } from "react";
import { mdToHTML } from "./md-to-html";
import styles from "./workspace-renderer.module.css";

function PageRenderer({
  workspaceId,
  id,
}: {
  workspaceId: string;
  id: string;
}) {
  const reader = getBlocksuiteReader({
    workspaceId,
  });
  const page = use(reader.getDocMarkdown(id));

  if (!page) {
    return null;
  }

  return (
    <section className={styles.twoColumnWrapper}>
      <article className={styles.page}>
        <pre className={styles.markdown}>{page.md}</pre>
      </article>
      <article className={styles.page}>
        <div dangerouslySetInnerHTML={{ __html: mdToHTML(page.md) }} />
      </article>
    </section>
  );
}

export function WorkspaceRenderer({ workspaceId }: { workspaceId: string }) {
  const reader = getBlocksuiteReader({
    workspaceId,
  });
  const pages = use(reader.getDocPageMetas());

  return (
    <div className={styles.root}>
      {pages
        ? pages.map((page) => (
            <fieldset key={page.id} className={styles.pageContainer}>
              <legend className={styles.legend}>
                {page.title} |<code>{page.id}</code>
              </legend>
              <PageRenderer workspaceId={workspaceId} id={page.guid} />
            </fieldset>
          ))
        : "failed to load pages"}
    </div>
  );
}
