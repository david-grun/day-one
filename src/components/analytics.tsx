"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { cohortMetrics, filterCohort, TEAM_NAMES } from "../lib/analytics";
import { SNAPSHOT_TABLES, snapshotCsv, validatePowerBiUrl, type ReportingSnapshot } from "../lib/reporting";
import type { WorkspacePayload } from "../lib/types";

const panel = "panel analytics-panel";
const input = "analytics-input";
const action = "button";
const hours = (value: number | null) => value === null ? "N/A" : `${value.toLocaleString("en-PH", { maximumFractionDigits: 1 })} h`;
const percent = (value: number | null) => value === null ? "N/A" : `${(value * 100).toFixed(0)}%`;
const instant = (value: string) => new Intl.DateTimeFormat("en-PH", { timeZone: "Asia/Manila", dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
const businessDate = (value: string) => new Intl.DateTimeFormat("en-PH", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Manila" }).format(new Date(`${value}T00:00:00+08:00`));

function download(text: string, filename: string, type: string) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const anchor = document.createElement("a");
  anchor.href = url; anchor.download = filename; anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function Chart({ data, value, label, color = "#0067A5" }: { data: Record<string, string | number | null>[]; value: string; label: string; color?: string }) {
  if (!data.length) return <p className="py-8 text-sm text-[#56606B]">No records in this cohort.</p>;
  return <div className="mt-4 h-52 w-full min-w-0" role="group" aria-label={label}>
    <ResponsiveContainer width="100%" height="100%" minWidth={0}>
      <BarChart data={data} layout="vertical" margin={{ left: 6, right: 20, top: 8, bottom: 8 }} accessibilityLayer>
        <CartesianGrid stroke="#E2E4E7" horizontal={false} />
        <XAxis type="number" tick={{ fill: "#56606B", fontSize: 12 }} domain={value === "completion" ? [0, 100] : [0, "auto"]} allowDecimals={value !== "overdue"} />
        <YAxis type="category" dataKey="name" width={110} tick={{ fill: "#20242A", fontSize: 14 }} tickLine={false} axisLine={false} />
        <Tooltip isAnimationActive={false} cursor={{ fill: "#EAF4FA" }} />
        <Bar dataKey={value} name={label} fill={color} radius={[0, 3, 3, 0]} isAnimationActive={false} barSize={20} />
      </BarChart>
    </ResponsiveContainer>
  </div>;
}

export function Analytics({ data }: { data: WorkspacePayload }) {
  const params = useSearchParams();
  const tab = params.get("view") === "powerbi" ? "powerbi" : "operational";
  const department = params.get("department") ?? "";
  const startFrom = params.get("startFrom") ?? "";
  const startTo = params.get("startTo") ?? "";
  const [snapshot, setSnapshot] = useState<ReportingSnapshot | null>(null);
  const [exporting, setExporting] = useState(false);
  const [message, setMessage] = useState("");
  const report = useRef<HTMLDivElement>(null);
  const invalidRange = !!(startFrom && startTo && startFrom > startTo);
  const metrics = useMemo(() => cohortMetrics(filterCohort(data.hires, { department, startFrom, startTo }), data.now, data.businessDate), [data, department, startFrom, startTo]);
  const embed = validatePowerBiUrl(data.powerBi.url, data.powerBi.mode);
  const configurationError = data.powerBi.configurationError || embed.error;

  function updateFilters(values: Record<string, string>) {
    const next = new URLSearchParams(params.toString());
    for (const [key, value] of Object.entries(values)) if (value) next.set(key, value); else next.delete(key);
    next.delete("origin");
    window.history.replaceState(null, "", `/analytics${next.size ? `?${next}` : ""}`);
  }

  function hireLink(id: string) {
    const next = new URLSearchParams(params.toString());
    next.set("origin", "analytics");
    return `/hires/${id}?${next}`;
  }

  async function prepareExport() {
    setExporting(true); setMessage("");
    try {
      const response = await fetch("/api/reporting", { cache: "no-store" });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error?.message || "Could not prepare the snapshot.");
      setSnapshot(body as ReportingSnapshot);
      setMessage("Snapshot prepared. Each CSV below comes from the same capture; downloads include cancelled hires, which report measures exclude.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Snapshot export failed. Try again."); }
    finally { setExporting(false); }
  }

  async function fullScreen() {
    try { if (report.current?.requestFullscreen) await report.current.requestFullscreen(); else setMessage("Full screen is unavailable here. Use Open report."); }
    catch { setMessage("The browser did not allow full screen. Use Open report."); }
  }

  return <section className="analytics-workspace">
    <div className="page-heading"><div><span className="eyebrow">Readiness & insights</span><h1>Analytics</h1><p>Understand readiness and the work holding it back.</p></div></div>
    <div className="flex flex-wrap gap-2" role="group" aria-label="Analytics view">
      <button type="button" onClick={() => updateFilters({ view: "operational" })} aria-pressed={tab === "operational"} className={`${action} ${tab === "operational" ? "!border-[#20242A] !bg-[#20242A] !text-white" : ""}`}>Operational analytics</button>
      <button type="button" onClick={() => updateFilters({ view: "powerbi" })} aria-pressed={tab === "powerbi"} className={`${action} ${tab === "powerbi" ? "!border-[#20242A] !bg-[#20242A] !text-white" : ""}`}>Power BI report</button>
    </div>
    {tab === "operational" ? <>
      <div className={`${panel} flex flex-wrap items-end gap-4`}>
        <label className="grid gap-1.5 text-sm">Hiring department<select className={input} value={department} onChange={(event) => updateFilters({ department: event.target.value })}><option value="">All departments</option>{[...new Set(data.hires.map((hire) => hire.department))].sort().map((item) => <option key={item}>{item}</option>)}</select></label>
        <label className="grid gap-1.5 text-sm">Hire start date from<input className={input} type="date" value={startFrom} onChange={(event) => updateFilters({ startFrom: event.target.value })} /></label>
        <label className="grid gap-1.5 text-sm">Hire start date through<input className={input} type="date" value={startTo} onChange={(event) => updateFilters({ startTo: event.target.value })} /></label>
        <button className={action} type="button" onClick={() => updateFilters({ department: "", startFrom: "", startTo: "" })}>Clear filters</button>
        <p className="w-full text-sm text-[#56606B]">Active hires only · {metrics.hires.length} hires · captured {instant(data.now)} Manila time. All task and review metrics use the same hire start-date cohort.</p>
        {invalidRange && <p role="alert" className="w-full text-sm text-[#B42318]">The from date is later than the through date. Choose a valid range.</p>}
      </div>
      {!metrics.hires.length && <div className={panel}><h2 className="font-semibold">No hires match these filters</h2><p className="mt-1 text-sm text-[#56606B]">Adjust the department or hire start dates. Rates are N/A when their denominator is zero.</p></div>}
      <div className="analytics-grid grid sm:grid-cols-2 xl:grid-cols-4">
        {[{ label: "Ready for first day", value: percent(metrics.readinessRate), detail: `${metrics.ready.length} of ${metrics.hires.length} hires; requires HR sign-off` },
          { label: "At-risk hires", value: metrics.atRisk.length, detail: "Not ready; starts within 3 calendar days or already passed" },
          { label: "Awaiting HR review", value: metrics.awaiting.length, detail: `Average current wait ${hours(metrics.averageWaitingHours)}` },
          { label: "Overdue tasks", value: metrics.overdue, detail: `Deadlines before ${businessDate(data.businessDate)} in Manila` }].map((card) => <article className={panel} key={card.label}><h2 className="text-sm font-medium text-[#56606B]">{card.label}</h2><p className="mt-2 text-3xl font-semibold">{card.value}</p><p className="mt-2 text-sm text-[#56606B]">{card.detail}</p></article>)}
      </div>
      <div className="analytics-grid grid xl:grid-cols-2">
        <article className={panel}><h2 className="text-lg font-semibold">Overdue work by responsible team</h2><p className="mt-1 text-sm text-[#56606B]">Blocked tasks can also be overdue. This groups task ownership, rather than hire departments.</p><Chart data={metrics.byTeam} value="overdue" label="Overdue tasks" color="#B42318" />
          <div className="overflow-x-auto"><table className="w-full text-left text-sm"><caption className="sr-only">Overdue task counts by team</caption><thead><tr><th className="py-2">Team</th><th>Overdue</th><th>All tasks</th></tr></thead><tbody>{metrics.byTeam.map((team) => <tr className="border-t border-[#E2E4E7]" key={team.team}><th scope="row" className="py-2 font-normal">{team.name}</th><td>{team.overdue}</td><td>{team.tasks}</td></tr>)}</tbody></table></div>
        </article>
        <article className={panel}><h2 className="text-lg font-semibold">Required preparation by hiring department</h2><p className="mt-1 text-sm text-[#56606B]">Overall {percent(metrics.requiredCompletionRate)} · {metrics.requiredCompleted} of {metrics.required.length} required tasks. Task completion remains separate from readiness.</p><Chart data={metrics.byDepartment.map((item) => ({ name: item.department, completion: item.rate === null ? null : Math.round(item.rate * 100) }))} value="completion" label="Required completion (%)" />
          <div className="overflow-x-auto"><table className="w-full text-left text-sm"><caption className="sr-only">Required task completion by hiring department</caption><thead><tr><th className="py-2">Department</th><th>Complete / required</th><th>Rate</th></tr></thead><tbody>{metrics.byDepartment.map((item) => <tr className="border-t border-[#E2E4E7]" key={item.department}><th scope="row" className="py-2 font-normal">{item.department}</th><td>{item.completed} / {item.required}</td><td>{percent(item.rate)}</td></tr>)}</tbody></table></div>
        </article>
        <article className={panel}><h2 className="text-lg font-semibold">Completion duration by team</h2><p className="mt-1 text-sm text-[#56606B]">Elapsed time from task creation to completion, including waiting. This does not measure staff labor or productivity.</p><Chart data={metrics.byTeam} value="averageHours" label="Average elapsed hours" />
          <table className="mt-2 w-full text-left text-sm"><caption className="sr-only">Completion duration and valid completed task samples</caption><thead><tr><th className="py-2">Team</th><th>Average</th><th>Samples</th></tr></thead><tbody>{metrics.byTeam.map((item) => <tr className="border-t border-[#E2E4E7]" key={item.team}><th scope="row" className="py-2 font-normal">{item.name}</th><td>{hours(item.averageHours)}</td><td>{item.durationSamples}</td></tr>)}</tbody></table>
        </article>
        <article className={panel}><h2 className="text-lg font-semibold">HR review timing</h2><p className="mt-3 text-2xl font-semibold">{hours(metrics.averageSignoffHours)}</p><p className="mt-1 text-sm text-[#56606B]">Average from review entry to sign-off · {metrics.signoffs.length} approved review episodes in this hire cohort. Repeated reviews remain distinct.</p>
          <div className="mt-5 overflow-x-auto"><table className="w-full text-left text-sm"><caption className="mb-2 text-left font-medium">Current review queue</caption><thead><tr><th className="py-2">Hire</th><th>Reviewer</th><th>Waiting</th></tr></thead><tbody>{metrics.waiting.map((item) => <tr className="border-t border-[#E2E4E7]" key={item.hire.id}><th className="py-3 font-normal" scope="row"><Link className="text-[#0067A5] underline underline-offset-2" href={hireLink(item.hire.id)}>{item.hire.name}</Link></th><td>{item.hire.reviewerName}</td><td>{hours(item.hours)}</td></tr>)}</tbody></table>{!metrics.waiting.length && <p className="py-4 text-sm text-[#56606B]">No hires currently awaiting HR review.</p>}</div>
        </article>
      </div>
      <article className={panel}><h2 className="text-lg font-semibold">Where to intervene</h2><p className="mt-1 text-sm text-[#56606B]">Overdue or blocked work, ordered by deadline. Open a hire to see prerequisites, evidence, and permitted actions.</p>
        <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><caption className="sr-only">Bottleneck tasks in the selected hire cohort</caption><thead><tr><th className="py-3 pr-4">Hire / department</th><th className="pr-4">Task</th><th className="pr-4">Team / owner</th><th className="pr-4">Due date</th><th>Reason</th></tr></thead><tbody>{metrics.bottlenecks.map(({ hire, task, blocked, overdue }) => <tr className="border-t border-[#E2E4E7] align-top" key={task.id}><th scope="row" className="py-3 pr-4 font-normal"><Link href={hireLink(hire.id)} className="text-[#0067A5] underline underline-offset-2">{hire.name}</Link><span className="mt-1 block text-[#56606B]">{hire.department} · starts {businessDate(hire.startDate)}</span></th><td className="py-3 pr-4">{task.title}<span className="mt-1 block text-[#56606B]">{task.required ? "Required" : "Optional"}</span></td><td className="py-3 pr-4">{TEAM_NAMES[task.team]}<span className="mt-1 block text-[#56606B]">{task.assigneeName}</span></td><td className="py-3 pr-4 whitespace-nowrap">{businessDate(task.dueDate)}</td><td className="py-3">{overdue && <span className="block text-[#B42318]">Overdue</span>}{blocked && <span className="block text-[#855500]">{task.blocker || "Waiting for prerequisite completion"}</span>}</td></tr>)}</tbody></table>{!metrics.bottlenecks.length && <p className="py-5 text-sm text-[#56606B]">No overdue or blocked work in this cohort.</p>}</div>
      </article>
      <details className={panel}><summary className="cursor-pointer font-semibold">Metric definitions and limits</summary><ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-[#56606B]"><li>Ready: at least one required task, all required tasks completed, and final HR approval valid for the current preparation version. Optional tasks do not block readiness.</li><li>Readiness rate: ready active hires ÷ all active hires in the selected department/start-date cohort, including taskless hires in the denominator.</li><li>Required completion: completed required tasks ÷ required tasks. It is N/A when no required tasks exist.</li><li>Overdue: an incomplete task with a deadline before the current Manila business date; deadlines become overdue after that date ends.</li><li>Risk: an active hire without valid readiness whose start date is within the next three calendar days or has passed. This is a fictional-demo policy.</li><li>Review wait starts at the current review episode entry. Sign-off turnaround averages approved episode durations; missing or invalid timestamps are excluded and N/A means no valid samples.</li><li>These are observed workflow timings. They do not prove time savings, return on investment, historical readiness at start date, or practitioner validation.</li></ul></details>
    </> : <>
      <article className={panel}><h2 className="text-lg font-semibold">Power BI reporting snapshot</h2><p className="mt-2 text-sm text-[#56606B]">Power BI uses the exported database snapshot. App-side filters above do not control this iframe; use department and start-date slicers inside the report.</p>
        <p className="mt-2 text-sm">{data.powerBi.snapshotAt && Number.isFinite(Date.parse(data.powerBi.snapshotAt)) ? `Declared report source snapshot: ${instant(data.powerBi.snapshotAt)} Manila time. This metadata does not verify a cloud refresh.` : "Report source snapshot time has not been configured. Cloud report freshness is unverified."}</p>
        {configurationError && <p role="alert" className="mt-3 text-sm text-[#B42318]">{configurationError}</p>}
        {embed.url ? <><div className="mt-4 flex flex-wrap gap-2"><a className={action} href={embed.url} target="_blank" rel="noopener noreferrer">Open report in a new tab</a><button type="button" className={action} onClick={fullScreen}>Full screen</button></div><p className="mt-3 text-sm text-[#56606B]">{data.powerBi.mode === "public" ? "Public Publish to web report: anyone with its URL can access its underlying data. Public caching can delay changes." : "Secure Website or portal report: Microsoft sign-in, report permission, and the appropriate viewer license/capacity are required. Allow sign-in popups."} If the report is unavailable here, use Open report. Slicers, totals, and third-party accessibility require verification in the actual configured report.</p><div ref={report} className="mt-4 min-h-[620px] bg-white"><iframe className="h-[720px] w-full border-0" src={embed.url} title="DayOne employee onboarding Power BI report" allowFullScreen /></div></> : <div className="mt-4 rounded-lg bg-[#F6F5F2] p-5"><h3 className="font-semibold">A DayOne report has not been connected</h3><p className="mt-2 text-sm text-[#56606B]">The website integration is implemented. An actual report, an authorized Power BI service workspace, a permitted generated embed URL, and browser verification are still needed. Desktop authoring is free; service embedding depends on tenant settings and licensing.</p><ol className="mt-3 list-decimal space-y-1 pl-5 text-sm"><li>Export one snapshot below or run <code>npm run export</code>.</li><li>Build and reconcile the report using <code>bi/README.md</code> and <code>bi/measures.dax</code>.</li><li>Publish only after explicit authorization, then configure <code>POWER_BI_EMBED_URL</code> and <code>POWER_BI_EMBED_MODE</code>.</li><li>Refresh/re-publish the report and verify its slicers and totals inside Analytics.</li></ol></div>}
      </article>
      {data.actor.role === "HR" && <article className={panel}><h2 className="text-lg font-semibold">Export the report source</h2><p className="mt-2 text-sm text-[#56606B]">Downloads include all authorized records, including cancelled hires, with one capture time. Apply active lifecycle and cohort filters in Power BI.</p><button type="button" className={`${action} mt-4 disabled:cursor-wait disabled:opacity-60`} disabled={exporting} onClick={prepareExport}>{exporting ? "Preparing snapshot…" : "Prepare CSV snapshot"}</button>{snapshot && <div className="mt-4"><p className="text-sm">Captured {instant(snapshot.snapshotAt)} Manila time · {snapshot.tables.hires.length} hires · {snapshot.tables.tasks.length} tasks</p><div className="mt-3 flex flex-wrap gap-2">{SNAPSHOT_TABLES.map((table) => <button type="button" className={action} key={table} onClick={() => download(snapshotCsv(snapshot, table), `${table}.csv`, "text/csv;charset=utf-8")}>{table}.csv</button>)}<button type="button" className={action} onClick={() => download(JSON.stringify(snapshot, null, 2), "snapshot.json", "application/json")}>snapshot.json</button></div></div>}<p className="mt-3 text-sm text-[#56606B]">The command-line export writes all files to one directory for Desktop refresh. Refresh only after all files from the same capture are present. Local CSV changes do not refresh a published model automatically.</p></article>}
    </>}
    {message && <p className="rounded-lg border border-[#E2E4E7] bg-white p-3 text-sm" role="status">{message}</p>}
  </section>;
}
