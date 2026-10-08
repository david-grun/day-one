"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { AlertCircle, ArrowLeft, ArrowRight, ArrowUpRight, CalendarDays, Check, CheckCheck, CheckCircle2, ChevronRight, Circle, Clock3, FileCheck2, History, Home, Layers3, ListChecks, LoaderCircle, LogOut, Menu, Plus, RefreshCw, Search, ShieldCheck, SlidersHorizontal, Users, X, BarChart3, Ban, Pencil, MessageSquare, UserRound, Monitor, BriefcaseBusiness } from "lucide-react";
import type { ChangeImpact, Command, CommandResult, HireIntake, HireView, Readiness, Role, TaskStatus, TaskView, UserSummary, WorkspacePayload } from "@/lib/types";
import { selectTemplate } from "@/lib/templates";
import { Analytics } from "./analytics";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "./ui/dialog";

const teamLabels: Record<Role, string> = { HR: "HR", IT: "IT", MANAGER: "Hiring manager" };
const readinessLabels: Record<Readiness, string> = { preparing: "Preparing", awaiting_review: "Awaiting HR review", ready: "Ready for first day" };
const taskLabels: Record<TaskStatus, string> = { pending: "Pending", in_progress: "In progress", completed: "Completed" };
const departments = ["Engineering", "Sales", "Operations"];

type ModalState = { type: "create" } | { type: "task" | "requirements" | "assign" | "correction"; hireId: string; taskId: string } | { type: "review" | "edit" | "cancel"; hireId: string };
type Save = (command: Command) => Promise<CommandResult>;

export function displayDate(date: string) {
  return new Intl.DateTimeFormat("en-PH", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Manila" }).format(new Date(`${date}T00:00:00+08:00`));
}

function timestamp(value: string) {
  return new Intl.DateTimeFormat("en-PH", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: "Asia/Manila" }).format(new Date(value));
}

