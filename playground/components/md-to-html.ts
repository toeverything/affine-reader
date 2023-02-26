import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import rehypeStringify from "rehype-stringify";
import rehypePrism from "rehype-prism-plus";
import { cache } from "react";

const remarkHtml = unified()
  .use(remarkParse)
  .use(remarkRehype)
  .use(rehypePrism)
  .use(rehypeStringify);

export const mdToHTML = cache((md: string) => {
  const vfile = remarkHtml.processSync(md);
  return String(vfile);
});
