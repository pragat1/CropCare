import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AppShell } from "@/components/app-shell";
import { QUIZZES } from "@/lib/data/quizzes";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CheckCircle2, XCircle, RotateCw } from "lucide-react";

export const Route = createFileRoute("/_authenticated/quiz")({ component: QuizPage });

function QuizPage() {
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);

  const q = QUIZZES[i];
  const total = QUIZZES.length;

  async function next() {
    const correct = picked === q.ans;
    const newScore = score + (correct ? 1 : 0);
    if (i + 1 >= total) {
      setScore(newScore); setDone(true);
      const { data: u } = await supabase.auth.getUser();
      if (u.user) {
        const { error } = await supabase.from("quiz_attempts").insert({
          user_id: u.user.id, score: newScore, total,
        });
        if (error) toast.error("Couldn't save score");
      }
    } else {
      setScore(newScore); setI(i + 1); setPicked(null);
    }
  }
  function restart() { setI(0); setPicked(null); setScore(0); setDone(false); }

  if (done) return (
    <AppShell>
      <Card className="p-8 max-w-lg mx-auto text-center">
        <h1 className="font-serif text-3xl font-semibold">Quiz complete</h1>
        <p className="mt-2 text-muted-foreground">You scored</p>
        <div className="text-5xl font-bold my-4">{score} / {total}</div>
        <Button onClick={restart} className="gap-2"><RotateCw className="h-4 w-4" /> Try again</Button>
      </Card>
    </AppShell>
  );

  return (
    <AppShell>
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>Question {i + 1} of {total}</span><span>Score: {score}</span>
        </div>
        <Card className="p-6 mt-3">
          <h2 className="font-semibold text-lg">{q.q}</h2>
          <div className="mt-4 grid gap-2">
            {q.opts.map((o, idx) => {
              const isPicked = picked === idx;
              const showResult = picked !== null;
              const correct = idx === q.ans;
              return (
                <button
                  key={idx}
                  disabled={showResult}
                  onClick={() => setPicked(idx)}
                  className={`text-left px-4 py-3 rounded-lg border transition-colors ${
                    showResult
                      ? correct ? "border-primary bg-primary/10"
                      : isPicked ? "border-destructive bg-destructive/10" : "border-border"
                      : isPicked ? "border-primary" : "border-border hover:bg-muted"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    {showResult && correct && <CheckCircle2 className="h-4 w-4 text-primary" />}
                    {showResult && isPicked && !correct && <XCircle className="h-4 w-4 text-destructive" />}
                    {o}
                  </span>
                </button>
              );
            })}
          </div>
          {picked !== null && (
            <p className="mt-4 text-sm text-muted-foreground">{q.explanation}</p>
          )}
          <Button className="mt-4 w-full" disabled={picked === null} onClick={next}>
            {i + 1 >= total ? "Finish" : "Next"}
          </Button>
        </Card>
      </div>
    </AppShell>
  );
}