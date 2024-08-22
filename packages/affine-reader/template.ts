// template right now is a superset of blog site

import * as Blog from "./blog";

export interface Template {
  title: string;
  tags: string[];
  id: string;
  slug: string;
  cover: string;
  description: string;
  created: number;
  updated: number;
  md: string;
  publish: boolean;

  // New fields
  relatedTemplates: string[]; // 关联模板，元素值为 slug
  relatedBlogs: string[]; // 关联博客，元素值为 slug
  order: number; // 排序使用，配合 created 字段一起
  useTemplateUrl: string; // 点击 Use this template 后跳转的链接
  previewUrl: string; // 点击 Preview 跳换的链接
}
