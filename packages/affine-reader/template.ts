// template right now is a superset of blog site

import * as Blog from "./blog";
import {
  DatabaseBlock,
  EmbedSyncedDocBlock,
  parseBlockToMd,
  ParsedBlock,
} from "./parser";
import { findNextBlock, skipEmptyBlocks } from "./utils";

export interface Template extends Blog.WorkspacePageContent {
  // New fields
  relatedTemplates: string[]; // 关联模板，元素值为 slug
  relatedBlogs: string[]; // 关联博客，元素值为 slug
  useTemplateUrl?: string; // 点击 Use this template 后跳转的链接
  previewUrl?: string; // 点击 Preview 跳换的链接
}

export interface TemplateCategory {
  category: string;
  list: Template[];
  featured: Template;
  description: string; // 模板列表页面的描述, Markdown格式
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

  const _reader = reader;

  const META_LIST_NAME = "meta:template-list";

  function getDatabaseBlock(blocks: ParsedBlock[], title: string) {
    const normalizedTitle = (v: string) => v.replaceAll(" ", "").toLowerCase();

    return findNextBlock(
      blocks,
      0,
      (block): block is DatabaseBlock =>
        block.flavour === "affine:database" &&
        normalizedTitle((block as DatabaseBlock).title) ===
          normalizedTitle(title)
    )?.[0];
  }

  async function getCategoryDescription(blocks: ParsedBlock[], index: number) {
    // find 'embed-synced-doc' after index
    const block = skipEmptyBlocks(blocks, index + 1)[0] as EmbedSyncedDocBlock;

    if (!block || block.flavour !== "affine:embed-synced-doc") {
      return "";
    }

    const page = await _reader.getWorkspacePageContent(block.pageId);
    if (!page) {
      return "";
    }

    return page.md || "";
  }

  async function getLinkedPagesFromDatabase(block: DatabaseBlock) {
    if (!block) {
      return [];
    }

    const linkedPageIds = _reader.getLinkedPageIdsFromMarkdown(block.content);
    const pages = await _reader.getRichLinkedPages(linkedPageIds);
    return pages.map((p) => p.slug);
  }

  async function pageIdToSlug(pageId: string) {
    const page = await _reader?.getWorkspacePageContent(pageId);
    if (!page) {
      return null;
    }

    return page.slug;
  }

  async function postprocessTemplate(
    rawTemplate: Blog.WorkspacePageContent
  ): Promise<Template | null> {
    const processed = await _reader.postprocessPageContent(rawTemplate);
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
        (block) =>
          block !== relatedTemplatesBlock && block !== relatedBlogsBlock
      ),
    });

    const templateId =
      "template" in processed
        ? (processed.template as string).startsWith("LinkedPage:")
          ? (processed.template as string).slice("LinkedPage:".length)
          : processed.template
        : null;
    const templateUrl = templateId
      ? `https://app.affine.pro/template?id=${workspaceId}:${templateId}`
      : undefined;

    const template: Template = {
      ...processed,
      relatedTemplates: relatedTemplates.filter(Boolean) as string[],
      relatedBlogs: relatedBlogs.filter(Boolean) as string[],
      useTemplateUrl: templateId ? `${templateUrl}?mode=use` : undefined,
      previewUrl: templateId ? `${templateUrl}?mode=preview` : undefined,
    };

    return {
      ...template,
      valid: isValidTemplate(template),
    };
  }

  function isValidTemplate(template: Template) {
    return Boolean(
      template.title &&
        template.cover &&
        template.md &&
        template.id &&
        template.slug &&
        template.parsedBlocks &&
        template.relatedTemplates &&
        template.relatedBlogs &&
        template.useTemplateUrl &&
        template.previewUrl
    );
  }

  async function getTemplateList(): Promise<{
    categories: TemplateCategory[];
    templateListPageId: string;
  } | null> {
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

    const parsedBlocks = parsed.parsedBlocks;

    if (!parsedBlocks) {
      return null;
    }

    // get all database blocks
    const databaseBlocks = parsed.parsedBlocks?.filter(
      (block): block is DatabaseBlock => block.flavour === "affine:database"
    );

    if (!databaseBlocks) {
      return null;
    }

    // id -> template
    const cache = new Map<string, Template>();

    // database title is the category
    const parseDatabase = async (block: DatabaseBlock) => {
      const templates: Template[] = [];

      for (const id of _reader.getLinkedPageIdsFromMarkdown(block.content)) {
        if (cache.has(id)) {
          templates.push(cache.get(id)!);
          continue;
        }

        const page = await _reader.getWorkspacePageContent(id);
        if (!page) {
          continue;
        }
        const template = await postprocessTemplate(page);
        if (template) {
          templates.push(template);
          cache.set(id, template);
        }
      }

      return {
        category: block.title,
        list: templates,
        featured: templates[0],
      };
    };

    const categories: TemplateCategory[] = [];

    for (let i = 0; i < parsedBlocks.length; i++) {
      const block = parsedBlocks[i];
      if (block.flavour === "affine:database") {
        const category = await parseDatabase(block as DatabaseBlock);
        categories.push({
          ...category,
          description: await getCategoryDescription(parsedBlocks, i),
        });
      }
    }

    return {
      categories,
      templateListPageId: page.id,
    };
  }

  return {
    ...reader,
    getTemplateList,
    postprocessTemplate,
  };
}
