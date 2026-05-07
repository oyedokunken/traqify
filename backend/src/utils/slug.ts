import slugify from "slugify";
import prisma from "../config/database";

export const generateSlug = (text: string): string => {
  return slugify(text, {
    lower: true,
    strict: true,
    trim: true,
  });
};

export const generateUniqueSlug = async (name: string): Promise<string> => {
  const baseSlug = generateSlug(name);
  let slug = baseSlug;
  let count = 0;

  while (true) {
    const existing = await prisma.organization.findUnique({ where: { slug } });
    if (!existing) break;
    count++;
    slug = `${baseSlug}-${count}`;
  }

  return slug;
};
