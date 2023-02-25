import { use } from "react";
import { getBlocksuiteReader } from "blocksuite-reader";
import { MDXRemote } from "next-mdx-remote/rsc";
import remarkGfm from "remark-gfm";
import rehypePrism from 'rehype-prism-plus';

import './prism.css';

import styles from "./workspace-renderer.module.css";

const mdxComponents = {
  img: (props: any) => {
    console.log(props);
    return (
      <img
        {...props}
        style={{
          maxWidth: "100%",
          height: "auto",
        }}
      />
    );
  },
};

export function WorkspaceRenderer({ workspaceId }: { workspaceId: string }) {
  const reader = getBlocksuiteReader({
    workspaceId,
  });
  const pages = use(reader.getWorkspacePages(true));
  return (
    <div>
      {pages
        ? pages.map((page) => (
            <fieldset key={page.id} className={styles.pageContainer}>
              <legend className={styles.legend}>
                {page.title} |
                <code>{page.id}</code>
              </legend>
              {page.md && (
                <section className={styles.twoColumnWrapper}>
                  <article className={styles.page}>
                    <pre className={styles.markdown}>{page.md}</pre>
                  </article>
                  <article className={styles.page}>
                    {/* @ts-expect-error Server Component */}
                    <MDXRemote
                      options={{
                        mdxOptions: {
                          // development: process.env.NODE_ENV !== "production",
                          remarkPlugins: [remarkGfm],
                          rehypePlugins: [rehypePrism],
                        },
                      }}
                      components={mdxComponents}
                      source={page.md}
                    />
                  </article>
                </section>
              )}
            </fieldset>
          ))
        : "failed to load pages"}
    </div>
  );
}
