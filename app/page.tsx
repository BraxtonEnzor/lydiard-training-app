import React, { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Download, RotateCcw, HeartPulse, CalendarDays } from "lucide-react";
import { motion } from "framer-motion";

const PHASES = [
  { name: "Aerobic Base", focus: "Easy volume, steady running, hills, relaxed strides" },
  { name: "Hill Strength", focus: "Hilly aerobic running, short hill circuits, strength without forcing pace" },
  { name: "Anaerobic Development", focus: "Controlled intervals, sharpening, race rhythm" },
  { name: "Coordination", focus: "Race-specific 5K work, tune-up efforts, recovery balance" },
  { name: "Taper", focus: "Freshness, short sharpening, reduced mileage" },
];

function roundMile(n) {
  return Math.round(n * 2) / 2;
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function buildPhaseMap(weeks) {
  if (weeks <= 6) return ["Aerobic Base", "Aerobic Base", "Hill Strength", "Anaerobic Development", "Coordination", "Taper"].slice(0, weeks);
  const base = Math.max(4, Math.round(weeks * 0.45));
  const hills = Math.max(2, Math.round(weeks * 0.18));
  const anaerobic = Math.max(2, Math.round(weeks * 0.18));
  const taper = 1;
  const coordination = Math.max(1, weeks - base - hills - anaerobic - taper);
  return [
    ...Array(base).fill("Aerobic Base"),
    ...Array(hills).fill("Hill Strength"),
    ...Array(anaerobic).fill("Anaerobic Development"),
    ...Array(coordination).fill("Coordination"),
    ...Array(taper).fill("Taper"),
  ].slice(0, weeks);
}

function intensityCount(phase, raceWeek) {
  if (raceWeek) return 2;
  if (phase === "Aerobic Base") return 2;
  if (phase === "Hill Strength") return 3;
  if (phase === "Anaerobic Development") return 4;
  if (phase === "Coordination") return 3;
  return 2;
}

function workoutByPhase(phase, level, weekNum, raceWeek) {
  if (raceWeek) {
    return [
      "2–3 mi easy + 4 relaxed strides",
      "Short sharpening: 6 x 200m relaxed fast, full recovery",
      "Race: 5K, controlled first mile, compete late",
    ];
  }

  const beginner = level === "Beginner";
  if (phase === "Aerobic Base") {
    return [
      "Long aerobic run, conversational pace",
      beginner ? "Light fartlek: 6 x 30 sec smooth, not hard" : "Steady aerobic run: 20–35 min controlled",
      "Strides: 6–8 x 10–15 sec relaxed after easy run",
    ];
  }
  if (phase === "Hill Strength") {
    return [
      "Hilly aerobic run, controlled effort",
      beginner ? "Hill strides: 6 x 10 sec uphill relaxed" : "Hill circuit: 6–10 short uphill reps, jog down",
      "Long aerobic run on rolling terrain",
    ];
  }
  if (phase === "Anaerobic Development") {
    return [
      beginner ? "Intervals: 6 x 400m at controlled 5K effort" : "Intervals: 5–6 x 800m at 5K effort",
      "Tempo/steady run: 15–25 min comfortably hard",
      "Strides: 6 x 100m relaxed fast",
      "Long aerobic run, easy effort",
    ];
  }
  if (phase === "Coordination") {
    return [
      "5K rhythm: 3 x 1K at goal 5K effort, full control",
      beginner ? "Fartlek: 8 x 1 min on/1 min easy" : "Mixed reps: 1200m, 800m, 600m, 400m at 5K rhythm",
      "Long run reduced slightly, easy pace",
    ];
  }
  return ["Easy running", "4–6 relaxed strides", "Race-week freshness" ];
}

function generatePlan(form) {
  const weeks = Number(form.weeks);
  const startMileage = Number(form.currentMileage);
  const peakMileage = Number(form.peakMileage);
  const runDays = Number(form.runDays);
  const maxIncrease = Number(form.maxIncrease) / 100;
  const cutbackEvery = Number(form.cutbackEvery);
  const longRunPct = clamp(Number(form.longRunPct) / 100, 0.18, 0.3);
  const phaseMap = buildPhaseMap(weeks);

  let previousMileage = startMileage;
  return Array.from({ length: weeks }, (_, i) => {
    const weekNum = i + 1;
    const phase = phaseMap[i];
    const raceWeek = weekNum === weeks;
    const isCutback = cutbackEvery > 0 && weekNum % cutbackEvery === 0 && !raceWeek;

    let mileage;
    if (raceWeek) mileage = previousMileage * 0.65;
    else if (isCutback) mileage = previousMileage * 0.85;
    else mileage = Math.min(previousMileage * (1 + maxIncrease), peakMileage);

    mileage = roundMile(mileage);
    const longRun = roundMile(mileage * longRunPct);
    const easyMileage = roundMile(Math.max(0, mileage - longRun));
    const intensities = Math.min(4, intensityCount(phase, raceWeek));
    previousMileage = mileage;

    return {
      week: weekNum,
      phase,
      mileage,
      longRun,
      runDays,
      intensities,
      focus: PHASES.find((p) => p.name === phase)?.focus || "Balanced training",
      workouts: workoutByPhase(phase, form.level, weekNum, raceWeek),
      note: isCutback ? "Cutback week for health and adaptation." : raceWeek ? "Race week. Stay fresh, not tired." : "Keep most running easy and controlled.",
      easyMileage,
    };
  });
}

export default function LydiardTrainingPlanApp() {
  const [form, setForm] = useState({
    goal: "5K",
    weeks: 12,
    currentMileage: 30,
    peakMileage: 45,
    runDays: 6,
    level: "Intermediate",
    maxIncrease: 10,
    cutbackEvery: 4,
    longRunPct: 24,
    injuryHistory: "",
    recentRace: "",
    goalRaceDate: "",
    notes: "Prioritize staying healthy. Cap intensity to 4 sessions per week.",
  });

  const plan = useMemo(() => generatePlan(form), [form]);

  function update(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function reset() {
    setForm({
      goal: "5K",
      weeks: 12,
      currentMileage: 30,
      peakMileage: 45,
      runDays: 6,
      level: "Intermediate",
      maxIncrease: 10,
      cutbackEvery: 4,
      longRunPct: 24,
      injuryHistory: "",
      recentRace: "",
      goalRaceDate: "",
      notes: "Prioritize staying healthy. Cap intensity to 4 sessions per week.",
    });
  }

  function downloadCsv() {
    const header = ["Week", "Phase", "Mileage", "Long Run", "Run Days", "Intensity Sessions", "Focus", "Workouts", "Note"];
    const rows = plan.map((w) => [
      w.week,
      w.phase,
      w.mileage,
      w.longRun,
      w.runDays,
      w.intensities,
      w.focus,
      w.workouts.join(" | "),
      w.note,
    ]);
    const csv = [header, ...rows].map((r) => r.map((x) => `"${String(x).replaceAll('"', '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "lydiard-5k-training-plan.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 text-slate-900">
      <div className="mx-auto max-w-7xl space-y-6">
        <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} className="rounded-3xl bg-white shadow-sm p-6 md:p-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Lydiard 5K Plan Builder</h1>
              <p className="mt-2 text-slate-600 max-w-2xl">Generate a health-first 5K plan based on aerobic base building, hill strength, controlled anaerobic work, coordination, and tapering.</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={reset}><RotateCcw className="mr-2 h-4 w-4" />Reset</Button>
              <Button onClick={downloadCsv}><Download className="mr-2 h-4 w-4" />Export CSV</Button>
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="rounded-3xl shadow-sm lg:col-span-1">
            <CardContent className="p-6 space-y-5">
              <div className="flex items-center gap-2">
                <HeartPulse className="h-5 w-5" />
                <h2 className="text-xl font-semibold">Runner Details</h2>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Weeks</Label>
                  <Input type="number" min="6" max="24" value={form.weeks} onChange={(e) => update("weeks", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Level</Label>
                  <Select value={form.level} onValueChange={(v) => update("level", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Beginner">Beginner</SelectItem>
                      <SelectItem value="Intermediate">Intermediate</SelectItem>
                      <SelectItem value="Advanced">Advanced</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Current mi/week</Label>
                  <Input type="number" min="5" value={form.currentMileage} onChange={(e) => update("currentMileage", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Peak mi/week</Label>
                  <Input type="number" min="10" value={form.peakMileage} onChange={(e) => update("peakMileage", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Run days/week</Label>
                  <Input type="number" min="3" max="7" value={form.runDays} onChange={(e) => update("runDays", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Max weekly increase %</Label>
                  <Input type="number" min="0" max="10" value={form.maxIncrease} onChange={(e) => update("maxIncrease", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Cutback every N weeks</Label>
                  <Input type="number" min="0" max="6" value={form.cutbackEvery} onChange={(e) => update("cutbackEvery", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Long run %</Label>
                  <Input type="number" min="18" max="30" value={form.longRunPct} onChange={(e) => update("longRunPct", e.target.value)} />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Goal race date</Label>
                <Input type="date" value={form.goalRaceDate} onChange={(e) => update("goalRaceDate", e.target.value)} />
              </div>

              <div className="space-y-2">
                <Label>Recent race / current fitness</Label>
                <Textarea placeholder="Example: 5K PR 18:45, current 20:10, coming off base training..." value={form.recentRace} onChange={(e) => update("recentRace", e.target.value)} />
              </div>

              <div className="space-y-2">
                <Label>Injury history / limits</Label>
                <Textarea placeholder="Example: shin splints last spring, avoid hard downhills..." value={form.injuryHistory} onChange={(e) => update("injuryHistory", e.target.value)} />
              </div>

              <div className="flex items-center space-x-2 rounded-2xl border p-3 bg-slate-50">
                <Checkbox checked disabled />
                <Label className="text-sm">Intensity capped at 4 sessions per week</Label>
              </div>
            </CardContent>
          </Card>

          <div className="lg:col-span-2 space-y-6">
            <Card className="rounded-3xl shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <CalendarDays className="h-5 w-5" />
                  <h2 className="text-xl font-semibold">Generated Plan</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                  {PHASES.map((p) => (
                    <div key={p.name} className="rounded-2xl border bg-white p-4">
                      <div className="font-semibold text-sm">{p.name}</div>
                      <div className="text-xs text-slate-600 mt-1">{p.focus}</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <div className="space-y-4">
              {plan.map((week) => (
                <motion.div key={week.week} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                  <Card className="rounded-3xl shadow-sm overflow-hidden">
                    <CardContent className="p-0">
                      <div className="p-5 md:p-6 bg-white border-b flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                        <div>
                          <h3 className="text-lg font-bold">Week {week.week}: {week.phase}</h3>
                          <p className="text-sm text-slate-600">{week.focus}</p>
                        </div>
                        <div className="flex flex-wrap gap-2 text-sm">
                          <span className="rounded-full bg-slate-100 px-3 py-1">{week.mileage} mi</span>
                          <span className="rounded-full bg-slate-100 px-3 py-1">Long run {week.longRun} mi</span>
                          <span className="rounded-full bg-slate-100 px-3 py-1">{week.intensities} intensity</span>
                        </div>
                      </div>
                      <div className="p-5 md:p-6 grid md:grid-cols-2 gap-4">
                        <div>
                          <h4 className="font-semibold mb-2">Key Sessions</h4>
                          <ul className="space-y-2 text-sm text-slate-700">
                            {week.workouts.map((w, idx) => <li key={idx} className="rounded-2xl bg-slate-50 p-3">{w}</li>)}
                          </ul>
                        </div>
                        <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-700">
                          <h4 className="font-semibold text-slate-900 mb-2">Health Guardrails</h4>
                          <p>{week.note}</p>
                          <p className="mt-2">Keep easy days truly easy. If soreness lasts more than 48 hours, replace the next hard session with easy running or rest.</p>
                          <p className="mt-2">Suggested structure: hard/easy rhythm, with no back-to-back hard days.</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
