import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Droplets, Leaf, ScanLine, SprayCan, Wheat, Bell } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export type ReminderKind = "water" | "spray" | "fertilizer" | "rescan" | "harvest" | "other";

export type Reminder = {
  id: string;
  kind: ReminderKind;
  title: string;
  notes: string | null;
  crop: string | null;
  detection_id: string | null;
  due_at: string;
  repeat_days: number | null;
  done: boolean;
  completed_at: string | null;
  created_at: string;
};

export const REMINDER_KINDS: Array<{ value: ReminderKind; label: string; icon: LucideIcon }> = [
  { value: "water", label: "Watering", icon: Droplets },
  { value: "spray", label: "Spraying", icon: SprayCan },
  { value: "fertilizer", label: "Fertilizer", icon: Leaf },
  { value: "rescan", label: "Follow-up scan", icon: ScanLine },
  { value: "harvest", label: "Harvesting", icon: Wheat },
  { value: "other", label: "Other", icon: Bell },
];

export function kindMeta(kind: string) {
  return REMINDER_KINDS.find((k) => k.value === kind) ?? REMINDER_KINDS[REMINDER_KINDS.length - 1];
}

export type NewReminder = {
  kind: ReminderKind;
  title: string;
  notes?: string | null;
  crop?: string | null;
  detection_id?: string | null;
  due_at: string;
  repeat_days?: number | null;
};

export function useReminders() {
  return useQuery({
    queryKey: ["reminders"],
    queryFn: async (): Promise<Reminder[]> => {
      const { data, error } = await supabase
        .from("reminders")
        .select("*")
        .order("due_at", { ascending: true })
        .limit(300);
      if (error) throw error;
      return (data ?? []) as Reminder[];
    },
  });
}

function useReminderMutation<T>(fn: (input: T) => Promise<unknown>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["reminders"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useCreateReminder() {
  return useReminderMutation(async (input: NewReminder) => {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) throw new Error("You need to be signed in.");
    const { error } = await supabase.from("reminders").insert({ ...input, user_id: auth.user.id });
    if (error) throw error;
  });
}

export function useToggleReminder() {
  return useReminderMutation(async (input: Reminder) => {
    // Repeating tasks roll forward instead of disappearing when completed.
    if (!input.done && input.repeat_days) {
      const next = new Date(new Date(input.due_at).getTime() + input.repeat_days * 86_400_000);
      const { error } = await supabase
        .from("reminders")
        .update({ due_at: next.toISOString(), completed_at: new Date().toISOString() })
        .eq("id", input.id);
      if (error) throw error;
      return;
    }
    const { error } = await supabase
      .from("reminders")
      .update({
        done: !input.done,
        completed_at: input.done ? null : new Date().toISOString(),
      })
      .eq("id", input.id);
    if (error) throw error;
  });
}

export function useDeleteReminder() {
  return useReminderMutation(async (id: string) => {
    const { error } = await supabase.from("reminders").delete().eq("id", id);
    if (error) throw error;
  });
}

export function isOverdue(r: Reminder) {
  return !r.done && new Date(r.due_at).getTime() < Date.now();
}