function dayOffset(date: string, offset: number) {
  const value = new Date(`${date}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() + offset);
  return value.toISOString().slice(0, 10);
}

function waiting(hire: HireView, now: string) {
  const episode = hire.reviewEpisodes.find((entry) => !entry.endedAt);
  if (!episode) return "Review timing unavailable";
  const hours = Math.max(0, (Date.parse(now) - Date.parse(episode.enteredAt)) / 3_600_000);
  return hours < 1 ? "Waiting less than an hour" : hours < 24 ? `Waiting ${Math.floor(hours)}h` : `Waiting ${Math.floor(hours / 24)}d ${Math.floor(hours % 24)}h`;
}

function initials(name: string) { return name.split(" ").map((part) => part[0]).slice(0, 2).join(""); }
function requiredProgress(hire: HireView) {
  const tasks = hire.tasks.filter((task) => task.required);
  return { complete: tasks.filter((task) => task.status === "completed").length, total: tasks.length };
}

function ReadinessBadge({ hire }: { hire: HireView }) {
  if (hire.lifecycle === "cancelled") return <span className="badge neutral"><Ban size={13} /> Cancelled</span>;
  const tone = hire.readiness === "ready" ? "success" : hire.readiness === "awaiting_review" ? "blue" : "neutral";
  const Icon = hire.readiness === "ready" ? ShieldCheck : hire.readiness === "awaiting_review" ? FileCheck2 : Circle;
  return <span className={`badge ${tone}`}><Icon size={13} />{readinessLabels[hire.readiness]}</span>;
}

function Progress({ hire }: { hire: HireView }) {
  const { complete, total } = requiredProgress(hire);
  return <div className="progress-cell"><span className="progress-track" aria-hidden="true"><span style={{ width: total ? `${complete / total * 100}%` : "0%" }} /></span><span>{total ? `${complete} / ${total}` : "No required tasks"}</span><span className="sr-only">required tasks completed</span></div>;
}

function TaskBadge({ task }: { task: TaskView }) {
  const Icon = task.status === "completed" ? CheckCircle2 : task.status === "in_progress" ? Clock3 : Circle;
  return <span className={`badge ${task.status === "completed" ? "success" : task.status === "in_progress" ? "blue" : "neutral"}`}><Icon size={13} />{taskLabels[task.status]}</span>;
}

function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return <div className="empty-state"><CheckCheck size={27} aria-hidden="true" /><strong>{title}</strong>{children && <p>{children}</p>}</div>;
}

function ErrorNotice({ error }: { error: string }) { return error ? <div className="notice error" role="alert"><AlertCircle size={17} /><span>{error}</span></div> : null; }

function PanelHeader({ title, children }: { title: string; children?: ReactNode }) {
  return <div className="panel-header"><div><h2>{title}</h2></div>{children}</div>;
}

export default function Workspace({ initialData, initialPath }: { initialData: WorkspacePayload; initialPath?: string[] }) {
  const [data, setData] = useState(initialData);
  const [modal, setModal] = useState<ModalState | null>(null);
  const [busy, setBusy] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [notice, setNotice] = useState<{ message: string; error: boolean; source?: "connection" } | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const menuButton = useRef<HTMLButtonElement | null>(null);
  const desktopNavigation = useRef<HTMLElement | null>(null);
  const trigger = useRef<HTMLElement | null>(null);
  const pathname = usePathname();
  const router = useRouter();
  const path = pathname?.split("/").filter(Boolean) ?? initialPath ?? [];
  const section = path[0] ?? "home";
  const hire = section === "hires" && path[1] ? data.hires.find((record) => record.id === path[1]) : null;
  const active = data.hires.filter((record) => record.lifecycle === "active");
  const mine = active.flatMap((record) => record.tasks).filter((task) => task.assigneeId === data.actor.id && task.status !== "completed");

  useEffect(() => {
    const narrowWindow = window.matchMedia("(max-width: 900px)");
    const closeOnDesktop = () => { if (!narrowWindow.matches) setSidebarOpen(false); };
    narrowWindow.addEventListener("change", closeOnDesktop);
    return () => narrowWindow.removeEventListener("change", closeOnDesktop);
  }, []);

  function openModal(value: ModalState) { trigger.current = document.activeElement as HTMLElement; setModal(value); }

  const refresh = useCallback(async (showNotice = true, signal?: AbortSignal) => {
    setRefreshing(true);
    try {
      const response = await fetch("/api/workspace", { cache: "no-store", signal });
      if (!response.ok) {
        if (response.status === 401) { router.replace("/login"); router.refresh(); return; }
        throw new Error("Unable to refresh the workspace. Your saved records are preserved.");
      }
      const updated = await response.json();
      if (signal?.aborted) return;
      setData(updated);
      if (showNotice) setNotice({ message: "Workspace is up to date.", error: false });
    } finally { setRefreshing(false); }
  }, [router]);

  useEffect(() => {
    if (modal || busy) return;
    const controller = new AbortController();
    let running = false;
    let consecutiveFailures = 0;
    let retryTimer: number | undefined;
    async function refreshVisibleWorkspace() {
      if (document.visibilityState !== "visible" || running) return;
      running = true;
      try {
        await refresh(false, controller.signal);
        if (!controller.signal.aborted) {
          consecutiveFailures = 0;
          setNotice((current) => current?.source === "connection" ? null : current);
        }
      } catch {
        if (!controller.signal.aborted) {
          consecutiveFailures += 1;
          if (consecutiveFailures === 1) retryTimer = window.setTimeout(refreshVisibleWorkspace, 5_000);
          else setNotice({ message: "Live updates paused. Use Refresh to reconnect.", error: true, source: "connection" });
        }
      } finally { running = false; }
    }
    const interval = window.setInterval(refreshVisibleWorkspace, 60_000);
    document.addEventListener("visibilitychange", refreshVisibleWorkspace);
    return () => {
      controller.abort();
      if (retryTimer) window.clearTimeout(retryTimer);
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", refreshVisibleWorkspace);
    };
  }, [busy, modal, refresh]);

  async function save(command: Command) {
    if (busy) throw new Error("A save is already in progress. Please wait.");
    setBusy(true);
    try {
      const response = await fetch("/api/commands", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(command) });
      const result = await response.json();
      if (!response.ok) {
        if (response.status === 401) { router.replace("/login"); router.refresh(); throw new Error("Your session ended. Please sign in again."); }
        throw new Error(`${result.error?.message || "This change could not be saved."}${result.requestId ? ` Reference: ${result.requestId}` : ""}`);
      }
      if (command.action !== "previewHireChange") {
        try { await refresh(false); setNotice({ message: result.message || "Changes saved.", error: false }); }
        catch (cause) { setNotice({ message: `Change saved. ${cause instanceof Error ? cause.message : "Refresh to see the updated record."}`, error: true }); }
      }
      return result as CommandResult;
    } catch (cause) {
      throw cause instanceof Error ? cause : new Error("The connection interrupted this request. Your input is retained; try again.");
    } finally { setBusy(false); }
  }

  async function signOut() {
    try {
      const response = await fetch("/api/auth/sign-out", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
      if (!response.ok) throw new Error("Unable to sign out. Please try again.");
      router.replace("/login");
      router.refresh();
    } catch (cause) { setNotice({ message: cause instanceof Error ? cause.message : "Unable to sign out.", error: true }); }
  }

  const navigation = [
    { href: "/", key: "home", label: "Overview", icon: Home },
    { href: "/hires", key: "hires", label: "Hires", icon: Users },
    { href: "/tasks", key: "tasks", label: data.actor.role === "HR" ? "Team tasks" : "My tasks", icon: ListChecks },
    ...(data.actor.role === "HR" ? [{ href: "/analytics", key: "analytics", label: "Analytics", icon: BarChart3 }] : []),
  ];
  const modalHire = modal && "hireId" in modal ? data.hires.find((record) => record.id === modal.hireId) : undefined;
  const modalTask = modal && "taskId" in modal ? modalHire?.tasks.find((task) => task.id === modal.taskId) : undefined;

  const sidebarContent = <>
        <Link href="/" className="brand" onClick={() => setSidebarOpen(false)}><span className="brand-mark"><Layers3 size={23} /></span><span>DayOne</span></Link>
        <div className="company-switch"><span className="company-avatar">H</span><div><strong>Harborline Studio</strong></div></div>
        <nav aria-label="Main navigation">{navigation.map(({ href, key, label, icon: Icon }) => <Link key={key} href={href} className={`nav-item ${section === key ? "active" : ""}`} aria-current={section === key ? "page" : undefined} onClick={() => setSidebarOpen(false)}><Icon size={19} /><span>{label}</span>{key === "tasks" && mine.length > 0 && <span className="nav-count">{mine.length}</span>}</Link>)}</nav>
        <div className="sidebar-bottom"><span className="demo-chip">DEMO WORKSPACE</span><div className="user-profile"><span className="avatar">{initials(data.actor.name)}</span><div><strong>{data.actor.name}</strong><span>{teamLabels[data.actor.role]}</span></div><button className="icon-button" onClick={signOut} aria-label="Sign out" title="Sign out"><LogOut size={17} /></button></div></div>
  </>;

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">Skip to main content</a>
      <aside ref={desktopNavigation} className="sidebar desktop-sidebar">{sidebarContent}</aside>
      <Dialog open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <DialogContent id="mobile-navigation" className="sidebar navigation-drawer" closeLabel="Close navigation" onCloseAutoFocus={(event) => {
          event.preventDefault();
          if (window.matchMedia("(max-width: 900px)").matches) menuButton.current?.focus();
          else desktopNavigation.current?.querySelector<HTMLElement>('a[aria-current="page"]')?.focus();
        }}>
          <DialogTitle className="sr-only">DayOne navigation</DialogTitle>
          <DialogDescription className="sr-only">Choose a page in your workspace.</DialogDescription>
          {sidebarContent}
        </DialogContent>
      </Dialog>
      <div className="main-shell">
        <header className="topbar"><div className="topbar-left"><button ref={menuButton} className="icon-button mobile-menu" onClick={() => setSidebarOpen(true)} aria-label="Open navigation" aria-expanded={sidebarOpen} aria-controls="mobile-navigation"><Menu size={21} /></button></div><div className="topbar-right"><span className="business-date"><CalendarDays size={15} />{displayDate(data.businessDate)}<span>Manila</span></span><button className="icon-button" aria-label="Refresh workspace" title="Refresh workspace" disabled={refreshing || busy} onClick={() => refresh().catch((cause) => setNotice({ message: cause.message, error: true }))}><RefreshCw size={17} className={refreshing ? "spin" : ""} /></button></div></header>
        <main id="main-content" className="main-content">
          {notice && <div className={`save-notice notice ${notice.error ? "error" : "success"}`} role={notice.error ? "alert" : "status"}><span>{notice.message}</span><button className="icon-button" aria-label="Dismiss message" onClick={() => setNotice(null)}><X size={17} /></button></div>}
          {section === "home" && <Overview data={data} onOpen={openModal} />}
          {section === "hires" && !path[1] && <HireList data={data} onCreate={() => openModal({ type: "create" })} />}
          {section === "hires" && path[1] && (hire ? <HireDetail hire={hire} data={data} onOpen={openModal} save={save} busy={busy} /> : <div className="panel"><Empty title="Hire unavailable">This record is unavailable for your account. <Link href="/hires">Return to hires</Link>.</Empty></div>)}
          {section === "tasks" && <TaskQueue data={data} onOpen={openModal} />}
          {section === "analytics" && (data.actor.role === "HR" ? <Analytics data={data} /> : <div className="panel"><Empty title="HR access required">Operational analytics is available to HR. Your assigned preparation is in My tasks.</Empty></div>)}
          {!["home", "hires", "tasks", "analytics"].includes(section) && <Empty title="Page unavailable"><Link href="/">Return to overview</Link></Empty>}
        </main>
      </div>
      <Dialog open={!!modal} onOpenChange={(open) => { if (!open && !busy) setModal(null); }}>
        <DialogContent className={modal?.type === "create" || modal?.type === "edit" || modal?.type === "review" ? "dialog-wide" : ""} onCloseAutoFocus={(event) => { event.preventDefault(); if (trigger.current?.isConnected) trigger.current.focus(); }} onEscapeKeyDown={(event) => { if (busy) event.preventDefault(); }} onPointerDownOutside={(event) => { if (busy) event.preventDefault(); }}>
          {modal?.type === "create" && <CreateHire data={data} save={save} busy={busy} onClose={() => setModal(null)} onCreated={(id) => { setModal(null); router.push(`/hires/${id}`); }} />}
          {modal?.type === "task" && modalHire && modalTask && <TaskForm hire={modalHire} task={modalTask} save={save} busy={busy} onClose={() => setModal(null)} />}
          {modal?.type === "requirements" && modalHire && modalTask && <RequirementsForm hire={modalHire} save={save} busy={busy} onClose={() => setModal(null)} />}
          {modal?.type === "assign" && modalTask && <AssignForm task={modalTask} users={data.users} save={save} busy={busy} onClose={() => setModal(null)} />}
          {modal?.type === "correction" && modalHire && modalTask && <CorrectionForm hire={modalHire} task={modalTask} save={save} busy={busy} onClose={() => setModal(null)} />}
          {modal?.type === "review" && modalHire && <ReviewForm hire={modalHire} actor={data.actor} save={save} busy={busy} onClose={() => setModal(null)} />}
          {modal?.type === "edit" && modalHire && <EditHire hire={modalHire} data={data} save={save} busy={busy} onClose={() => setModal(null)} />}
          {modal?.type === "cancel" && modalHire && <CancelForm hire={modalHire} save={save} busy={busy} onClose={() => setModal(null)} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Overview({ data, onOpen }: { data: WorkspacePayload; onOpen: (modal: ModalState) => void }) {
  const active = data.hires.filter((hire) => hire.lifecycle === "active");
  const attention = active.filter((hire) => hire.atRisk || hire.tasks.some((task) => task.required && task.status !== "completed" && (task.overdue || !task.assigneeId))).sort((a, b) => a.startDate.localeCompare(b.startDate));
  const reviews = active.filter((hire) => hire.readiness === "awaiting_review").sort((a, b) => (a.reviewEpisodes.find((episode) => !episode.endedAt)?.enteredAt ?? "").localeCompare(b.reviewEpisodes.find((episode) => !episode.endedAt)?.enteredAt ?? ""));
  const upcoming = active.filter((hire) => hire.startDate >= data.businessDate).sort((a, b) => a.startDate.localeCompare(b.startDate));
  const myTasks = active.flatMap((hire) => hire.tasks.filter((task) => task.assigneeId === data.actor.id && task.status !== "completed").map((task) => ({ hire, task }))).sort((a, b) => a.task.dueDate.localeCompare(b.task.dueDate));
  return <>
    <div className="page-heading"><div><h1>Overview</h1></div>{data.actor.role === "HR" && <button className="button primary" onClick={() => onOpen({ type: "create" })}><Plus size={18} />Create hire</button>}</div>
    <div className="summary-strip">
      <Link href="/hires" className="summary-item"><span>Active hires <Users size={17} /></span><strong>{active.length}</strong></Link>
      <Link href="/hires?readiness=preparing" className="summary-item"><span>Needs preparation <ListChecks size={17} /></span><strong>{active.filter((hire) => hire.readiness === "preparing").length}</strong></Link>
      <Link href="/hires?readiness=awaiting_review" className="summary-item"><span>Awaiting HR review <FileCheck2 size={17} /></span><strong>{reviews.length}</strong></Link>
      <Link href="/hires?readiness=ready" className="summary-item"><span>Ready for first day <ShieldCheck size={17} /></span><strong>{active.filter((hire) => hire.readiness === "ready").length}</strong></Link>
    </div>
    <div className="overview-grid">
      <div className="overview-column">
      <section className="panel attention-panel"><PanelHeader title="Needs attention"><span className="badge warning">{attention.length} {attention.length === 1 ? "hire" : "hires"}</span></PanelHeader>{attention.length ? <div className="attention-list">{attention.slice(0, 3).map((hire) => {
        const task = [...hire.tasks].filter((item) => item.required && item.status !== "completed").sort((a, b) => Number(b.overdue) - Number(a.overdue) || Number(b.blocked) - Number(a.blocked) || a.dueDate.localeCompare(b.dueDate))[0];
        return <Link className="attention-row" key={hire.id} href={`/hires/${hire.id}`}><span className="avatar">{initials(hire.name)}</span><div className="attention-body"><div><strong>{hire.name}</strong><span className={`badge ${hire.atRisk ? "warning" : "neutral"}`}>{hire.atRisk ? "At risk" : "Needs follow-up"}</span></div><p>{hire.readiness === "awaiting_review" ? `HR review · ${hire.reviewerName}` : task ? `${task.title} · ${task.assigneeName || "Unassigned"}` : "Check required preparation"}</p>{task?.blocker && <span className="blocker-inline">{task.blocker}</span>}<span className="attention-meta">Starts {displayDate(hire.startDate)}{task?.overdue && ` · Task overdue since ${displayDate(task.dueDate)}`}</span></div><ArrowUpRight size={18} /></Link>;
      })}</div> : <Empty title="No hires need attention" />}</section>
      <section className="panel upcoming-panel"><PanelHeader title="Upcoming starts"><Link className="text-link" href="/hires">View all<ArrowRight size={15} /></Link></PanelHeader>{upcoming.length ? <div className="table-scroll" role="region" tabIndex={0} aria-label="Upcoming starts table"><table><thead><tr><th>Employee</th><th>Start date</th><th>Required work</th><th>Readiness</th></tr></thead><tbody>{upcoming.slice(0, 3).map((hire) => <tr key={hire.id}><td><Link href={`/hires/${hire.id}`} className="person-link">{hire.name}</Link><span className="cell-subtitle">{hire.roleTitle} · {hire.department}</span></td><td className="nowrap">{displayDate(hire.startDate)}</td><td><Progress hire={hire} /></td><td><ReadinessBadge hire={hire} /></td></tr>)}</tbody></table></div> : <Empty title="No upcoming starts" />}</section>
      </div>
      <div className="overview-column">
      <section className="panel review-queue"><PanelHeader title="Awaiting HR review"><FileCheck2 className="muted" size={20} /></PanelHeader>{reviews.length ? <div className="review-list">{reviews.slice(0, 3).map((hire) => <div className="review-row" key={hire.id}><div className="review-person"><span className="avatar avatar-blue">{initials(hire.name)}</span><div><Link href={`/hires/${hire.id}`} className="person-link">{hire.name}</Link><span>{hire.reviewerName} · {waiting(hire, data.now)}</span></div></div>{data.actor.id === hire.reviewerId ? <button className="button small" onClick={() => onOpen({ type: "review", hireId: hire.id })}>Review<ArrowRight size={14} /></button> : <Link href={`/hires/${hire.id}`} className="text-link">View<ArrowUpRight size={14} /></Link>}</div>)}</div> : <Empty title="No reviews waiting" />}<Link href="/hires?readiness=awaiting_review" className="panel-link">View all<ArrowRight size={15} /></Link></section>
      <section className="panel my-work-panel"><PanelHeader title={data.actor.role === "HR" ? "My HR tasks" : "My preparation tasks"}><span className="badge neutral">{myTasks.length} open</span></PanelHeader>{myTasks.length ? <div className="my-task-list">{myTasks.slice(0, 3).map(({ hire, task }) => <div className="my-task-row" key={task.id}><span className={`task-marker ${task.blocked ? "warning" : task.status === "in_progress" ? "blue" : ""}`}>{task.blocked ? <Clock3 size={17} /> : <Circle size={17} />}</span><div><strong>{task.title}</strong><Link href={`/hires/${hire.id}`}>{hire.name}</Link><span className={task.overdue ? "deadline-overdue" : "muted"}>Due {displayDate(task.dueDate)}{task.overdue ? " · Overdue" : ""}</span>{task.blocker && <small className="blocker-inline">{task.blocker}</small>}</div><button className="icon-button" aria-label={`Open ${task.title} for ${hire.name}`} onClick={() => onOpen({ type: task.templateKey === "requirements" ? "requirements" : "task", hireId: hire.id, taskId: task.id })}><ArrowUpRight size={18} /></button></div>)}</div> : <Empty title="No open tasks assigned to you" />}<Link href="/tasks?owner=me" className="panel-link">View all<ArrowRight size={15} /></Link></section>
      </div>
    </div>
  </>;
}

function HireList({ data, onCreate }: { data: WorkspacePayload; onCreate: () => void }) {
  const params = useSearchParams();
  const query = params.get("query") ?? "";
  const department = params.get("department") ?? "";
  const readiness = params.get("readiness") ?? "";
  const lifecycle = params.get("lifecycle") ?? "active";
  function updateFilter(key: string, value: string) {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value); else next.delete(key);
    window.history.replaceState(null, "", `/hires${next.size ? `?${next}` : ""}`);
  }
  const setQuery = (value: string) => updateFilter("query", value);
  const setDepartment = (value: string) => updateFilter("department", value);
  const setReadiness = (value: string) => updateFilter("readiness", value);
  const setLifecycle = (value: string) => updateFilter("lifecycle", value);
  const detailLink = (id: string) => `/hires/${id}${params.size ? `?${params}` : ""}`;
  const hires = data.hires.filter((hire) => (lifecycle === "all" || hire.lifecycle === lifecycle) && (!department || hire.department === department) && (!readiness || hire.readiness === readiness) && (!query || `${hire.name} ${hire.roleTitle} ${hire.managerName}`.toLowerCase().includes(query.toLowerCase()))).sort((a, b) => a.startDate.localeCompare(b.startDate));
  const filtered = query || department || readiness || lifecycle !== "active";
  return <>
    <div className="page-heading"><div><h1>Hires</h1></div>{data.actor.role === "HR" && <button className="button primary" onClick={onCreate}><Plus size={18} />Create hire</button>}</div>
    <section className="panel hire-list-panel">
      <div className="list-toolbar"><label className="search-control"><Search size={18} /><span className="sr-only">Search hires</span><input placeholder="Search name, role, or manager" value={query} onChange={(event) => setQuery(event.target.value)} /></label><div className="filter-controls"><label><span className="sr-only">Hiring department</span><select value={department} onChange={(event) => setDepartment(event.target.value)}><option value="">All departments</option>{departments.map((value) => <option key={value}>{value}</option>)}</select></label><label><span className="sr-only">Readiness</span><select value={readiness} onChange={(event) => setReadiness(event.target.value)}><option value="">All readiness</option>{Object.entries(readinessLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label><span className="sr-only">Lifecycle</span><select value={lifecycle} onChange={(event) => setLifecycle(event.target.value)}><option value="active">Active hires</option><option value="cancelled">Cancelled hires</option><option value="all">All records</option></select></label></div></div>
      <div className="list-meta"><span>{hires.length} {hires.length === 1 ? "hire" : "hires"}</span>{filtered && <button className="text-button" onClick={() => window.history.replaceState(null, "", "/hires")}>Clear filters<X size={14} /></button>}</div>
      {hires.length ? <div className="table-scroll" role="region" tabIndex={0} aria-label="Hire preparation table"><table><thead><tr><th>Employee</th><th>Department</th><th>Start date</th><th>Required completion</th><th>Readiness</th><th>Coordinator</th><th><span className="sr-only">Open hire</span></th></tr></thead><tbody>{hires.map((hire) => <tr key={hire.id}><td><div className="table-person"><span className="avatar">{initials(hire.name)}</span><div><Link href={detailLink(hire.id)} className="person-link">{hire.name}</Link><span className="cell-subtitle">{hire.roleTitle}</span></div></div></td><td>{hire.department}</td><td className="nowrap">{displayDate(hire.startDate)}<span className="cell-subtitle">{hire.workArrangement}{hire.atRisk && hire.lifecycle === "active" ? " · At risk" : ""}</span></td><td><Progress hire={hire} /></td><td><ReadinessBadge hire={hire} /></td><td>{hire.coordinatorName}</td><td><Link href={detailLink(hire.id)} className="icon-button" aria-label={`Open ${hire.name}`}><ArrowUpRight size={17} /></Link></td></tr>)}</tbody></table></div> : <Empty title="No hires match">Try changing the search or clearing the filters.</Empty>}
    </section>
  </>;
}

function TaskQueue({ data, onOpen }: { data: WorkspacePayload; onOpen: (modal: ModalState) => void }) {
  const params = useSearchParams();
  const query = params.get("query") ?? "";
  const team = params.get("team") ?? "";
  const owner = params.get("owner") === "me" ? data.actor.id : params.get("owner") ?? "";
  const status = params.get("status") ?? "open";
  const overdue = params.get("overdue") === "true";
  function updateFilter(key: string, value: string) {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value); else next.delete(key);
    window.history.replaceState(null, "", `/tasks${next.size ? `?${next}` : ""}`);
  }
  const setQuery = (value: string) => updateFilter("query", value);
  const setTeam = (value: string) => updateFilter("team", value);
  const setOwner = (value: string) => updateFilter("owner", value);
  const setStatus = (value: string) => updateFilter("status", value);
  const setOverdue = (value: boolean) => updateFilter("overdue", value ? "true" : "");
  const detailLink = (id: string) => `/hires/${id}?origin=tasks${params.size ? `&${params}` : ""}`;
  const all = data.hires.filter((hire) => hire.lifecycle === "active").flatMap((hire) => hire.tasks.map((task) => ({ hire, task })));
  const rows = all.filter(({ hire, task }) => (!query || `${hire.name} ${task.title}`.toLowerCase().includes(query.toLowerCase())) && (!team || task.team === team) && (!owner || task.assigneeId === owner) && (status === "all" || (status === "open" ? task.status !== "completed" : task.status === status)) && (!overdue || task.overdue)).sort((a, b) => a.task.dueDate.localeCompare(b.task.dueDate));
  return <>
    <div className="page-heading"><div><h1>{data.actor.role === "HR" ? "Team tasks" : "My tasks"}</h1></div><button className={`button ${owner === data.actor.id ? "selected" : ""}`} onClick={() => setOwner(owner === data.actor.id ? "" : data.actor.id)}><UserRound size={17} />{owner === data.actor.id ? "Showing my tasks" : "Show my tasks"}</button></div>
    <section className="panel"><div className="list-toolbar"><label className="search-control"><Search size={18} /><span className="sr-only">Search tasks or hires</span><input placeholder="Search task or employee" value={query} onChange={(event) => setQuery(event.target.value)} /></label><div className="filter-controls"><label><span className="sr-only">Responsible team</span><select value={team} onChange={(event) => setTeam(event.target.value)}><option value="">All responsible teams</option>{Object.entries(teamLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label><span className="sr-only">Task owner</span><select value={owner} onChange={(event) => setOwner(event.target.value)}><option value="">All owners</option>{data.users.map((user) => <option value={user.id} key={user.id}>{user.name}</option>)}</select></label><label><span className="sr-only">Task status</span><select value={status} onChange={(event) => setStatus(event.target.value)}><option value="open">Open tasks</option><option value="all">All task states</option>{Object.entries(taskLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label></div></div>
      <div className="list-meta"><span>{rows.length} {rows.length === 1 ? "task" : "tasks"}</span><div className="inline-controls"><label className="checkbox-label"><input type="checkbox" checked={overdue} onChange={(event) => setOverdue(event.target.checked)} />Overdue only</label><button className="text-button" onClick={() => window.history.replaceState(null, "", "/tasks")}>Clear filters<X size={14} /></button></div></div>
      {rows.length ? <div className="table-scroll" role="region" tabIndex={0} aria-label="Team task queue"><table className="task-queue-table"><thead><tr><th>Task & employee</th><th>Responsible team</th><th>Owner</th><th>Due date</th><th>Progress</th><th>Action</th></tr></thead><tbody>{rows.map(({ hire, task }) => <tr key={task.id}><td><strong className="task-title">{task.title}</strong><Link href={detailLink(hire.id)} className="cell-subtitle link">{hire.name} · {hire.department}</Link>{task.blocker && <span className="blocker-inline">{task.blocker}</span>}<small className="task-required">{task.required ? "Required" : "Optional"}</small></td><td>{teamLabels[task.team]}</td><td>{task.assigneeName || "Unassigned"}{data.actor.role === "HR" && task.team !== "MANAGER" && <button className="text-button cell-subtitle" onClick={() => onOpen({ type: "assign", hireId: hire.id, taskId: task.id })}>Reassign</button>}</td><td className="nowrap"><span className={task.overdue ? "deadline-overdue" : ""}>{displayDate(task.dueDate)}</span>{task.overdue && <span className="cell-subtitle deadline-overdue">Overdue</span>}</td><td><TaskBadge task={task} />{task.blocked && <span className="cell-subtitle"><span className="badge warning">Blocked</span></span>}</td><td>{task.assigneeId === data.actor.id ? <button className="button small" onClick={() => onOpen({ type: task.templateKey === "requirements" && task.status !== "completed" ? "requirements" : "task", hireId: hire.id, taskId: task.id })}>{task.status === "completed" ? "View evidence" : task.templateKey === "requirements" ? "Confirm needs" : "Update"}<ArrowRight size={14} /></button> : <Link href={detailLink(hire.id)} className="text-link">View hire<ArrowUpRight size={14} /></Link>}</td></tr>)}</tbody></table></div> : <Empty title="No matching tasks">Try clearing the filters.</Empty>}
    </section>
  </>;
}

function HireDetail({ hire, data, onOpen, save, busy }: { hire: HireView; data: WorkspacePayload; onOpen: (modal: ModalState) => void; save: Save; busy: boolean }) {
  const [view, setView] = useState("checklist");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const params = useSearchParams();
  const returnParams = new URLSearchParams(params.toString());
  const fromAnalytics = returnParams.get("origin") === "analytics";
  const fromTasks = returnParams.get("origin") === "tasks";
  returnParams.delete("origin");
  const returnHref = `${fromAnalytics ? "/analytics" : fromTasks ? "/tasks" : "/hires"}${returnParams.size ? `?${returnParams}` : ""}`;
  const progress = requiredProgress(hire);
  const currentApproval = hire.approvals.find((approval) => !approval.invalidatedAt && approval.preparationVersion === hire.preparationVersion);
  const cancelled = hire.lifecycle === "cancelled";

  async function addNote(event: FormEvent) {
    event.preventDefault(); setError("");
    try { await save({ action: "noteHire", hireId: hire.id, note }); setNote(""); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to add the note."); }
  }

  return <>
    <Link href={returnHref} className="back-link"><ArrowLeft size={16} />{fromAnalytics ? "Back to analytics" : fromTasks ? "Back to tasks" : "Back to hires"}</Link>
    <div className="page-heading hire-heading"><div className="hire-heading-person"><span className="avatar large-avatar">{initials(hire.name)}</span><div><div className="heading-inline"><h1>{hire.name}</h1>{hire.demo && <span className="badge neutral">Demo hire</span>}</div><p>{hire.roleTitle} <span>·</span> {hire.department}</p></div></div><div className="heading-actions">{data.actor.role === "HR" && !cancelled && <button className="button" onClick={() => onOpen({ type: "edit", hireId: hire.id })}><Pencil size={16} />Edit details</button>}{hire.readiness === "awaiting_review" && !cancelled && data.actor.id === hire.reviewerId && <button className="button primary" onClick={() => onOpen({ type: "review", hireId: hire.id })}><FileCheck2 size={17} />Review readiness</button>}</div></div>
    {hire.demoScenario && <details className="demo-scenario"><summary>Demo scenario</summary><p>{hire.demoScenario}</p></details>}
    {cancelled && <div className="notice neutral"><Ban size={18} /><span>Cancelled. Read-only record. Reason: {hire.cancellationReason}</span></div>}
    <section className="panel hire-summary"><div className="hire-facts"><div><span>First day</span><strong><CalendarDays size={16} />{displayDate(hire.startDate)}</strong><small>{hire.workArrangement}</small></div><div><span>Hiring manager</span><strong>{hire.managerName}</strong></div><div><span>HR coordinator</span><strong>{hire.coordinatorName}</strong><small>Reviewer: {hire.reviewerName}</small></div><div><span>Readiness</span><ReadinessBadge hire={hire} /><small>{currentApproval ? `Approved ${timestamp(currentApproval.approvedAt)}` : hire.readiness === "awaiting_review" ? waiting(hire, data.now) : null}</small></div></div><div className="required-summary"><div><strong>{progress.total ? `${progress.complete} of ${progress.total} required tasks complete` : "Checklist has no required tasks"}</strong><span>{progress.total ? `${Math.round(progress.complete / progress.total * 100)}%` : "Configuration warning"}</span></div><div className="progress-track"><span style={{ width: progress.total ? `${progress.complete / progress.total * 100}%` : "0%" }} /></div>{currentApproval && <p>Approved by {currentApproval.reviewerName}</p>}</div></section>
    <div className="section-switch" aria-label="Hire detail sections">{[{ key: "checklist", label: "Preparation checklist", icon: ListChecks }, { key: "review", label: "Readiness review", icon: ShieldCheck }, { key: "history", label: "Activity & notes", icon: History }].map(({ key, label, icon: Icon }) => <button key={key} aria-pressed={view === key} className={view === key ? "active" : ""} onClick={() => setView(key)}><Icon size={17} />{label}{key === "history" && <span>{hire.history.length}</span>}</button>)}</div>
    {view === "checklist" && <div className="detail-grid"><div className="checklist-column">{(["HR", "MANAGER", "IT"] as Role[]).map((team) => {
      const tasks = hire.tasks.filter((task) => task.team === team);
      const Icon = team === "HR" ? Users : team === "IT" ? Monitor : BriefcaseBusiness;
      return <section className="panel team-panel" key={team}><PanelHeader title={teamLabels[team]}><span className="team-completion"><Icon size={17} />{tasks.filter((task) => task.status === "completed").length}/{tasks.length} complete</span></PanelHeader><div>{tasks.map((task) => <div className={`checklist-task ${task.status === "completed" ? "is-complete" : ""}`} key={task.id}><span className={`task-marker ${task.status === "completed" ? "success" : task.status === "in_progress" ? "blue" : ""}`}>{task.status === "completed" ? <Check size={18} /> : task.status === "in_progress" ? <Clock3 size={18} /> : <Circle size={18} />}</span><div className="checklist-task-content"><div className="checklist-title"><strong>{task.title}</strong><span className="task-required">{task.required ? "Required" : "Optional"}</span></div><p className="task-context">{task.assigneeName || "Unassigned"}<span>·</span><span className={task.overdue ? "deadline-overdue" : ""}>Due {displayDate(task.dueDate)}{task.overdue ? " · Overdue" : ""}</span></p><div className="task-badges"><TaskBadge task={task} />{task.blocked && <span className="badge warning"><Clock3 size={13} />Blocked</span>}</div>{task.blocker && <p className="task-blocker"><AlertCircle size={15} />{task.blocker}</p>}<details className="task-evidence"><summary>{task.status === "completed" ? "Evidence & instructions" : "Instructions & dependencies"}<ChevronRight size={13} /></summary><p>{task.instructions}</p>{task.dependencies.length > 0 && <p><strong>Depends on:</strong> {task.dependencies.map((id) => hire.tasks.find((dependency) => dependency.id === id)?.title ?? "Unavailable prerequisite").join("; ")}</p>}{task.note && <div className="evidence-note">{task.note}</div>}{task.completedAt && <p className="completion-caption">Completed by {task.completedByName} · {timestamp(task.completedAt)} Manila</p>}</details></div><div className="task-actions">{!cancelled && task.assigneeId === data.actor.id && <button className={`button small ${task.status !== "completed" && !task.blocked ? "primary" : ""}`} onClick={() => onOpen({ type: task.templateKey === "requirements" && task.status !== "completed" ? "requirements" : "task", hireId: hire.id, taskId: task.id })}>{task.status === "completed" ? "Edit note" : task.templateKey === "requirements" ? "Confirm needs" : "Update"}</button>}{!cancelled && data.actor.role === "HR" && <><button className="text-button" onClick={() => onOpen({ type: "correction", hireId: hire.id, taskId: task.id })}>Request correction</button>{task.team !== "MANAGER" && <button className="text-button" onClick={() => onOpen({ type: "assign", hireId: hire.id, taskId: task.id })}>Reassign</button>}</>}</div></div>)}</div></section>;
    })}</div><aside className="detail-aside"><section className="panel requirements-card"><PanelHeader title="Confirmed requirements"><SlidersHorizontal size={19} /></PanelHeader>{hire.requirements?.confirmedAt ? <div className="requirements-summary"><dl><dt>Equipment</dt><dd>{hire.requirements.equipment}</dd><dt>Approved applications</dt><dd>{hire.requirements.applications.join(", ")}</dd><dt>Collection or delivery</dt><dd>{hire.requirements.deliveryContext}</dd><dt>Confirmed</dt><dd>{timestamp(hire.requirements.confirmedAt)} Manila</dd><dt>Work email</dt><dd>{hire.workEmail || "Not yet prepared"}</dd></dl></div> : <div className="side-empty"><Clock3 size={24} /><strong>Waiting on the manager</strong><p>IT preparation unlocks when equipment and access needs are confirmed.</p></div>}</section>{!cancelled && data.actor.role === "HR" && <button className="text-button cancel-hire-link" onClick={() => onOpen({ type: "cancel", hireId: hire.id })}><Ban size={15} />Cancel this hire</button>}</aside></div>}
    {view === "review" && <div className="detail-grid"><section className="panel review-detail"><PanelHeader title="Preparation review"><span className="badge neutral">Version {hire.preparationVersion}</span></PanelHeader><div className="review-checks">{hire.tasks.filter((task) => task.required).map((task) => <div key={task.id} className="review-check"><span className={task.status === "completed" ? "success-text" : "muted"}>{task.status === "completed" ? <CheckCircle2 size={19} /> : <Circle size={19} />}</span><div><strong>{task.title}</strong>{(task.note || task.status !== "completed") && <p>{task.note || task.blocker || task.instructions}</p>}<small>{teamLabels[task.team]} · {task.assigneeName}{task.completedAt ? ` · Completed ${timestamp(task.completedAt)}` : ` · ${taskLabels[task.status]}`}</small></div>{data.actor.role === "HR" && !cancelled && <button className="text-button" onClick={() => onOpen({ type: "correction", hireId: hire.id, taskId: task.id })}>Request correction</button>}</div>)}</div>{!cancelled && hire.readiness === "awaiting_review" && data.actor.id === hire.reviewerId ? <div className="review-bottom"><span><ShieldCheck size={18} />You are the assigned reviewer.</span><button className="button primary" onClick={() => onOpen({ type: "review", hireId: hire.id })}>Review & approve<ArrowRight size={16} /></button></div> : <div className="panel-footnote">{currentApproval ? `Approved by ${currentApproval.reviewerName} · ${timestamp(currentApproval.approvedAt)} Manila` : `Assigned reviewer: ${hire.reviewerName}. ${hire.readiness === "preparing" ? "Required work must be finished before approval." : "Only this reviewer can approve."}`}</div>}</section><section className="panel approval-history"><PanelHeader title="Approval history"><History size={19} /></PanelHeader>{hire.approvals.length ? <div className="approval-list">{hire.approvals.map((approval) => <div key={approval.id}><span className={`badge ${approval.invalidatedAt ? "warning" : "success"}`}>{approval.invalidatedAt ? "Invalidated" : "Approved"}</span><strong>{approval.reviewerName}</strong><p>Version {approval.preparationVersion} · {timestamp(approval.approvedAt)}</p>{approval.invalidatedAt && <p>Invalidated {timestamp(approval.invalidatedAt)}<br />{approval.reason}</p>}</div>)}</div> : <Empty title="No sign-off yet" />}</section></div>}
    {view === "history" && <div className="detail-grid"><section className="panel activity-panel"><PanelHeader title="Activity timeline"><span className="badge neutral">{hire.history.length} events</span></PanelHeader><ol className="activity-timeline">{[...hire.history].sort((a, b) => b.occurredAt.localeCompare(a.occurredAt)).map((event) => <li key={event.id}><span className="timeline-dot" /><div><strong>{event.actorName}</strong><time dateTime={event.occurredAt}>{timestamp(event.occurredAt)} Manila</time><p>{event.description}</p></div></li>)}</ol></section><section className="panel note-panel"><PanelHeader title="Coordination note"><MessageSquare size={19} /></PanelHeader>{cancelled ? <p className="panel-copy">This cancelled record is read-only.</p> : <form onSubmit={addNote} className="note-form"><label className="field">Add context<textarea value={note} onChange={(event) => setNote(event.target.value)} required maxLength={1000} rows={5} placeholder="Record an operational follow-up…" /></label><p className="field-hint">No passwords or personal documents.</p><ErrorNotice error={error} /><button className="button primary" disabled={busy || !note.trim()}>{busy ? <LoaderCircle className="spin" size={16} /> : <Plus size={16} />}Add note</button></form>}</section></div>}
  </>;
}

function FormHeading({ title, description }: { title: string; description: string }) {
  return <div className="form-heading"><DialogTitle>{title}</DialogTitle><DialogDescription>{description}</DialogDescription></div>;
}

function FormActions({ busy, onClose, label, disabled = false }: { busy: boolean; onClose: () => void; label: string; disabled?: boolean }) {
  return <div className="form-actions"><button className="button" type="button" disabled={busy} onClick={onClose}>Cancel</button><button type="submit" className="button primary" disabled={busy || disabled}>{busy && <LoaderCircle className="spin" size={16} />}{busy ? "Saving…" : label}</button></div>;
}

function IntakeFields({ value, onChange, users }: { value: HireIntake; onChange: (value: HireIntake) => void; users: UserSummary[] }) {
  const hr = users.filter((user) => user.role === "HR");
  const managers = users.filter((user) => user.role === "MANAGER");
  function change<K extends keyof HireIntake>(key: K, item: HireIntake[K]) { onChange({ ...value, [key]: item }); }
  return <div className="form-grid"><label className="field full-field">Employee name<input required minLength={2} maxLength={120} value={value.name} onChange={(event) => change("name", event.target.value)} autoComplete="off" placeholder="e.g. Avery Mendoza" /></label><label className="field">Role<select required value={value.roleTitle} onChange={(event) => change("roleTitle", event.target.value)}><option>Software Engineer</option><option>Sales Associate</option><option>Operations Associate</option></select></label><label className="field">Hiring department<select required value={value.department} onChange={(event) => change("department", event.target.value)}>{departments.map((department) => <option key={department}>{department}</option>)}</select></label><label className="field">Start date · Manila<input type="date" required value={value.startDate} onChange={(event) => change("startDate", event.target.value)} /></label><label className="field">Work arrangement<select value={value.workArrangement} onChange={(event) => change("workArrangement", event.target.value as HireIntake["workArrangement"])}><option>Onsite</option><option>Hybrid</option><option>Remote</option></select></label><label className="field full-field">Hiring manager<select required value={value.managerId} onChange={(event) => change("managerId", event.target.value)}>{managers.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}</select></label><label className="field">HR coordinator<select required value={value.coordinatorId} onChange={(event) => change("coordinatorId", event.target.value)}>{hr.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}</select></label><label className="field">HR reviewer<select required value={value.reviewerId} onChange={(event) => change("reviewerId", event.target.value)}>{hr.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}</select></label></div>;
}

function CreateHire({ data, save, busy, onClose, onCreated }: { data: WorkspacePayload; save: Save; busy: boolean; onClose: () => void; onCreated: (id: string) => void }) {
  const [intake, setIntake] = useState<HireIntake>({ name: "", roleTitle: "Software Engineer", department: "Engineering", startDate: dayOffset(data.businessDate, 7), workArrangement: "Hybrid", managerId: data.users.find((user) => user.role === "MANAGER")?.id ?? "", coordinatorId: data.actor.id, reviewerId: data.actor.id });
  const [idempotencyKey] = useState(() => crypto.randomUUID());
  const [error, setError] = useState("");
  const template = selectTemplate(intake.roleTitle);
  async function submit(event: FormEvent) {
    event.preventDefault(); setError("");
    try { const result = await save({ action: "createHire", idempotencyKey, intake }); if (result.hireId) onCreated(result.hireId); else throw new Error("Hire saved but the record ID is unavailable. Refresh the hire list before retrying."); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to create the hire."); }
  }
  return <><FormHeading title="Create a hire" description="A role-specific checklist will be created automatically." /><form onSubmit={submit}><div className="intake-layout"><div><IntakeFields value={intake} onChange={setIntake} users={data.users} /><label className="field intake-note">Coordination note <span className="optional-label">Optional</span><textarea value={intake.note ?? ""} onChange={(event) => setIntake({ ...intake, note: event.target.value })} rows={2} maxLength={1000} placeholder="Operational context only" /></label></div><aside className="template-preview"><h3>{template.name === "General" ? "Role-specific requirements" : template.name}</h3><p>{template.tasks.filter((task) => task.required).length} required · {template.tasks.filter((task) => !task.required).length} optional</p><div>{template.tasks.map((task) => <div className="preview-task" key={task.key}><span className="preview-team">{teamLabels[task.team]}</span><strong>{task.title}</strong><span>{intake.startDate ? displayDate(dayOffset(intake.startDate, task.offsetDays)) : `${Math.abs(task.offsetDays)} days before start`}{!task.required ? " · Optional" : ""}</span></div>)}</div><p className="field-hint">Demo template · calendar-day deadlines</p></aside></div><ErrorNotice error={error} /><FormActions busy={busy} onClose={onClose} label="Create hire" /></form></>;
}

function TaskForm({ hire, task, save, busy, onClose }: { hire: HireView; task: TaskView; save: Save; busy: boolean; onClose: () => void }) {
  const [status, setStatus] = useState<TaskStatus>(task.status);
  const [note, setNote] = useState(task.note ?? "");
  const [reopenReason, setReopenReason] = useState("");
  const [email, setEmail] = useState(hire.workEmail ?? "");
  const [error, setError] = useState("");
  const reopening = task.status === "completed" && status !== "completed";
  async function submit(event: FormEvent) {
    event.preventDefault(); setError("");
    try { await save({ action: "transitionTask", taskId: task.id, expectedVersion: task.version, status, ...(reopening ? { note: reopenReason } : status !== task.status || note !== (task.note ?? "") ? { note } : {}), ...(task.templateKey === "access" && status === "completed" && (email !== hire.workEmail || status !== task.status) ? { workEmail: email } : {}) }); onClose(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to update the task."); }
  }
  return <><FormHeading title={task.title} description={`${hire.name} · ${teamLabels[task.team]} · Due ${displayDate(task.dueDate)}`} /><form onSubmit={submit} className="stack-form"><p className="instruction-box">{task.instructions}</p>{task.blocked && <div className="notice warning"><Clock3 size={17} /><span>{task.blocker} Notes can still be saved.</span></div>}<label className="field">Progress<select value={status} onChange={(event) => setStatus(event.target.value as TaskStatus)}><option value="pending">Pending</option><option value="in_progress" disabled={task.blocked || task.templateKey === "requirements"}>In progress</option><option value="completed" disabled={task.blocked || (task.templateKey === "requirements" && task.status !== "completed")}>Completed</option></select></label>{task.templateKey === "access" && status === "completed" && <label className="field">Prepared work email<input type="email" required maxLength={254} value={email} onChange={(event) => setEmail(event.target.value)} placeholder="name@fictional-company.example" /><span className="field-hint">Enter the email prepared by IT.</span></label>}<label className="field">{reopening ? "Reason for reopening" : "Evidence or operational note"}{!reopening && !(task.templateKey === "access" && status === "completed") && <span className="optional-label">Optional</span>}<textarea required={reopening || (task.templateKey === "access" && status === "completed")} minLength={reopening ? 3 : undefined} maxLength={1000} rows={4} value={reopening ? reopenReason : note} onChange={(event) => reopening ? setReopenReason(event.target.value) : setNote(event.target.value)} placeholder={reopening ? "Explain what needs to be checked again" : "Confirm what was prepared. Do not enter passwords."} /></label>{reopening && <div className="notice warning"><AlertCircle size={17} /><span>Reopening required work invalidates HR approval and reopens completed dependent tasks.</span></div>}<>{task.status === "completed" && task.required && !reopening && (note !== (task.note ?? "") || (task.templateKey === "access" && email !== hire.workEmail)) && <div className="notice warning">Changing completion evidence returns this preparation to HR review. General coordination notes in Activity & notes preserve sign-off.</div>}</><ErrorNotice error={error} /><FormActions busy={busy} onClose={onClose} label={reopening ? "Reopen with reason" : status === "completed" && task.status !== "completed" ? "Complete task" : "Save task update"} /></form></>;
}

function RequirementsForm({ hire, save, busy, onClose }: { hire: HireView; save: Save; busy: boolean; onClose: () => void }) {
  const [equipment, setEquipment] = useState(hire.requirements?.equipment ?? "");
  const [applications, setApplications] = useState(hire.requirements?.applications.join(", ") ?? "");
  const [delivery, setDelivery] = useState(hire.requirements?.deliveryContext ?? "");
  const [error, setError] = useState("");
  async function submit(event: FormEvent) {
    event.preventDefault(); setError("");
    try { await save({ action: "confirmRequirements", hireId: hire.id, expectedVersion: hire.version, equipment, applications: applications.split(",").map((value) => value.trim()).filter(Boolean), deliveryContext: delivery }); onClose(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to confirm requirements."); }
  }
  return <><FormHeading title="Confirm equipment & access needs" description={`${hire.name} · ${hire.roleTitle} · ${hire.workArrangement}`} /><form onSubmit={submit} className="stack-form"><div className="notice blue"><Monitor size={18} /><span>Confirming these needs unlocks IT preparation.</span></div><label className="field">Required equipment<textarea required minLength={3} maxLength={500} value={equipment} onChange={(event) => setEquipment(event.target.value)} rows={2} placeholder="e.g. Development laptop and external monitor" /></label><label className="field">Approved applications<input required value={applications} maxLength={1000} onChange={(event) => setApplications(event.target.value)} placeholder="e.g. GitHub, Microsoft 365, Teams" /><span className="field-hint">Separate names with commas. No credentials.</span></label><label className="field">Collection or delivery arrangement<textarea required minLength={3} maxLength={500} rows={3} value={delivery} onChange={(event) => setDelivery(event.target.value)} placeholder="Explain where equipment is handed over and how the hire will join." /></label><ErrorNotice error={error} /><FormActions busy={busy} onClose={onClose} label="Confirm requirements" /></form></>;
}

function AssignForm({ task, users, save, busy, onClose }: { task: TaskView; users: UserSummary[]; save: Save; busy: boolean; onClose: () => void }) {
  const candidates = users.filter((user) => user.role === task.team);
  const [assignee, setAssignee] = useState(task.assigneeId ?? candidates[0]?.id ?? "");
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  async function submit(event: FormEvent) {
    event.preventDefault(); setError("");
    try { await save({ action: "reassignTask", taskId: task.id, expectedVersion: task.version, assigneeId: assignee, reason }); onClose(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to reassign the task."); }
  }
  return <><FormHeading title="Reassign task" description={task.title} /><form className="stack-form" onSubmit={submit}><div className="instruction-box">Current owner: <strong>{task.assigneeName || "Unassigned"}</strong></div><label className="field">New owner<select required value={assignee} onChange={(event) => setAssignee(event.target.value)}>{candidates.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}</select></label><label className="field">Reason<textarea required minLength={3} maxLength={1000} rows={3} value={reason} onChange={(event) => setReason(event.target.value)} /></label><ErrorNotice error={error} /><FormActions busy={busy} onClose={onClose} label="Confirm reassignment" disabled={assignee === task.assigneeId} /></form></>;
}

function CorrectionForm({ hire, task, save, busy, onClose }: { hire: HireView; task: TaskView; save: Save; busy: boolean; onClose: () => void }) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const affected = new Set([task.id]);
  let changed = true;
  while (changed) { changed = false; for (const item of hire.tasks) if (!affected.has(item.id) && item.dependencies.some((id) => affected.has(id))) { affected.add(item.id); changed = true; } }
  const completed = hire.tasks.filter((item) => affected.has(item.id) && item.status === "completed");
  async function submit(event: FormEvent) {
    event.preventDefault(); setError("");
    try { await save({ action: "requestCorrection", hireId: hire.id, taskId: task.id, expectedVersion: hire.version, reason }); onClose(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to request correction."); }
  }
  return <><FormHeading title="Request correction" description={`${hire.name} · ${task.title}`} /><form className="stack-form" onSubmit={submit}><div className="notice warning"><AlertCircle size={18} /><div><strong>The task returns to its owner.</strong><p>{task.required ? "Current HR sign-off is invalidated. Completed dependent work must be checked again." : "This optional task does not affect final readiness unless required work depends on it."}</p></div></div>{completed.length > 0 && <div className="impact-preview"><strong>Completed work that will reopen</strong><ul>{completed.map((item) => <li key={item.id}>{item.title}</li>)}</ul></div>}<label className="field">What needs to be corrected?<textarea required minLength={3} maxLength={1000} rows={4} value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Give the owner enough detail to resolve the issue." /></label><ErrorNotice error={error} /><FormActions busy={busy} onClose={onClose} label="Request correction" /></form></>;
}

function ReviewForm({ hire, actor, save, busy, onClose }: { hire: HireView; actor: UserSummary; save: Save; busy: boolean; onClose: () => void }) {
  const [error, setError] = useState("");
  const progress = requiredProgress(hire);
  const allowed = hire.lifecycle === "active" && hire.readiness === "awaiting_review" && progress.total > 0 && progress.complete === progress.total && actor.id === hire.reviewerId && actor.role === "HR";
  async function submit(event: FormEvent) {
    event.preventDefault(); setError("");
    try { await save({ action: "approveHire", hireId: hire.id, expectedVersion: hire.version, expectedPreparationVersion: hire.preparationVersion }); onClose(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to approve readiness."); }
  }
  return <><FormHeading title="Approve readiness" description={`${hire.name} · ${hire.roleTitle} · Starts ${displayDate(hire.startDate)}`} /><form onSubmit={submit}><div className="review-dialog-summary"><span className="badge success"><CheckCheck size={14} />{progress.complete}/{progress.total} required tasks complete</span><span>Preparation version {hire.preparationVersion}</span></div><div className="review-dialog-tasks">{hire.tasks.filter((task) => task.required).map((task) => <div className="review-check" key={task.id}><span className={task.status === "completed" ? "success-text" : "muted"}>{task.status === "completed" ? <CheckCircle2 size={18} /> : <Circle size={18} />}</span><div><strong>{task.title}</strong>{task.note && <p>{task.note}</p>}<small>{teamLabels[task.team]} · {task.completedByName || task.assigneeName}{task.completedAt ? ` · ${timestamp(task.completedAt)} Manila` : " · Incomplete"}</small></div></div>)}</div>{hire.requirements?.confirmedAt && <div className="review-requirements"><strong>Manager-confirmed requirements</strong><p>{hire.requirements.equipment}</p><p>Access: {hire.requirements.applications.join(", ")}</p><p>{hire.requirements.deliveryContext}</p><p>Work email: {hire.workEmail || "Not recorded"}</p></div>}<OptionalReview hire={hire} /><div className="approval-statement"><ShieldCheck size={20} /><p>Confirm that the required preparation is ready for the first day.</p></div>{!allowed && <div className="notice warning">Approval requires completed preparation and the assigned reviewer: {hire.reviewerName}.</div>}<ErrorNotice error={error} /><FormActions busy={busy} onClose={onClose} label="Approve readiness" disabled={!allowed} /></form></>;
}

function OptionalReview({ hire }: { hire: HireView }) {
  const tasks = hire.tasks.filter((task) => !task.required);
  if (!tasks.length) return null;
  return <div className="review-requirements"><strong>Optional preparation · does not block approval</strong>{tasks.map((task) => <p key={task.id}>{task.title} · {taskLabels[task.status]} · {task.assigneeName}{task.note ? ` · ${task.note}` : ""}</p>)}</div>;
}

function EditHire({ hire, data, save, busy, onClose }: { hire: HireView; data: WorkspacePayload; save: Save; busy: boolean; onClose: () => void }) {
  const initial: HireIntake = { name: hire.name, roleTitle: hire.roleTitle, department: hire.department, startDate: hire.startDate, workArrangement: hire.workArrangement, managerId: hire.managerId, coordinatorId: hire.coordinatorId, reviewerId: hire.reviewerId };
  const [intake, setIntake] = useState(initial);
  const [reason, setReason] = useState("");
  const [impact, setImpact] = useState<ChangeImpact | null>(null);
  const [error, setError] = useState("");
  const changes = Object.fromEntries(Object.entries(intake).filter(([key, value]) => value !== initial[key as keyof HireIntake])) as Partial<HireIntake>;
  const hasChanges = Object.keys(changes).length > 0;
  async function submit(event: FormEvent) {
    event.preventDefault(); setError("");
    try {
      if (!impact) { const result = await save({ action: "previewHireChange", hireId: hire.id, expectedVersion: hire.version, changes }); if (!result.impact) throw new Error("Change preview is unavailable. Please retry before saving."); setImpact(result.impact); }
      else { await save({ action: "updateHire", hireId: hire.id, expectedVersion: hire.version, changes, reason }); onClose(); }
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to update the hire."); }
  }
  return <><FormHeading title="Edit hire details" description="Preview changes before saving." /><form onSubmit={submit}><IntakeFields value={intake} onChange={(value) => { setIntake(value); setImpact(null); }} users={data.users} /><label className="field edit-reason">Reason for change<textarea required minLength={3} maxLength={1000} rows={2} value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Explain the correction or changed arrangements." /></label>{impact && <div className="impact-preview"><strong><AlertCircle size={17} />Change impact</strong><p>{impact.message}</p><p>{impact.invalidatesApproval ? "Current HR approval will be invalidated." : "Current approval is preserved."}{impact.changesDeadlines ? " Incomplete task deadlines will be recalculated." : ""}</p>{impact.taskTitles.length > 0 && <><span>Affected tasks</span><ul>{impact.taskTitles.map((title, index) => <li key={`${title}-${index}`}>{title}</li>)}</ul></>}</div>}<ErrorNotice error={error} /><FormActions busy={busy} onClose={onClose} disabled={!hasChanges} label={impact ? "Confirm & save changes" : "Preview change impact"} /></form></>;
}

function CancelForm({ hire, save, busy, onClose }: { hire: HireView; save: Save; busy: boolean; onClose: () => void }) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  async function submit(event: FormEvent) {
    event.preventDefault(); setError("");
    try { await save({ action: "cancelHire", hireId: hire.id, expectedVersion: hire.version, reason }); onClose(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to cancel the hire."); }
  }
  return <><FormHeading title={`Cancel ${hire.name}'s onboarding?`} description="Removes the hire from active queues and analytics; retains history." /><form className="stack-form" onSubmit={submit}><div className="notice warning"><Ban size={18} /><span>The record becomes read-only. This cannot be undone in the app.</span></div><label className="field">Cancellation reason<textarea required minLength={3} maxLength={1000} rows={4} value={reason} onChange={(event) => setReason(event.target.value)} /></label><ErrorNotice error={error} /><FormActions busy={busy} onClose={onClose} label="Confirm cancellation" /></form></>;
}
