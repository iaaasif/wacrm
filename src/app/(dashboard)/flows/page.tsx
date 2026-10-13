"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Workflow,
  Plus,
  Trash2,
  Pencil,
  Loader2,
  MessageSquare,
  PlayCircle,
  PauseCircle,
  Archive,
  HelpCircle,
  UserPlus,
  FileText,
  Copy,
  Search,
  Building,
  Sparkles,
  History,
  Activity,
  Layers,
} from "lucide-react";

import { useTranslations } from "next-intl";
import { useCan } from "@/hooks/use-can";
import { Button } from "@/components/ui/button";
import { GatedButton } from "@/components/ui/gated-button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface FlowRow {
  id: string;
  name: string;
  description: string | null;
  status: "draft" | "active" | "archived";
  trigger_type: "keyword" | "first_inbound_message" | "manual";
  trigger_config: { keywords?: string[] } | Record<string, unknown>;
  execution_count: number;
  last_executed_at: string | null;
  created_at: string;
  updated_at: string;
}

const STATUS_LABELS = (t: ReturnType<typeof useTranslations>): Record<FlowRow["status"], string> => ({
  draft: t("statusDraft"),
  active: t("statusActive"),
  archived: t("statusArchived"),
});

const STATUS_COLORS: Record<FlowRow["status"], string> = {
  draft: "border-border bg-muted/60 text-muted-foreground",
  active: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
  archived: "border-border bg-muted/30 text-muted-foreground",
};

interface TemplateSummary {
  slug: string;
  name: string;
  description: string;
  icon: "MessageSquare" | "HelpCircle" | "UserPlus" | "Building";
  trigger_type: string;
  node_count: number;
}

const TEMPLATE_ICONS = {
  MessageSquare,
  HelpCircle,
  UserPlus,
  Building,
} as const;

