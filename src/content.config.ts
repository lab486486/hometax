import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

const postSchema = z.object({
  title: z.string(),
  slug: z.string(),
  date: z.coerce.date(),
  description: z.string(),
  cover_image: z.string().optional(),
  tags: z.array(z.string()).default([]),
});

const blog = defineCollection({
  loader: glob({ base: "./src/content/blog", pattern: "**/*.{md,mdx}" }),
  schema: postSchema,
});

const gunmart = defineCollection({
  loader: glob({ base: "./src/content/gunmart", pattern: "**/*.{md,mdx}" }),
  schema: postSchema,
});

export const collections = { blog, gunmart };
