import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const uploadAvatar = async (userId: string, file: File): Promise<string> => {
  const ext = file.name.split(".").pop();
  const path = `${userId}/avatar.${ext}`;

  const { error } = await supabase.storage.from("avatars").upload(path, file, {
    cacheControl: "3600",
    upsert: true,
  });

  if (error) throw new Error(error.message);

  const { data } = supabase.storage.from("avatars").getPublicUrl(path);
  return data.publicUrl;
};

export const uploadProductImage = async (orgId: string, productId: string, file: File): Promise<string> => {
  const ext = file.name.split(".").pop();
  const path = `${orgId}/${productId}.${ext}`;

  const { error } = await supabase.storage.from("products").upload(path, file, {
    cacheControl: "3600",
    upsert: true,
  });

  if (error) throw new Error(error.message);

  const { data } = supabase.storage.from("products").getPublicUrl(path);
  return data.publicUrl;
};