export default function FlowsPage() {
  const router = useRouter();
  const canCreate = useCan("send-messages");
  const t = useTranslations("Flows.list");
  const tGate = useTranslations("GatedButton");

  const [flows, setFlows] = useState<FlowRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [templates, setTemplates] = useState<TemplateSummary[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "draft" | "archived">("all");
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [flowsRes, tmplRes] = await Promise.all([
          fetch("/api/flows"),
          fetch("/api/flows/templates"),
        ]);
        if (!flowsRes.ok) {
          throw new Error(`Failed to load flows: ${flowsRes.status}`);
        }
        const flowsJson = (await flowsRes.json()) as { flows: FlowRow[] };
        if (!cancelled) setFlows(flowsJson.flows ?? []);
        if (tmplRes.ok) {
          const tmplJson = (await tmplRes.json()) as {
            templates: TemplateSummary[];
          };
          if (!cancelled) setTemplates(tmplJson.templates ?? []);
        }
      } catch (err) {
        if (!cancelled) {
          console.error(err);
          toast.error(t("loadError"));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [t]);

  // Key metrics
  const metrics = useMemo(() => {
    const total = flows.length;
    const active = flows.filter((f) => f.status === "active").length;
    const totalRuns = flows.reduce((acc, f) => acc + (f.execution_count || 0), 0);
    return { total, active, totalRuns };
  }, [flows]);

  // Filtered flows
  const filteredFlows = useMemo(() => {
    return flows.filter((flow) => {
      if (statusFilter !== "all" && flow.status !== statusFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = flow.name.toLowerCase().includes(q);
        const matchDesc = (flow.description || "").toLowerCase().includes(q);
        const keywords = Array.isArray(flow.trigger_config?.keywords)
          ? (flow.trigger_config.keywords as string[]).join(" ").toLowerCase()
          : "";
        return matchName || matchDesc || keywords.includes(q);
      }
      return true;
    });
  }, [flows, statusFilter, searchQuery]);

  async function handleCreate() {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const res = await fetch("/api/flows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName.trim(),
          trigger_type: "keyword",
          trigger_config: { keywords: [] },
        }),
      });
      if (!res.ok) throw new Error(`Create failed: ${res.status}`);
      const json = (await res.json()) as { flow: FlowRow };
      setCreateOpen(false);
      setNewName("");
      router.push(`/flows/${json.flow.id}`);
    } catch (err) {
      console.error(err);
      toast.error(t("createError"));
    } finally {
      setCreating(false);
    }
  }

  async function handleUseTemplate(slug: string) {
    setCreating(true);
    try {
      const res = await fetch("/api/flows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ template_slug: slug }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error ?? t("cloneFailedStatus", { status: res.status }));
      }
      const json = (await res.json()) as { flow: FlowRow };
      setCreateOpen(false);
      router.push(`/flows/${json.flow.id}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : t("cloneError");
      toast.error(msg);
    } finally {
      setCreating(false);
    }
  }

  async function handleToggleStatus(flow: FlowRow) {
    if (togglingId) return;
    setTogglingId(flow.id);
    const nextStatus = flow.status === "active" ? "draft" : "active";
    try {
      const res = await fetch(`/api/flows/${flow.id}/activate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const issuesMsg = Array.isArray(data.issues)
          ? data.issues.map((i: { message: string }) => i.message).join(", ")
          : data.error || t("toggleError");
        throw new Error(issuesMsg);
      }
      setFlows((prev) =>
        prev.map((f) => (f.id === flow.id ? { ...f, status: nextStatus } : f)),
      );
      toast.success(nextStatus === "active" ? t("activateSuccess") : t("pauseSuccess"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("toggleError"));
    } finally {
      setTogglingId(null);
    }
  }

  async function handleDuplicate(flow: FlowRow) {
    if (duplicatingId) return;
    setDuplicatingId(flow.id);
    try {
      const res = await fetch(`/api/flows/${flow.id}/duplicate`, {
        method: "POST",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || t("duplicateError"));
      setFlows((prev) => [data.flow, ...prev]);
      toast.success(t("duplicateSuccess"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("duplicateError"));
    } finally {
      setDuplicatingId(null);
    }
  }

  async function handleDelete(flow: FlowRow) {
    const yes = window.confirm(t("deleteConfirm", { name: flow.name }));
    if (!yes) return;
    try {
      const res = await fetch(`/api/flows/${flow.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(`Delete failed: ${res.status}`);
      setFlows((prev) => prev.filter((f) => f.id !== flow.id));
      toast.success(t("deleteSuccess"));
    } catch (err) {
      console.error(err);
      toast.error(t("deleteError"));
    }
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Enterprise Header */}
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">{t("title")}</h1>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Automated Engine
            </span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("description")}
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            onClick={() => setCreateOpen(true)}
            className="border-border bg-card/60 hover:bg-muted text-foreground"
          >
            <Sparkles className="h-4 w-4 text-primary" />
            {t("quickTemplates")}
          </Button>
          <GatedButton
            canAct={canCreate}
            gateReason={tGate("reasons.createFlows")}
            onClick={() => {
              setNewName("");
              setCreateOpen(true);
            }}
          >
            <Plus className="h-4 w-4" />
            {t("newFlow")}
          </GatedButton>
        </div>
      </header>

      {/* Metrics Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="flex items-center gap-4 p-4 border-border bg-card/60 backdrop-blur-sm">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Layers className="size-5" />
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground">{t("totalFlows")}</p>
            <p className="text-2xl font-bold tracking-tight text-foreground">{metrics.total}</p>
          </div>
        </Card>

        <Card className="flex items-center gap-4 p-4 border-border bg-card/60 backdrop-blur-sm">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400">
            <Activity className="size-5" />
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground">{t("activeFlows")}</p>
            <p className="text-2xl font-bold tracking-tight text-emerald-400">{metrics.active}</p>
          </div>
        </Card>

        <Card className="flex items-center gap-4 p-4 border-border bg-card/60 backdrop-blur-sm">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400">
            <MessageSquare className="size-5" />
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground">{t("totalRuns")}</p>
            <p className="text-2xl font-bold tracking-tight text-foreground">{metrics.totalRuns.toLocaleString()}</p>
          </div>
        </Card>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t("searchPlaceholder")}
            className="pl-9 bg-card/60 border-border"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto p-1 rounded-lg bg-muted/40 border border-border">
          {(
            [
              { id: "all", label: `${t("filterAll")} (${metrics.total})` },
              { id: "active", label: `${t("statusActive")} (${metrics.active})` },
              { id: "draft", label: `${t("statusDraft")} (${flows.filter((f) => f.status === "draft").length})` },
              { id: "archived", label: `${t("statusArchived")} (${flows.filter((f) => f.status === "archived").length})` },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setStatusFilter(tab.id)}
              className={cn(
                "px-3 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap",
                statusFilter === tab.id
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Flows Grid */}
      {filteredFlows.length === 0 ? (
        flows.length === 0 ? (
          <EmptyState
            onCreate={() => setCreateOpen(true)}
            canCreate={canCreate}
            t={t}
          />
        ) : (
          <div className="flex flex-col items-center justify-center p-12 text-center rounded-xl border border-dashed border-border bg-card/30">
            <Search className="size-8 text-muted-foreground mb-2" />
            <p className="text-sm font-medium text-foreground">No matching flows found</p>
            <p className="text-xs text-muted-foreground mt-1">Try clearing your search query or filter</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearchQuery("");
                setStatusFilter("all");
              }}
              className="mt-4"
            >
              Reset Filters
            </Button>
          </div>
        )
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredFlows.map((flow) => (
            <FlowCard
              key={flow.id}
              flow={flow}
              onEdit={() => router.push(`/flows/${flow.id}`)}
              onToggleStatus={() => handleToggleStatus(flow)}
              onDuplicate={() => handleDuplicate(flow)}
              onDelete={() => handleDelete(flow)}
              onViewRuns={() => router.push(`/flows/${flow.id}/runs`)}
              isToggling={togglingId === flow.id}
              isDuplicating={duplicatingId === flow.id}
              t={t}
            />
          ))}
        </div>
      )}

      {/* New Flow & Template Modal */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent
          className="sm:max-w-4xl w-[95vw] max-h-[88vh] flex flex-col p-0 overflow-hidden bg-popover text-popover-foreground border-border"
          style={{ maxWidth: "min(95vw, 56rem)", width: "min(95vw, 56rem)" }}
        >
          <DialogHeader className="px-6 py-5 border-b border-border bg-card/40 shrink-0">
            <div className="flex items-center gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Workflow className="size-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold">{t("createTitle")}</DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  {t("createDesc")}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {templates.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    {t("startTemplate")}
                  </p>
                  <span className="text-[11px] text-primary font-medium">1-Click Instant Deploy</span>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {templates.map((template) => {
                    const Icon = TEMPLATE_ICONS[template.icon] ?? FileText;
                    return (
                      <button
                        key={template.slug}
                        type="button"
                        onClick={() => handleUseTemplate(template.slug)}
                        disabled={creating}
                        className="group flex flex-col gap-2 rounded-xl border border-border bg-card/60 p-4 text-left transition-all hover:border-primary/50 hover:bg-card hover:shadow-md disabled:opacity-50"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary group-hover:scale-105 transition-transform">
                            <Icon className="h-4 w-4" />
                          </div>
                          <span className="text-[11px] font-medium text-muted-foreground rounded bg-muted/60 px-2 py-0.5">
                            {t("nodeCount", { count: template.node_count })}
                          </span>
                        </div>
                        <span className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">
                          {template.name}
                        </span>
                        <span className="text-xs leading-relaxed text-muted-foreground line-clamp-2">
                          {template.description}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="space-y-3 border-t border-border pt-4">
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                {t("startBlank")}
              </p>
              <div className="flex gap-2">
                <Input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder={t("placeholderName")}
                  className="bg-card/60 border-border"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleCreate();
                  }}
                />
                <Button
                  onClick={handleCreate}
                  disabled={!newName.trim() || creating}
                  className="shrink-0 font-semibold"
                >
                  {creating && <Loader2 className="h-4 w-4 animate-spin mr-1.5" />}
                  {t("createBlank")}
                </Button>
              </div>
            </div>
          </div>

          <DialogFooter className="px-6 py-3 border-t border-border bg-card/20 shrink-0">
            <Button
              variant="outline"
              onClick={() => setCreateOpen(false)}
              disabled={creating}
              size="sm"
            >
              {t("cancel")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function EmptyState({
  onCreate,
  canCreate,
  t,
}: {
  onCreate: () => void;
  canCreate: boolean;
  t: ReturnType<typeof useTranslations>;
}) {
  const tGate = useTranslations("GatedButton");
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card/40 px-6 py-16 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <Workflow className="h-7 w-7" />
      </div>
      <h2 className="mt-4 text-lg font-bold text-foreground">
        {t("emptyTitle")}
      </h2>
      <p className="mt-1 max-w-md text-sm text-muted-foreground">
        {t("emptyDesc")}
      </p>
      <GatedButton
        canAct={canCreate}
        gateReason={tGate("reasons.createFlows")}
        onClick={onCreate}
        className="mt-6"
      >
        <Plus className="h-4 w-4" />
        {t("createFirst")}
      </GatedButton>
    </div>
  );
}

function FlowCard({
  flow,
  onEdit,
  onToggleStatus,
  onDuplicate,
  onDelete,
  onViewRuns,
  isToggling,
  isDuplicating,
  t,
}: {
  flow: FlowRow;
  onEdit: () => void;
  onToggleStatus: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onViewRuns: () => void;
  isToggling: boolean;
  isDuplicating: boolean;
  t: ReturnType<typeof useTranslations>;
}) {
  const triggerSummary = describeTrigger(flow, t);
  const StatusIcon =
    flow.status === "active"
      ? PlayCircle
      : flow.status === "archived"
        ? Archive
        : PauseCircle;

  return (
    <div className="group flex flex-col rounded-xl border border-border bg-card/60 backdrop-blur-sm p-4.5 transition-all hover:border-primary/40 hover:shadow-lg">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary group-hover:scale-105 transition-transform">
            <Workflow className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <h3
              onClick={onEdit}
              className="truncate text-sm font-bold text-foreground hover:text-primary cursor-pointer transition-colors"
            >
              {flow.name}
            </h3>
            <span className="text-[11px] text-muted-foreground truncate block">
              {triggerSummary}
            </span>
          </div>
        </div>
        <Badge
          variant="outline"
          className={cn(
            "shrink-0 gap-1 text-[10px] font-semibold py-0.5",
            STATUS_COLORS[flow.status],
          )}
        >
          <StatusIcon className="h-3 w-3" />
          {STATUS_LABELS(t)[flow.status]}
        </Badge>
      </div>

      <p className="mt-3 line-clamp-2 text-xs leading-relaxed text-muted-foreground min-h-[2rem]">
        {flow.description || "No description provided. Click edit to configure nodes and triggers."}
      </p>

      {/* Metrics Row */}
      <div className="mt-4 flex items-center justify-between border-t border-border/60 pt-3 text-[11px] text-muted-foreground">
        <button
          type="button"
          onClick={onViewRuns}
          className="inline-flex items-center gap-1.5 hover:text-foreground transition-colors font-medium"
        >
          <History className="h-3.5 w-3.5 text-primary" />
          {t("viewRuns")} ({flow.execution_count || 0})
        </button>

        {flow.last_executed_at && (
          <span className="text-[10px] text-muted-foreground">
            Last run: {new Date(flow.last_executed_at).toLocaleDateString()}
          </span>
        )}
      </div>

      {/* Actions Toolbar */}
      <div className="mt-3 flex items-center justify-between border-t border-border/60 pt-3">
        <Button
          variant="outline"
          size="sm"
          onClick={onToggleStatus}
          disabled={isToggling}
          className={cn(
            "h-7 px-2.5 text-xs font-semibold gap-1.5",
            flow.status === "active"
              ? "border-amber-500/30 text-amber-300 hover:bg-amber-500/10"
              : "border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10",
          )}
        >
          {isToggling ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : flow.status === "active" ? (
            <PauseCircle className="h-3 w-3" />
          ) : (
            <PlayCircle className="h-3 w-3" />
          )}
          {flow.status === "active" ? "Pause" : "Activate"}
        </Button>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={onDuplicate}
            disabled={isDuplicating}
            title={t("duplicate")}
            className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
          >
            {isDuplicating ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={onEdit}
            title={t("edit")}
            className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={onDelete}
            title={t("delete")}
            className="h-7 w-7 p-0 text-red-400 hover:bg-red-500/10 hover:text-red-300"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function describeTrigger(flow: FlowRow, t: ReturnType<typeof useTranslations>): string {
  if (flow.trigger_type === "keyword") {
    const keywords = Array.isArray(flow.trigger_config?.keywords)
      ? (flow.trigger_config.keywords as string[])
      : [];
    if (keywords.length === 0) return t("triggerKeywordNone");
    return t("triggerKeyword", { keywords: keywords.join(", ") });
  }
  if (flow.trigger_type === "first_inbound_message") {
    return t("triggerFirstInbound");
  }
  return t("triggerManual");
}
