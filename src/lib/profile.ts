import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

/** Farmer profile: identity, farm location and every user preference in one row. */
export type Profile = {
  id: string;
  display_name: string | null;
  farm_place: string | null;
  farm_lat: number | null;
  farm_lng: number | null;
  primary_crop: string | null;
  language: string;
  theme: string;
  units: string;
  notify_reminders: boolean;
  notify_weather: boolean;
  notify_scans: boolean;
  share_analytics: boolean;
};

export type ProfileUpdate = Partial<Omit<Profile, "id">>;

export const LANGUAGES = [
  { value: "en", label: "English" },
  { value: "hi", label: "हिन्दी (Hindi)" },
  { value: "pa", label: "ਪੰਜਾਬੀ (Punjabi)" },
] as const;

export const THEMES = [
  { value: "system", label: "Match system" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
] as const;

export const UNITS = [
  { value: "metric", label: "Metric (°C, mm, km/h)" },
  { value: "imperial", label: "Imperial (°F, in, mph)" },
] as const;

export function useProfile() {
  return useQuery({
    queryKey: ["profile"],
    staleTime: 60_000,
    queryFn: async (): Promise<Profile | null> => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", auth.user.id)
        .maybeSingle();
      if (error) throw error;
      if (data) return data as Profile;
      // Self-heal for accounts created before profiles existed.
      const { data: created, error: insertError } = await supabase
        .from("profiles")
        .insert({ id: auth.user.id, display_name: auth.user.email?.split("@")[0] ?? null })
        .select("*")
        .single();
      if (insertError) throw insertError;
      return created as Profile;
    },
  });
}

export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (patch: ProfileUpdate) => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error("You need to be signed in.");
      const { data, error } = await supabase
        .from("profiles")
        .update(patch)
        .eq("id", auth.user.id)
        .select("*")
        .single();
      if (error) throw error;
      return data as Profile;
    },
    onSuccess: (profile) => {
      qc.setQueryData(["profile"], profile);
      qc.invalidateQueries({ queryKey: ["weather-intel"] });
    },
  });
}

/** Applies the saved theme preference to the document root. */
export function useApplyTheme(theme: string | undefined) {
  useEffect(() => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      const dark = theme === "dark" || (theme !== "light" && media.matches);
      root.classList.toggle("dark", dark);
    };
    apply();
    if (theme && theme !== "system") return;
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, [theme]);
}

/** Farm coordinates saved on the profile, when both values are present. */
export function farmCoords(profile: Profile | null | undefined) {
  if (!profile || profile.farm_lat == null || profile.farm_lng == null) return null;
  return { lat: profile.farm_lat, lon: profile.farm_lng };
}