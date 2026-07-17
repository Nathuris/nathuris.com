import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const musicCollection = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/music' }),
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    coverImage: z.string().optional(),
    linkUrl: z.string().optional(),
    tags: z.array(z.string()).optional().default([]),
    date: z.date().optional(),
  }),
});

const projectsCollection = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/projects' }),
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    image: z.string().optional(),
    tags: z.array(z.string()).optional().default([]),
    demoUrl: z.string().optional(),
    sourceUrl: z.string().optional(),
    date: z.date().optional(),
  }),
});

const blogCollection = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/blog' }),
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    tags: z.array(z.string()).optional().default([]),
    date: z.date().optional(),
  }),
});

const settingsCollection = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/settings' }),
  schema: z.object({
    email: z.string().optional().default(''),
    github: z.string().optional().default(''),
    neteaseMusic: z.string().optional().default(''),
    bilibili: z.string().optional().default(''),
    weibo: z.string().optional().default(''),
    bio: z.string().optional().default(''),
  }),
});

export const collections = {
  music: musicCollection,
  projects: projectsCollection,
  blog: blogCollection,
  settings: settingsCollection,
};
