// template right now is a superset of blog site

import * as Blog from "./blog";
import { DatabaseBlock, parseBlockToMd, ParsedBlock } from "./parser";
import { findNextBlock } from "./utils";

export interface Template extends Blog.WorkspacePageContent {
  // New fields
  relatedTemplates: string[]; // 关联模板，元素值为 slug
  relatedBlogs: string[]; // 关联博客，元素值为 slug
  useTemplateUrl?: string; // 点击 Use this template 后跳转的链接
  previewUrl?: string; // 点击 Preview 跳换的链接
}

let reader: ReturnType<typeof Blog.instantiateReader> | null = null;

// note: 为了保证template能访问到blog，所以template与blog需要在同一个workspace中

export function instantiateReader({
  workspaceId,
  sessionToken,
  jwtToken,
  target,
}: {
  workspaceId: string;
  sessionToken?: string;
  jwtToken?: string;
  target?: string;
}) {
  reader = Blog.instantiateReader({
    workspaceId,
    sessionToken,
    jwtToken,
    target,
  });

  return {
    ...reader,
    getTemplateList,
    postprocessTemplate,
  };
}

const META_LIST_NAME = "meta:template-list";

function getDatabaseBlock(blocks: ParsedBlock[], title: string) {
  const normalizedTitle = (v: string) => v.replaceAll(" ", "").toLowerCase();

  return findNextBlock(
    blocks,
    0,
    (block): block is DatabaseBlock =>
      block.flavour === "affine:database" &&
      normalizedTitle((block as DatabaseBlock).title) === normalizedTitle(title)
  )?.[0];
}

async function getLinkedPagesFromDatabase(block: DatabaseBlock) {
  if (!reader) {
    throw new Error("Reader not instantiated");
  }

  if (!block) {
    return [];
  }

  const linkedPageIds = reader.getLinkedPageIdsFromMarkdown(block.content);
  const pages = await reader.getRichLinkedPages(linkedPageIds);
  return pages.map((p) => p.slug);
}

async function pageIdToSlug(pageId: string) {
  const page = await reader?.getWorkspacePageContent(pageId);
  if (!page) {
    return null;
  }

  return page.slug;
}

async function postprocessTemplate(
  rawTemplate: Blog.WorkspacePageContent
): Promise<Template | null> {
  if (!reader) {
    throw new Error("Reader not instantiated");
  }

  const processed = await reader.postprocessPageContent(rawTemplate);
  const parsedBlocks = processed.parsedBlocks;
  if (!parsedBlocks) {
    return null;
  }

  const relatedTemplatesBlock = getDatabaseBlock(
    parsedBlocks,
    "Related Templates"
  );

  const relatedTemplates = relatedTemplatesBlock
    ? await getLinkedPagesFromDatabase(relatedTemplatesBlock)
    : [];

  const relatedBlogsBlock = getDatabaseBlock(parsedBlocks, "Related Blogs");

  const relatedBlogs = relatedBlogsBlock
    ? await getLinkedPagesFromDatabase(relatedBlogsBlock)
    : [];

  // resulting markdown should exclude relatedTemplates and relatedBlogs
  processed.md = parseBlockToMd({
    id: "fake-id",
    content: "",
    flavour: "affine:page",
    children: parsedBlocks.filter(
      (block) => block !== relatedTemplatesBlock && block !== relatedBlogsBlock
    ),
  });

  const templateId =
    "template" in processed
      ? (processed.template as string).startsWith("LinkedPage:")
        ? (processed.template as string).slice("LinkedPage:".length)
        : processed.template
      : null;
  const templateUrl = templateId
    ? `https://app.affine.pro/template?id=${process.env.NEXT_PUBLIC_BLOG_WORKSPACE_ID}:${templateId}`
    : undefined;

  const template: Template = {
    ...processed,
    relatedTemplates: relatedTemplates.filter(Boolean) as string[],
    relatedBlogs: relatedBlogs.filter(Boolean) as string[],
    useTemplateUrl: templateId ? `${templateUrl}?mode=use` : undefined,
    previewUrl: templateId ? `${templateUrl}?mode=preview` : undefined,
  };

  return template;
}

async function getTemplateList() {
  const doc = await reader?.getDocPageMetas();
  if (!doc) {
    return null;
  }

  const page = doc.find((page) => page.title === META_LIST_NAME);
  if (!page) {
    return null;
  }

  const parsed = await reader?.getWorkspacePageContent(page.id);
  if (!parsed) {
    return null;
  }

  // page links are in order
  const pages = parsed.linkedPages;

  if (!pages) {
    return null;
  }

  // postprocess (assume relatedTemplates etc are in databases)
  const templates = (await Promise.all(pages.map(postprocessTemplate))).filter(
    Boolean
  ) as Template[];

  return { templates, templateListPageId: page.id };
}
