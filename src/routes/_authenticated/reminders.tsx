import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { AlertTriangle, Bell, CheckCircle2, Loader2, Plus, Trash2 } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { FadeIn, Stagger, StaggerItem } from "@/components/motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CROP_LIST } from "@/lib/data/crops";
import { pageHead } from "@/lib/seo";
import {
  REMINDER_KINDS,
  isOverdue,
  kindMeta,
  useCreateReminder,
  useDeleteReminder,
  useReminders,
  useToggleReminder,
  type Reminder,
  type ReminderKind,
} from "@/lib/reminders";

export const Route = createFileRoute("/_authenticated/reminders")({
  component: RemindersPage,
  head: () =>
    pageHead(
      "Farm Task Reminders — Watering, Spraying & Harvest | CropCare",
      "Schedule watering, spraying, fertilizer, follow-up scans and harvest reminders with repeat intervals and overdue alerts.",
    ),
});

function todayLocalInput() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

function ReminderRow({ r }: { r: Reminder }) {
  const toggle = useToggleReminder();
  const remove = useDeleteReminder();
  const meta = kindMeta(r.kind);
  const Icon = meta.icon;
  const overdue = isOverdue(r);

  return (
    <div className="flex items-start gap-3 rounded-xl border border-border/50 bg-card/40 p-4">
      <Checkbox
        checked={r.done}
        aria-label={r.done ? `Mark ${r.title} as pending` : `Mark ${r.title} as done`}
        className="mt-1"
        onCheckedChange={() =>
          toggle.mutate(r, {
            onError: (e) => toast.error(e instanceof Error ? e.message : "Update failed"),
          })
        }
      />
      <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
        <Icon className="h-4 w-4" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <p className={`text-sm font-medium ${r.done ? "text-muted-foreground line-through" : ""}`}>
          {r.title}
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {meta.label}
          {r.crop ? ` · ${r.crop}` : ""} · due {new Date(r.due_at).toLocaleString()}
          {r.repeat_days ? ` · repeats every ${r.repeat_days}d` : ""}
        </p>
        {r.notes && <p className="mt-1.5 text-xs text-muted-foreground">{r.notes}</p>}
      </div>
      {overdue && (
        <Badge variant="outline" className="border-destructive/30 bg-destructive/10 text-destructive">
          Overdue
        </Badge>
      )}
      <Button
        size="icon"
        variant="ghost"
        aria-label={`Delete reminder ${r.title}`}
        onClick={() =>
          remove.mutate(r.id, {
            onSuccess: () => toast.success("Reminder deleted"),
            onError: (e) => toast.error(e instanceof Error ? e.message : "Delete failed"),
          })
        }
      >
        <Trash2 className="h-4 w-4 text-muted-foreground" />
      </Button>
    </div>
  );
}

