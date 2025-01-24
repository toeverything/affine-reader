// template right now is a superset of blog site

import * as Blog from "./blog";
import {
  DatabaseBlock,
  EmbedSyncedDocBlock,
  parseBlockToMd,
  ParsedBlock,
} from "./parser";
import { getDatabaseBlock, skipEmptyBlocks } from "./utils";

export interface Template extends Blog.WorkspacePageContent {
  // New fields
  relatedTemplates: string[]; // 关联模板，元素值为 slug
  templateId?: string; // 模板的 id
  templateMode?: "page" | "edgeless"; // 模板的模式
}

export interface TemplateCategory {
  category: string;
  title: string;
  slug: string;
  templates: string[];
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
  blogBasePath,
}: {
  workspaceId: string;
  sessionToken?: string;
  jwtToken?: string;
  target?: string;
  blogBasePath?: string;
}) {
  reader = Blog.instantiateReader({
    workspaceId,
    sessionToken,
    jwtToken,
    target,
    blogBasePath,
  });

  const _reader = reader;

  const META_CATEGORY_LIST_NAME = "meta:category-list";
  const META_CATEGORY_DATABASE_NAME = "category-list";

  async function getCategoryDescription(blocks: ParsedBlock[], index: number) {
    // find 'embed-synced-doc' after index
    const block = skipEmptyBlocks(blocks, index + 1)[0] as EmbedSyncedDocBlock;

    if (
      !block ||
      (block.flavour !== "affine:embed-synced-doc" &&
        block.flavour !== "affine:embed-linked-doc")
    ) {
      return {
        md: "",
        title: "",
      };
    }

    const page = await _reader.getWorkspacePageContent(block.pageId);
    if (!page) {
      return {
        md: "",
        title: "",
      };
    }

    return {
      md: page.md || "",
      title: page.title || "",
    };
  }

  async function getLinkedPagesFromDatabase(block: DatabaseBlock) {
    if (!block) {
      return [];
    }

    const linkedPageIds = _reader.getLinkedPageIdsFromMarkdown(block.content);
    const pages = await _reader.getRichLinkedPages(
      linkedPageIds.map((p) => p.id)
    );
    return pages;
  }

  async function postprocessTemplate(
    rawTemplate: Blog.WorkspacePageContent
  ): Promise<Template | null> {
    const processed = await _reader.postprocessBlogContent(rawTemplate);
    const docs = await _reader.getDocPageMetas();
    const parsedBlocks = processed.parsedBlocks;
    if (!parsedBlocks) {
      return null;
    }

    const [relatedTemplatesBlock] = getDatabaseBlock(
      parsedBlocks,
      "Related Templates"
    );

    const relatedTemplates = relatedTemplatesBlock
      ? (await getLinkedPagesFromDatabase(relatedTemplatesBlock)).map(
          (p) => p.id
        )
      : [];

    // resulting markdown should exclude relatedTemplates and relatedBlogs
    processed.md = parseBlockToMd({
      id: "fake-id",
      content: "",
      flavour: "affine:page",
      children: parsedBlocks.filter((block) => block !== relatedTemplatesBlock),
    });

    const templateIdWithMode =
      "template" in processed
        ? (processed.template as string).startsWith("LinkedPage:")
          ? (processed.template as string).slice("LinkedPage:".length)
          : null
        : null;

    const templateParams = (() => {
      if (!templateIdWithMode) {
        return undefined;
      }

      const [templateId, mode] = templateIdWithMode.split(":");

      // templateId -> pageId
      const doc = docs?.find((doc) => doc.guid === templateId);
      if (!doc) {
        return undefined;
      }

      return {
        templateId: doc.id,
        templateMode: (mode || doc.properties?.primaryMode || "page") as
          | "page"
          | "edgeless",
      };
    })();

    const template: Template = {
      ...processed,
      ...templateParams,
      relatedTemplates: relatedTemplates.filter(Boolean) as string[],
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
        template.templateId
    );
  }

  async function getCategoryList(): Promise<{
    categoryPages: Blog.WorkspacePage[];
    templateListPageId: string;
  } | null> {
    const pageMetas = await reader?.getDocPageMetas();
    if (!pageMetas) {
      return null;
    }

    const categoryListPage = pageMetas.find(
      (page) => page.title === META_CATEGORY_LIST_NAME
    );
    if (!categoryListPage) {
      return null;
    }

    const parsed = await reader?.getWorkspacePageContent(
      categoryListPage.id,
      true
    );
    if (!parsed) {
      return null;
    }

    const parsedBlocks = parsed.parsedBlocks;

    if (!parsedBlocks) {
      return null;
    }

    const [categoryListDatabase] = getDatabaseBlock(
      parsedBlocks,
      META_CATEGORY_DATABASE_NAME
    );

    if (!categoryListDatabase) {
      return null;
    }

    const categoryPages = _reader
      .getLinkedPageIdsFromMarkdown(categoryListDatabase.content)
      .map((p) => pageMetas.find((m) => m.id === p.id))
      .filter((p) => p !== undefined);

    if (!categoryPages) {
      return null;
    }

    return {
      categoryPages,
      templateListPageId: categoryListPage.id,
    };
  }

  async function getCategory(categoryPageId: string): Promise<{
    description: string; // markdown
    title: string;
    pages: Blog.WorkspacePage[];
  } | null> {
    const pageMetas = await reader?.getDocPageMetas();
    if (!pageMetas) {
      return null;
    }

    const categoryPage = await reader?.getWorkspacePageContent(categoryPageId);
    if (!categoryPage || !categoryPage.parsedBlocks) {
      return null;
    }

    const [templateListDatabase, nextIndex] = getDatabaseBlock(
      categoryPage.parsedBlocks
    );
    if (!templateListDatabase) {
      return null;
    }

    const templateList = _reader
      .getLinkedPageIdsFromMarkdown(templateListDatabase.content)
      .map((p) => pageMetas.find((m) => m.id === p.id))
      .filter((p) => p !== undefined);

    const description = await getCategoryDescription(
      categoryPage.parsedBlocks,
      nextIndex
    );

    return {
      description: description.md,
      title: templateListDatabase.title,
      pages: templateList,
    };
  }

  // id -> template
  const templateCache = new Map<string, Template>();

  async function getTemplate(templateId: string): Promise<Template | null> {
    if (templateCache.has(templateId)) {
      return templateCache.get(templateId)!;
    }

    const template = await reader?.getWorkspacePageContent(templateId);
    if (!template) {
      return null;
    }

    const processed = await postprocessTemplate(template);
    if (!processed) {
      return null;
    }

    templateCache.set(templateId, processed);
    return processed;
  }

  return {
    ...reader,
    getCategoryList,
    getCategory,
    getTemplate,
    postprocessTemplate,
  };
}
