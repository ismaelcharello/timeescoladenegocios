import { cache } from "react";
import { createAuthorizedDirectoryClient } from "@/lib/supabase/directory";

export type DirectoryMember = {
  user_id: string;
  full_name: string | null;
  avatar_path: string | null;
  avatar_url?: string | null;
  job_title: string | null;
  company_name: string | null;
  segment: string | null;
  city: string | null;
  state: string | null;
  company_description: string | null;
  services: string | null;
  offers: string | null;
  service_area: string | null;
};

export type DirectoryProfile = Awaited<ReturnType<typeof getDirectoryProfile>>;

async function signedAvatar(path: string | null) {
  if (!path) return null;
  const supabase = await createAuthorizedDirectoryClient();
  if (!supabase) return null;
  const { data } = await supabase.storage
    .from("member-avatars")
    .createSignedUrl(path, 60);
  return data?.signedUrl ?? null;
}

export async function searchDirectory(filters: {
  search?: string;
  segment?: string;
  city?: string;
  service?: string;
}) {
  const supabase = await createAuthorizedDirectoryClient();
  if (!supabase) return { members: [] as DirectoryMember[], error: "Serviço indisponível." };

  const { data, error } = await supabase.rpc("search_member_directory", {
    search_term: filters.search?.trim() || undefined,
    segment_filter: filters.segment?.trim() || undefined,
    city_filter: filters.city?.trim() || undefined,
    service_filter: filters.service?.trim() || undefined,
  });

  if (error) return { members: [] as DirectoryMember[], error: "Não foi possível carregar o diretório." };
  const members = await Promise.all(
    (data ?? []).map(async (member) => ({
      ...member,
      avatar_url: await signedAvatar(member.avatar_path),
    })),
  );
  return { members, error: "" };
}

export const getDirectoryProfile = cache(async (userId: string) => {
  const supabase = await createAuthorizedDirectoryClient();
  if (!supabase) return null;
  const { data, error } = await supabase.rpc("get_member_directory_profile", {
    target_user_id: userId,
  });
  const profile = error ? null : data?.[0];
  if (!profile) return null;
  return { ...profile, avatar_url: await signedAvatar(profile.avatar_path) };
});

export function memberInitials(name: string | null) {
  return (name ?? "TIME")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export function safeExternalUrl(value: string | null) {
  if (!value) return null;
  try {
    const url = new URL(value.startsWith("http") ? value : `https://${value}`);
    return ["http:", "https:"].includes(url.protocol) ? url.toString() : null;
  } catch {
    return null;
  }
}