function RemindersPage() {
  const { data, isLoading, isError, error, refetch } = useReminders();
  const create = useCreateReminder();

  const [kind, setKind] = useState<ReminderKind>("water");
  const [title, setTitle] = useState("");
  const [crop, setCrop] = useState<string>("");
  const [due, setDue] = useState(todayLocalInput);
  const [repeat, setRepeat] = useState("");
  const [notes, setNotes] = useState("");

  const groups = useMemo(() => {
    const rows = data ?? [];
    return {
      overdue: rows.filter((r) => isOverdue(r)),
      upcoming: rows.filter((r) => !r.done && !isOverdue(r)),
      done: rows.filter((r) => r.done).slice(0, 20),
    };
  }, [data]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const label = title.trim();
    if (!label) {
      toast.error("Give the reminder a title.");
      return;
    }
    create.mutate(
      {
        kind,
        title: label,
        crop: crop || null,
        notes: notes.trim() || null,
        due_at: new Date(due).toISOString(),
        repeat_days: repeat ? Number(repeat) : null,
      },
      {
        onSuccess: () => {
          toast.success("Reminder added");
          setTitle("");
          setNotes("");
          setRepeat("");
        },
        onError: (e) => toast.error(e instanceof Error ? e.message : "Couldn't add reminder"),
      },
    );
  }

  return (
    <AppShell>
      <PageHeader
        icon={Bell}
        eyebrow="Farm calendar"
        title="Reminders"
        description="Plan watering, spraying, fertilizer, follow-up scans and harvesting — repeats roll forward automatically."
      />

      <div className="mt-8 grid gap-6 lg:grid-cols-[380px_1fr]">
        <FadeIn>
          <Card className="p-6">
            <h2 className="font-serif text-lg font-semibold">New reminder</h2>
            <form className="mt-5 space-y-4" onSubmit={submit}>
              <div>
                <Label htmlFor="r-kind">Task type</Label>
                <Select value={kind} onValueChange={(v) => setKind(v as ReminderKind)}>
                  <SelectTrigger id="r-kind" className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {REMINDER_KINDS.map((k) => (
                      <SelectItem key={k.value} value={k.value}>
                        {k.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="r-title">Title</Label>
                <Input
                  id="r-title"
                  className="mt-2"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Spray neem oil on tomato block B"
                  maxLength={120}
                />
              </div>
              <div>
                <Label htmlFor="r-crop">Crop (optional)</Label>
                <Select value={crop} onValueChange={setCrop}>
                  <SelectTrigger id="r-crop" className="mt-2">
                    <SelectValue placeholder="Any crop" />
                  </SelectTrigger>
                  <SelectContent>
                    {CROP_LIST.map((c) => (
                      <SelectItem key={c.key} value={c.name}>
                        {c.emoji} {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="r-due">Due</Label>
                  <Input
                    id="r-due"
                    type="datetime-local"
                    className="mt-2"
                    value={due}
                    onChange={(e) => setDue(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="r-repeat">Repeat (days)</Label>
                  <Input
                    id="r-repeat"
                    type="number"
                    min={1}
                    max={365}
                    className="mt-2"
                    value={repeat}
                    onChange={(e) => setRepeat(e.target.value)}
                    placeholder="none"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="r-notes">Notes (optional)</Label>
                <Textarea
                  id="r-notes"
                  className="mt-2"
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  maxLength={500}
                />
              </div>
              <Button type="submit" className="w-full gap-2 rounded-xl" disabled={create.isPending}>
                {create.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
                Add reminder
              </Button>
            </form>
          </Card>
        </FadeIn>

        <div className="space-y-6">
          {isError ? (
            <Card className="p-8 text-center">
              <AlertTriangle className="mx-auto h-6 w-6 text-destructive" />
              <p className="mt-3 text-sm text-muted-foreground">
                {error instanceof Error ? error.message : "Couldn’t load your reminders."}
              </p>
              <Button className="mt-4 rounded-xl" onClick={() => refetch()}>
                Try again
              </Button>
            </Card>
          ) : isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-20 rounded-2xl" />
              ))}
            </div>
          ) : (
            <>
              {(["overdue", "upcoming", "done"] as const).map((group) => {
                const rows = groups[group];
                const labels = {
                  overdue: "Overdue",
                  upcoming: "Upcoming",
                  done: "Completed",
                } as const;
                if (group === "done" && rows.length === 0) return null;
                return (
                  <Card key={group} className="p-6">
                    <div className="flex items-center justify-between">
                      <h2 className="font-serif text-lg font-semibold">{labels[group]}</h2>
                      <Badge variant="secondary">{rows.length}</Badge>
                    </div>
                    <Stagger className="mt-4 space-y-3">
                      {rows.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-border/70 p-8 text-center text-sm text-muted-foreground">
                          <CheckCircle2 className="mx-auto mb-2 h-5 w-5 text-success" />
                          {group === "overdue"
                            ? "Nothing overdue — you’re on top of the field work."
                            : "No tasks scheduled yet. Add one on the left."}
                        </div>
                      ) : (
                        rows.map((r) => (
                          <StaggerItem key={r.id}>
                            <ReminderRow r={r} />
                          </StaggerItem>
                        ))
                      )}
                    </Stagger>
                  </Card>
                );
              })}
            </>
          )}
        </div>
      </div>
    </AppShell>
  );
}