import { useCallback, useEffect, useRef, useState } from "react";
import {
  BarChart3,
  BellRing,
  BriefcaseBusiness,
  CalendarDays,
  CalendarRange,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  ClipboardCopy,
  ClipboardList,
  Clock3,
  Command,
  Download,
  FileText,
  History,
  LayoutDashboard,
  Link2,
  ListChecks,
  LogOut,
  Menu,
  MessageSquare,
  Paperclip,
  Plus,
  ReceiptText,
  Repeat2,
  Search,
  Settings,
  Trash2,
  UserRound,
  Users,
  UsersRound,
  Video,
  X,
} from "lucide-react";
import {
  ActionMenu,
  Badge,
  BillingBadge,
  Button,
  ClientCard,
  DeadlineBadge,
  EmptyState,
  Modal,
  PageHeader,
  PriorityBadge,
  ProofLink,
  ReportSection,
  StatCard,
  StatusBadge,
  Table,
} from "./components";
import {
  CATEGORIES,
  initialClients,
  initialTasks,
  PRIORITIES,
  TASK_STATUSES,
} from "./data";
import {
  activityFromApi,
  billingFromApi,
  clientFromApi,
  clientToApi,
  createClient as createClientApi,
  createTask as createTaskApi,
  createTaskAttachment,
  deleteClient as deleteClientApi,
  deleteTask as deleteTaskApi,
  deleteTaskAttachment,
  downloadTaskAttachment,
  generateReport as generateReportApi,
  getActivityLogs,
  getBillings,
  getClients,
  getDailyLogs,
  getReports,
  getSettings,
  getTasks,
  getTaskAttachments,
  getTaskChecklists,
  getTaskComments,
  createTaskChecklist,
  createTaskComment,
  deleteTaskChecklist,
  deleteTaskComment,
  updateTaskChecklist,
  uploadTaskAttachment,
  getAssignableUsers,
  logFromApi,
  markTaskCompleted,
  taskFromApi,
  taskToApi,
  updateBilling as updateBillingApi,
  attachmentFromApi,
  reportFromApi,
  updateClient as updateClientApi,
  updateTask as updateTaskApi,
  generateRecurringTasks as generateRecurringTasksApi,
  updateSettings as updateSettingsApi,
  deleteNotification as deleteNotificationApi,
  generateNotifications as generateNotificationsApi,
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "./services/api";
import {
  getAttachmentPreviewUrl,
  optimizeAttachmentImageForUpload,
} from "./attachmentUtils";
import {
  deadlineState,
  formatDate,
  formatMoney,
  setWorkspaceCurrency,
  setWorkspaceDateFormat,
  todayDateString,
} from "./utils";
import LoginPage from "./LoginPage";
import MonthlyReportsPage from "./ReportsPage";
import TeamPage from "./TeamPage";
import ClientDetailPage from "./ClientDetailPage";
import RemindersPage from "./RemindersPage";
import CalendarPage from "./CalendarPage";
import GlobalSearch from "./GlobalSearch";
import { QuickAddMenu, QuickTaskForm } from "./QuickAdd";
import RecurringTasksPage from "./RecurringTasksPage";
import { nextRecurrenceDate } from "./recurrenceUtils";
import ActivityPage, { ActivityFeed } from "./ActivityPage";
import SettingsPage from "./SettingsPage";
import ClientPortalPage from "./ClientPortalPage";
import NotificationsPage, {
  NotificationBell,
  NotificationItem,
} from "./NotificationsPage";
import { getCurrentUser, logout, updateCurrentUser } from "./services/auth";

const STORAGE_KEY = "brahmanda-work-os-v2";
const TODAY = todayDateString();
const DEFAULT_SETTINGS = {
  agency_name: "Brahmanda Tech",
  legal_business_name: "Kittik Enterprise",
  contact_person: "Furba Gurung",
  agency_email: "brahmandatech@gmail.com",
  agency_phone: "9840006162",
  agency_address: "",
  pan_number: "123252867",
  agency_website: "",
  agency_notes: "",
  report_title: "Monthly Client Report",
  prepared_by: "Brahmanda Tech",
  report_footer_text: "Prepared by Brahmanda Tech",
  brand_color: "#002FA7",
  logo_url: "",
  default_report_note: "",
  currency: "NPR",
  default_task_priority: "Medium",
  default_report_status: "Draft",
  default_monthly_report_template: "Standard Monthly Client Report",
  date_format: "MMM d, yyyy",
};
const navigation = [
  { label: "Dashboard", icon: LayoutDashboard, group: "Workspace" },
  { label: "Clients", icon: Users, group: "Workspace" },
  { label: "Tasks", icon: ClipboardList, group: "Workspace" },
  { label: "Kanban Board", icon: BriefcaseBusiness, group: "Workspace" },
  { label: "Daily Logs", icon: CalendarDays, group: "Planning" },
  { label: "Reminders", icon: BellRing, group: "Planning" },
  { label: "Calendar", icon: CalendarRange, group: "Planning" },
  { label: "Recurring Tasks", icon: Repeat2, group: "Planning" },
  { label: "Notifications", icon: BellRing, group: "Operations" },
  { label: "Activity", icon: History, group: "Operations" },
  { label: "Reports", icon: BarChart3, group: "Operations" },
  { label: "Billing", icon: ReceiptText, group: "Operations" },
  { label: "Team", icon: UsersRound, group: "Administration" },
  { label: "Settings", icon: Settings, group: "Administration" },
];

function useWorkspace() {
  const [workspace, setWorkspace] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      const parsed = saved ? JSON.parse(saved) : {};
      return {
        clients: parsed.clients || initialClients,
        tasks: parsed.tasks || initialTasks,
        logs:
          parsed.logs ||
          (parsed.tasks || initialTasks).filter(
            (task) => task.status === "Completed",
          ),
        billings:
          parsed.billings ||
          (parsed.tasks || initialTasks).filter((task) => task.billable),
        reports: parsed.reports || [],
        activities: parsed.activities || [],
        settings: { ...DEFAULT_SETTINGS, ...(parsed.settings || {}) },
        users: parsed.users || [],
      };
    } catch {
      return {
        clients: initialClients,
        tasks: initialTasks,
        logs: [],
        billings: [],
        reports: [],
        activities: [],
        settings: DEFAULT_SETTINGS,
        users: [],
      };
    }
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isFallback, setIsFallback] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState("loading");

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(workspace));
  }, [workspace]);
  useEffect(() => {
    setWorkspaceCurrency(workspace.settings?.currency || "NPR");
    setWorkspaceDateFormat(workspace.settings?.date_format || "MMM d, yyyy");
  }, [workspace.settings?.currency, workspace.settings?.date_format]);

  const loadApiData = async () => {
    const [
      clients,
      taskRows,
      logs,
      billing,
      reports,
      activities,
      settings,
      users,
    ] = await Promise.all([
      getClients(),
      getTasks(),
      getDailyLogs(),
      getBillings(),
      getReports(),
      getActivityLogs({ limit: 200 }).catch(() => []),
      getSettings().catch(() => DEFAULT_SETTINGS),
      getAssignableUsers().catch(() => []),
    ]);
    const attachments = await Promise.all(
      taskRows.map(async (task) => [
        String(task.id),
        (await getTaskAttachments(task.id)).map(attachmentFromApi),
      ]),
    );
    const attachmentsByTask = Object.fromEntries(attachments);
    const next = {
      clients: clients.map(clientFromApi),
      tasks: taskRows.map((task) =>
        taskFromApi({
          ...task,
          attachments: attachmentsByTask[String(task.id)] || [],
        }),
      ),
      logs: logs.map(logFromApi),
      billings: (billing.items || []).map(billingFromApi),
      reports: reports.map(reportFromApi),
      activities: activities.map(activityFromApi),
      settings: { ...DEFAULT_SETTINGS, ...settings },
      users,
    };
    setWorkspace(next);
    setWorkspaceCurrency(next.settings.currency);
    setWorkspaceDateFormat(next.settings.date_format);
    setIsFallback(false);
    setConnectionStatus("connected");
    setError("");
    return next;
  };

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        await loadApiData();
      } catch (requestError) {
        if (!active) return;
        setIsFallback(true);
        setConnectionStatus("error");
        setError(
          `API unavailable. Using saved demo data. ${requestError.message}`,
        );
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => {
      active = false;
    };
  }, []);

  const saveTaskLocal = (task) =>
    setWorkspace((current) => {
      const exists = current.tasks.some((item) => item.id === task.id);
      const previous = current.tasks.find((item) => item.id === task.id);
      const completedAt =
        task.status === "Completed" ? previous?.completedAt || TODAY : "";
      const normalized = {
        ...task,
        amount: task.billable ? Number(task.amount || 0) : 0,
        completedAt,
        paymentStatus: task.billable
          ? task.paymentStatus || previous?.paymentStatus || "Unpaid"
          : undefined,
        invoiceStatus: task.billable
          ? task.invoiceStatus || previous?.invoiceStatus || "Not invoiced"
          : undefined,
      };
      const tasks = exists
        ? current.tasks.map((item) => (item.id === task.id ? normalized : item))
        : [
            { ...normalized, id: normalized.id || `task-${Date.now()}` },
            ...current.tasks,
          ];
      return {
        ...current,
        tasks,
        logs: tasks.filter((item) => item.status === "Completed"),
        billings: tasks.filter((item) => item.billable),
      };
    });

  const updateTaskLocal = (id, patch) =>
    setWorkspace((current) => {
      const tasks = current.tasks.map((task) => {
        if (task.id !== id) return task;
        const next = { ...task, ...patch };
        if (patch.status === "Completed" && !task.completedAt)
          next.completedAt = TODAY;
        if (patch.status && patch.status !== "Completed") next.completedAt = "";
        return next;
      });
      return {
        ...current,
        tasks,
        logs: tasks.filter((task) => task.status === "Completed"),
        billings: tasks.filter((task) => task.billable),
      };
    });

  const runWithFallback = async (apiAction, fallbackAction) => {
    if (isFallback) {
      fallbackAction();
      return;
    }
    setError("");
    try {
      await apiAction();
      await loadApiData();
    } catch (requestError) {
      setIsFallback(true);
      setConnectionStatus("error");
      setError(
        `API request failed. Change saved in demo mode only. ${requestError.message}`,
      );
      fallbackAction();
    }
  };

  const saveTask = async (task) =>
    runWithFallback(
      async () => {
        const exists = workspace.tasks.some((item) => item.id === task.id);
        const current = workspace.tasks.find((item) => item.id === task.id);
        const response = exists
          ? await updateTaskApi(task.id, taskToApi(task))
          : await createTaskApi(taskToApi(task));
        const taskId = exists ? task.id : String(response.id);
        const originalAttachments = current?.attachments || [];
        const submittedAttachments = task.attachments || [];

        for (const original of originalAttachments) {
          const submitted = submittedAttachments.find(
            (attachment) => attachment.id === original.id,
          );
          if (
            !submitted ||
            submitted.title !== original.title ||
            submitted.url !== original.url
          ) {
            await deleteTaskAttachment(original.id);
          }
        }

        for (const attachment of submittedAttachments) {
          const original = originalAttachments.find(
            (item) => item.id === attachment.id,
          );
          if (attachment.type === "file" || (attachment.id && !original)) {
            continue;
          }
          if (
            !original ||
            original.title !== attachment.title ||
            original.url !== attachment.url
          ) {
            await createTaskAttachment({
              task_id: Number(taskId),
              attachment_type: "link",
              title: attachment.title,
              url: attachment.url,
            });
          }
        }
      },
      () => saveTaskLocal(task),
    );

  const updateTask = async (id, patch) => {
    const current = workspace.tasks.find((task) => task.id === id);
    if (!current) return;
    await runWithFallback(
      async () => {
        if (patch.status === "Completed" && current.status !== "Completed") {
          await markTaskCompleted(id);
        } else if ("paymentStatus" in patch || "invoiceStatus" in patch) {
          await updateBillingApi(id, {
            payment_status: patch.paymentStatus,
            invoice_status: patch.invoiceStatus,
          });
        } else {
          await updateTaskApi(id, taskToApi({ ...current, ...patch }));
        }
      },
      () => updateTaskLocal(id, patch),
    );
  };

  const deleteTask = async (id) =>
    runWithFallback(
      () => deleteTaskApi(id),
      () =>
        setWorkspace((current) => ({
          ...current,
          tasks: current.tasks.filter((task) => task.id !== id),
          logs: current.logs.filter((log) => log.taskId !== id),
          billings: current.billings.filter((billing) => billing.id !== id),
        })),
    );

  const saveClientLocal = (client) =>
    setWorkspace((current) => {
      const exists = current.clients.some((item) => item.id === client.id);
      const normalized = { ...client, id: client.id || `client-${Date.now()}` };
      return {
        ...current,
        clients: exists
          ? current.clients.map((item) =>
              item.id === client.id ? normalized : item,
            )
          : [...current.clients, normalized],
      };
    });

  const saveClient = async (client) =>
    runWithFallback(
      async () => {
        const exists = workspace.clients.some((item) => item.id === client.id);
        if (exists) await updateClientApi(client.id, clientToApi(client));
        else await createClientApi(clientToApi(client));
      },
      () => saveClientLocal(client),
    );

  const deleteClient = async (id) =>
    runWithFallback(
      () => deleteClientApi(id),
      () =>
        setWorkspace((current) => ({
          ...current,
          clients: current.clients.filter((client) => client.id !== id),
          tasks: current.tasks.filter((task) => task.clientId !== id),
          logs: current.logs.filter((log) => log.clientId !== id),
          billings: current.billings.filter(
            (billing) => billing.clientId !== id,
          ),
        })),
    );

  const generateRecurringTasks = async () => {
    const generateLocal = () => {
      const dueTemplates = workspace.tasks.filter(
        (task) =>
          task.isRecurring &&
          task.nextOccurrenceDate &&
          task.nextOccurrenceDate <= TODAY &&
          (!task.recurrenceEndDate ||
            task.nextOccurrenceDate <= task.recurrenceEndDate),
      );
      if (!dueTemplates.length) return 0;
      setWorkspace((current) => {
        const generated = dueTemplates.map((template, index) => ({
          ...template,
          id: `task-${Date.now()}-${index}`,
          deadline: template.nextOccurrenceDate,
          reminderDate: "",
          reminderNote: "",
          isRecurring: false,
          recurrenceType: "",
          recurrenceInterval: 1,
          recurrenceEndDate: "",
          nextOccurrenceDate: "",
          recurringParentId: template.id,
          status: "New",
          proofLink: "",
          attachments: [],
          completedAt: "",
          paymentStatus: "Unpaid",
          invoiceStatus: "Not invoiced",
        }));
        const tasks = current.tasks.map((task) => {
          const template = dueTemplates.find((item) => item.id === task.id);
          if (!template) return task;
          const next = nextRecurrenceDate(
            template.nextOccurrenceDate,
            template.recurrenceType,
            template.recurrenceInterval,
          );
          const active =
            !template.recurrenceEndDate || next <= template.recurrenceEndDate;
          return {
            ...task,
            isRecurring: active,
            nextOccurrenceDate: active ? next : "",
          };
        });
        const allTasks = [...generated, ...tasks];
        return {
          ...current,
          tasks: allTasks,
          logs: allTasks.filter((task) => task.status === "Completed"),
          billings: allTasks.filter((task) => task.billable),
        };
      });
      return dueTemplates.length;
    };

    if (isFallback) return { generated_count: generateLocal() };
    setError("");
    try {
      const response = await generateRecurringTasksApi();
      await loadApiData();
      return response;
    } catch (requestError) {
      setIsFallback(true);
      setConnectionStatus("error");
      setError(
        `Recurring task generation failed. Generated in demo mode only. ${requestError.message}`,
      );
      return { generated_count: generateLocal() };
    }
  };

  const refreshActivities = async () => {
    if (isFallback) return workspace.activities || [];
    try {
      const rows = await getActivityLogs({ limit: 200 });
      const activities = rows.map(activityFromApi);
      setWorkspace((current) => ({ ...current, activities }));
      return activities;
    } catch {
      return workspace.activities || [];
    }
  };

  const saveSettings = async (settings) => {
    if (isFallback) {
      setWorkspace((current) => ({ ...current, settings }));
      setWorkspaceCurrency(settings.currency);
      setWorkspaceDateFormat(settings.date_format);
      return settings;
    }
    const saved = await updateSettingsApi(settings);
    setWorkspace((current) => ({ ...current, settings: saved }));
    setWorkspaceCurrency(saved.currency);
    setWorkspaceDateFormat(saved.date_format);
    await refreshActivities();
    return saved;
  };

  const resetWorkspace = () => {
    setIsFallback(true);
    setConnectionStatus("fallback");
    setError("Demo mode enabled. Data is stored in this browser only.");
    setWorkspace({
      clients: initialClients,
      tasks: initialTasks,
      logs: initialTasks.filter((task) => task.status === "Completed"),
      billings: initialTasks.filter((task) => task.billable),
      reports: [],
      activities: [],
      settings: DEFAULT_SETTINGS,
      users: [],
    });
    setWorkspaceCurrency(DEFAULT_SETTINGS.currency);
    setWorkspaceDateFormat(DEFAULT_SETTINGS.date_format);
  };

  return {
    ...workspace,
    loading,
    error,
    isFallback,
    connectionStatus,
    saveTask,
    updateTask,
    deleteTask,
    saveClient,
    deleteClient,
    generateRecurringTasks,
    refreshActivities,
    saveSettings,
    resetWorkspace,
  };
}

function Sidebar({
  activePage,
  setActivePage,
  open,
  setOpen,
  collapsed,
  settings,
}) {
  const initials = settings.agency_name
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const groups = [...new Set(navigation.map((item) => item.group))];
  return (
    <>
      {open && (
        <button
          className="fixed inset-0 z-30 bg-black/30 lg:hidden"
          onClick={() => setOpen(false)}
          aria-label="Close menu"
        />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex flex-col border-r border-line bg-surface transition-all duration-300 ease-out ${collapsed ? "w-20" : "w-64"} ${open ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0`}
      >
        <div className={`flex h-16 items-center border-b border-line ${collapsed ? "justify-center px-3" : "gap-3 px-4"}`}>
          <button
            className={`flex min-w-0 items-center ${collapsed ? "justify-center" : "gap-3"} truncate`}
            onClick={() => setActivePage("Dashboard")}
          >
            <span
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-white shadow-soft"
              style={{ backgroundColor: settings.brand_color }}
            >
              <Command size={18} />
            </span>
            {!collapsed && (
              <span className="truncate text-sm font-bold tracking-tight">
                {settings.agency_name}{" "}
                <span style={{ color: settings.brand_color }}>OS</span>
              </span>
            )}
          </button>
          <button
            className="ml-auto rounded-lg p-2 text-zinc-500 hover:bg-canvas lg:hidden"
            onClick={() => setOpen(false)}
            aria-label="Close menu"
          >
            <X size={20} />
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto px-2.5 py-5">
          <div className="space-y-6">
            {groups.map((group) => (
              <section key={group}>
                {!collapsed && (
                  <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-400">
                    {group}
                  </p>
                )}
                <div className="space-y-1">
                  {navigation
                    .filter((item) => item.group === group)
                    .map(({ label, icon: Icon }) => {
                      const isActive =
                        activePage === label ||
                        (activePage === "Client Detail" && label === "Clients");
                      return (
                        <div className="group relative" key={label}>
                          <button
                            type="button"
                            onClick={() => {
                              setActivePage(label);
                              setOpen(false);
                            }}
                            aria-label={collapsed ? label : undefined}
                            className={`relative flex min-h-10 w-full items-center ${collapsed ? "justify-center px-2" : "gap-3 px-3"} rounded-lg py-2 text-left text-sm transition duration-150 ${isActive ? "bg-blue text-white shadow-soft" : "text-zinc-600 hover:bg-zinc-100/80 hover:text-ink"}`}
                          >
                            {isActive && !collapsed && (
                              <span className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-white/80" />
                            )}
                            <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${isActive ? "bg-white/10" : "bg-transparent group-hover:bg-white"}`}>
                              <Icon size={16} strokeWidth={1.8} />
                            </span>
                            {!collapsed && (
                              <span className="font-medium">{label}</span>
                            )}
                          </button>
                          {collapsed && (
                            <span className="pointer-events-none absolute left-full top-1/2 z-50 ml-3 -translate-y-1/2 translate-x-1 whitespace-nowrap rounded-md bg-ink px-2.5 py-1.5 text-xs font-semibold text-white opacity-0 shadow-panel transition duration-150 group-hover:translate-x-0 group-hover:opacity-100">
                              {label}
                            </span>
                          )}
                        </div>
                      );
                    })}
                </div>
              </section>
            ))}
          </div>
        </nav>
        <div className="border-t border-line p-3">
          <div
            className={`flex items-center rounded-xl border border-line bg-zinc-50/70 ${collapsed ? "justify-center p-2" : "gap-3 p-3"}`}
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-ink text-xs font-bold text-white">
              {initials}
            </span>
            {!collapsed && (
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">
                  {settings.agency_name}
                </p>
                <p className="truncate text-xs text-zinc-500">
                  {settings.legal_business_name}
                </p>
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}

function Topbar({
  activePage,
  setOpen,
  onToggleCollapse,
  collapsed,
  onOpenSearch,
  quickAddOpen,
  setQuickAddOpen,
  quickAddActions,
  settings,
  user,
  onLogout,
  notifications,
  notificationsOpen,
  setNotificationsOpen,
  onOpenNotification,
  onReadAllNotifications,
  onViewNotifications,
}) {
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef(null);
  useEffect(() => {
    const close = (event) =>
      !profileRef.current?.contains(event.target) && setProfileOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);
  const initials = user.name
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-2 border-b border-line bg-white/90 px-3 backdrop-blur-xl sm:gap-3 md:px-6">
      <button
        className="mr-1 rounded-lg border border-line bg-white p-2 text-zinc-500 hover:border-zinc-400 lg:hidden"
        onClick={() => setOpen(true)}
        aria-label="Open menu"
      >
        <Menu size={22} />
      </button>
      <button
        className="hidden h-9 w-9 items-center justify-center rounded-lg border border-line bg-white text-zinc-500 transition hover:border-zinc-400 hover:text-ink lg:inline-flex"
        onClick={onToggleCollapse}
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
      </button>
      <div className="hidden min-w-0 flex-1 xl:block">
        <p className="truncate text-sm font-semibold">{activePage}</p>
        <p className="hidden truncate text-xs text-zinc-500 sm:block">
          {settings.agency_name} / Internal workspace
        </p>
      </div>
      <button
        className="group flex min-w-0 flex-1 items-center gap-3 rounded-xl border border-line bg-white px-3 py-2 text-left text-sm text-zinc-500 shadow-soft transition hover:border-blue/30 hover:text-zinc-700 xl:mx-5 xl:max-w-xl"
        onClick={onOpenSearch}
      >
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-zinc-100 text-zinc-500 transition group-hover:bg-blue/5 group-hover:text-blue">
          <Search size={14} />
        </span>
        <span className="truncate">Search clients, tasks, reports, proofs</span>
        <kbd className="ml-auto hidden rounded border border-line bg-white px-1.5 py-0.5 text-[10px] font-semibold sm:block">
          Ctrl K
        </kbd>
      </button>
      <div className="relative ml-2 sm:ml-3">
        <button
          className="button-primary hidden sm:inline-flex"
          onClick={() => setQuickAddOpen((value) => !value)}
        >
          <Plus size={15} />
          Quick Add
          <ChevronDown size={14} />
        </button>
        <button
          className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue text-white sm:hidden"
          onClick={() => setQuickAddOpen((value) => !value)}
          aria-label="Open Quick Add"
        >
          <Plus size={17} />
        </button>
        <QuickAddMenu
          open={quickAddOpen}
          onClose={() => setQuickAddOpen(false)}
          {...quickAddActions}
        />
      </div>
      <NotificationBell
        notifications={notifications}
        open={notificationsOpen}
        setOpen={setNotificationsOpen}
        onOpen={onOpenNotification}
        onReadAll={onReadAllNotifications}
        onViewAll={onViewNotifications}
      />
      <div className="relative ml-1" ref={profileRef}>
        <button
          className="flex h-10 items-center gap-2 rounded-xl border border-line bg-white p-1 pr-2 shadow-soft transition hover:border-zinc-300"
          onClick={() => setProfileOpen((value) => !value)}
          aria-label="Open profile menu"
          aria-expanded={profileOpen}
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-ink text-[10px] font-bold text-white">
            {initials}
          </span>
          <span className="hidden max-w-28 text-left lg:block">
            <span className="block truncate text-xs font-semibold">
              {user.name}
            </span>
            <span className="block text-[10px] capitalize text-zinc-500">
              {user.role}
            </span>
          </span>
          <ChevronDown size={13} className="hidden text-zinc-400 lg:block" />
        </button>
        {profileOpen && (
          <div className="absolute right-0 top-12 z-50 w-64 rounded-xl border border-line bg-white p-2 shadow-panel">
            <div className="border-b border-line px-3 py-3">
              <p className="truncate text-sm font-semibold">{user.name}</p>
              <p className="mt-0.5 truncate text-xs text-zinc-500">
                {user.email}
              </p>
              <Badge className="mt-2 capitalize" variant="info">
                {user.role}
              </Badge>
            </div>
            <button
              className="mt-1 flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-red-700 hover:bg-red-50"
              onClick={onLogout}
            >
              <LogOut size={15} />
              Log out
            </button>
          </div>
        )}
      </div>
    </header>
  );
}

function PageHeading({ number, title, description, action, onAction }) {
  return (
    <PageHeader
      number={number}
      title={title}
      description={description}
      actions={
        action ? (
          <Button onClick={onAction}>
            <Plus size={16} />
            {action}
          </Button>
        ) : null
      }
    />
  );
}

function Field({ label, children, className = "" }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-2 block text-sm font-semibold">{label}</span>
      {children}
    </label>
  );
}

const blankTask = (clientId = "") => ({
  id: "",
  clientId,
  assignedUserId: "",
  assignedUserName: "",
  title: "",
  description: "",
  category: "Design",
  priority: "Medium",
  deadline: TODAY,
  reminderDate: "",
  reminderNote: "",
  isRecurring: false,
  recurrenceType: "monthly",
  recurrenceInterval: 1,
  recurrenceEndDate: "",
  nextOccurrenceDate: "",
  recurringParentId: "",
  status: "New",
  proofLink: "",
  attachments: [],
  billable: false,
  amount: 0,
  completedAt: "",
  paymentStatus: "Unpaid",
  invoiceStatus: "Not invoiced",
});

function FormSection({ icon: Icon, title, description, children }) {
  return (
    <section className="overflow-hidden rounded-xl border border-line bg-white">
      <header className="flex items-start gap-3 border-b border-line bg-canvas/70 px-4 py-3.5">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-blue/10 bg-blue/5 text-blue">
          <Icon size={15} />
        </span>
        <div>
          <h3 className="text-sm font-semibold">{title}</h3>
          {description && (
            <p className="mt-0.5 text-xs leading-5 text-zinc-500">
              {description}
            </p>
          )}
        </div>
      </header>
      <div className="grid gap-4 p-4 sm:grid-cols-2">{children}</div>
    </section>
  );
}

function AttachmentImagePreview({ attachment }) {
  const previewUrl = getAttachmentPreviewUrl(attachment, "modal");
  if (!previewUrl) {
    return (
      <div className="flex h-28 items-center justify-center bg-zinc-50 text-xs font-medium text-zinc-400">
        Preview unavailable
      </div>
    );
  }
  return (
    <a
      href={previewUrl}
      target="_blank"
      rel="noreferrer"
      className="block"
    >
      <img
        className="h-28 w-full object-cover"
        src={previewUrl}
        alt={attachment.originalFilename || attachment.title}
        loading="lazy"
        decoding="async"
      />
    </a>
  );
}

function TaskForm({
  task,
  clients,
  users,
  onSave,
  onClose,
  onNotificationsRefresh,
}) {
  const [form, setForm] = useState(() => {
    const initial = task || blankTask(clients[0]?.id);
    const attachments = initial.attachments?.length
      ? initial.attachments
      : initial.proofLink
        ? [
            {
              id: "",
              type: "link",
              title: "Proof link",
              url: initial.proofLink,
            },
          ]
        : [];
    return { ...initial, attachments };
  });
  const [saving, setSaving] = useState(false);
  const [comments, setComments] = useState([]);
  const [checklist, setChecklist] = useState([]);
  const [commentText, setCommentText] = useState("");
  const [checklistTitle, setChecklistTitle] = useState("");
  const [collaborationError, setCollaborationError] = useState("");
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const [attachmentError, setAttachmentError] = useState("");
  const attachmentInputRef = useRef(null);
  useEffect(() => {
    if (!task?.id || String(task.id).startsWith("task-")) return;
    Promise.all([getTaskComments(task.id), getTaskChecklists(task.id)])
      .then(([commentRows, checklistRows]) => {
        setComments(commentRows);
        setChecklist(checklistRows);
      })
      .catch((error) => setCollaborationError(error.message));
  }, [task?.id]);
  const change = (key, value) =>
    setForm((current) => ({ ...current, [key]: value }));
  const addProof = () =>
    setForm((current) => ({
      ...current,
      attachments: [
        ...current.attachments,
        { id: "", type: "link", title: "", url: "" },
      ],
    }));
  const updateProof = (index, key, value) =>
    setForm((current) => ({
      ...current,
      attachments: current.attachments.map((attachment, attachmentIndex) =>
        attachmentIndex === index
          ? { ...attachment, [key]: value }
          : attachment,
      ),
    }));
  const removeProof = (index) =>
    setForm((current) => ({
      ...current,
      attachments: current.attachments.filter(
        (_, attachmentIndex) => attachmentIndex !== index,
      ),
    }));
  const uploadAttachment = async (file) => {
    if (!file || !task?.id || String(task.id).startsWith("task-")) {
      return;
    }
    const allowedExtensions = [
      "jpg",
      "jpeg",
      "png",
      "webp",
      "gif",
      "mp4",
      "mov",
      "webm",
      "pdf",
      "doc",
      "docx",
      "xls",
      "xlsx",
      "ppt",
      "pptx",
      "txt",
      "csv",
    ];
    const extension = file.name.split(".").pop()?.toLowerCase() || "";
    if (!allowedExtensions.includes(extension)) {
      setAttachmentError(
        "Upload an image, video, PDF, or supported document file.",
      );
      return;
    }
    setUploadingAttachment(true);
    setAttachmentError("");
    try {
      let uploadFile = file;
      if (["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
        try {
          uploadFile = await optimizeAttachmentImageForUpload(file);
        } catch {
          uploadFile = file;
        }
      }
      if (uploadFile.size > 25 * 1024 * 1024) {
        setAttachmentError(
          "The optimized attachment is still larger than 25MB.",
        );
        return;
      }
      const uploaded = attachmentFromApi(
        await uploadTaskAttachment(task.id, uploadFile),
      );
      setForm((current) => ({
        ...current,
        attachments: [
          ...current.attachments,
          { ...uploaded, uploadedThisSession: true },
        ],
      }));
      if (attachmentInputRef.current) attachmentInputRef.current.value = "";
    } catch (error) {
      setAttachmentError(error.message);
    } finally {
      setUploadingAttachment(false);
    }
  };
  const removeFileAttachment = async (index, attachment) => {
    setAttachmentError("");
    if (attachment.uploadedThisSession && attachment.id) {
      try {
        await deleteTaskAttachment(attachment.id);
      } catch (error) {
        setAttachmentError(error.message);
        return;
      }
    }
    removeProof(index);
  };
  const addComment = async () => {
    if (!commentText.trim()) return;
    try {
      await createTaskComment({
        task_id: Number(task.id),
        comment: commentText.trim(),
      });
      setComments(await getTaskComments(task.id));
      setCommentText("");
      await onNotificationsRefresh?.();
    } catch (error) {
      setCollaborationError(error.message);
    }
  };
  const removeComment = async (id) => {
    try {
      await deleteTaskComment(id);
      setComments((items) => items.filter((item) => item.id !== id));
    } catch (error) {
      setCollaborationError(error.message);
    }
  };
  const addChecklistItem = async () => {
    if (!checklistTitle.trim()) return;
    try {
      await createTaskChecklist({
        task_id: Number(task.id),
        title: checklistTitle.trim(),
      });
      setChecklist(await getTaskChecklists(task.id));
      setChecklistTitle("");
    } catch (error) {
      setCollaborationError(error.message);
    }
  };
  const toggleChecklistItem = async (item) => {
    try {
      await updateTaskChecklist(item.id, {
        title: item.title,
        is_completed: !Number(item.is_completed),
      });
      setChecklist((items) =>
        items.map((current) =>
          current.id === item.id
            ? { ...current, is_completed: Number(current.is_completed) ? 0 : 1 }
            : current,
        ),
      );
    } catch (error) {
      setCollaborationError(error.message);
    }
  };
  const removeChecklistItem = async (id) => {
    try {
      await deleteTaskChecklist(id);
      setChecklist((items) => items.filter((item) => item.id !== id));
    } catch (error) {
      setCollaborationError(error.message);
    }
  };
  const submit = async (event) => {
    event.preventDefault();
    const attachments = form.attachments.filter((attachment) =>
      attachment.type === "file"
        ? attachment.id && attachment.url
        : attachment.title.trim() && attachment.url.trim(),
    );
    setSaving(true);
    await onSave({
      ...form,
      assignedUserName:
        users.find((user) => String(user.id) === String(form.assignedUserId))
          ?.name || "",
      attachments,
      proofLink:
        attachments.find((attachment) => attachment.type !== "file")?.url || "",
    });
    setSaving(false);
    onClose();
  };
  return (
    <form onSubmit={submit}>
      <div className="space-y-4 p-5 sm:p-6">
        <FormSection icon={ClipboardList} title="Basic Info">
          <Field label="Task title" className="sm:col-span-2">
            <input
              className="field"
              value={form.title}
              onChange={(event) => change("title", event.target.value)}
              required
              placeholder="What needs to be done?"
            />
          </Field>
          <Field label="Category">
            <select
              className="field h-11 min-h-11 cursor-pointer rounded-xl border-zinc-200 bg-white px-3 py-2.5 font-medium text-zinc-700 hover:border-zinc-300 focus:border-blue/40 focus:ring-2 focus:ring-blue/10"
              value={form.category}
              onChange={(event) => change("category", event.target.value)}
            >
              {CATEGORIES.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </Field>
          <Field label="Priority">
            <select
              className="field"
              value={form.priority}
              onChange={(event) => change("priority", event.target.value)}
            >
              {PRIORITIES.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </Field>
          <Field label="Status">
            <select
              className="field"
              value={form.status}
              onChange={(event) => change("status", event.target.value)}
            >
              {TASK_STATUSES.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </Field>
        </FormSection>
        <FormSection icon={UserRound} title="Client & Assignment">
          <Field label="Client">
            <select
              className="field"
              value={form.clientId}
              onChange={(event) => change("clientId", event.target.value)}
              required
            >
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Assigned user">
            <select
              className="field"
              value={form.assignedUserId || ""}
              onChange={(event) => change("assignedUserId", event.target.value)}
            >
              <option value="">Unassigned</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name}
                </option>
              ))}
            </select>
          </Field>
        </FormSection>
        <FormSection icon={BellRing} title="Deadline & Reminder">
          <Field label="Deadline">
            <input
              className="field"
              type="date"
              value={form.deadline}
              onChange={(event) => change("deadline", event.target.value)}
            />
          </Field>
          <Field label="Reminder date">
            <input
              className="field"
              type="date"
              value={form.reminderDate || ""}
              onChange={(event) => change("reminderDate", event.target.value)}
            />
          </Field>
          <Field label="Reminder note" className="sm:col-span-2">
            <textarea
              className="field min-h-20 resize-y"
              value={form.reminderNote || ""}
              onChange={(event) => change("reminderNote", event.target.value)}
              placeholder="What needs attention on the reminder date?"
            />
          </Field>
        </FormSection>
        <section className="border border-line p-4">
          <label className="flex items-center gap-3 text-sm font-semibold">
            <input
              type="checkbox"
              checked={Boolean(form.isRecurring)}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  isRecurring: event.target.checked,
                  nextOccurrenceDate: event.target.checked
                    ? current.nextOccurrenceDate || current.deadline || TODAY
                    : current.nextOccurrenceDate,
                }))
              }
              className="h-4 w-4 accent-blue"
            />
            Recurring task
          </label>
          <p className="mt-1 text-xs text-zinc-500">
            Use this task as a template for repeated client work.
          </p>
          {form.isRecurring && (
            <div className="mt-4 grid gap-4 border-t border-line pt-4 sm:grid-cols-2">
              <Field label="Frequency">
                <select
                  className="field"
                  value={form.recurrenceType || "monthly"}
                  onChange={(event) =>
                    change("recurrenceType", event.target.value)
                  }
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </Field>
              <Field
                label={`Repeat every X ${form.recurrenceType === "daily" ? "days" : form.recurrenceType === "weekly" ? "weeks" : "months"}`}
              >
                <input
                  className="field"
                  type="number"
                  min="1"
                  value={form.recurrenceInterval || 1}
                  onChange={(event) =>
                    change("recurrenceInterval", event.target.value)
                  }
                  required
                />
              </Field>
              <Field label="End date (optional)">
                <input
                  className="field"
                  type="date"
                  value={form.recurrenceEndDate || ""}
                  onChange={(event) =>
                    change("recurrenceEndDate", event.target.value)
                  }
                />
              </Field>
              <Field label="Next occurrence date">
                <input
                  className="field"
                  type="date"
                  value={form.nextOccurrenceDate || ""}
                  onChange={(event) =>
                    change("nextOccurrenceDate", event.target.value)
                  }
                  required
                />
              </Field>
            </div>
          )}
        </section>
        <FormSection icon={CircleDollarSign} title="Billing">
          <label className="flex items-center gap-3 border border-line p-3 text-sm font-semibold sm:col-span-2">
            <input
              type="checkbox"
              checked={form.billable}
              onChange={(event) => change("billable", event.target.checked)}
              className="h-4 w-4 accent-blue"
            />
            This is extra billable work
          </label>
          {form.billable && (
            <Field label="Billable amount">
              <input
                className="field"
                type="number"
                min="0"
                value={form.amount}
                onChange={(event) => change("amount", event.target.value)}
                required
              />
            </Field>
          )}
        </FormSection>
        <FormSection
          icon={CheckCircle2}
          title="Proof Links"
          description="Google Drive, design, social post, or website links."
        >
          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-semibold">Proof links</h3>
              <p className="mt-1 text-xs text-zinc-500">
                Google Drive, design, social post, or website links.
              </p>
            </div>
            <button
              type="button"
              className="button-secondary px-3 py-2"
              onClick={addProof}
            >
              <Plus size={14} />
              Add Proof Link
            </button>
          </div>
          <div className="mt-4 space-y-3">
            {form.attachments.map((attachment, index) =>
              attachment.type === "file" ? null : (
              <div
                key={`${attachment.id}-${index}`}
                className="grid gap-3 border-t border-line pt-3 sm:grid-cols-[1fr_1.4fr_auto]"
              >
                <input
                  className="field"
                  value={attachment.title}
                  onChange={(event) =>
                    updateProof(index, "title", event.target.value)
                  }
                  placeholder="Proof title"
                  required
                />
                <input
                  className="field"
                  type="url"
                  value={attachment.url}
                  onChange={(event) =>
                    updateProof(index, "url", event.target.value)
                  }
                  placeholder="https://"
                  required
                />
                <button
                  type="button"
                  className="flex h-10 w-10 items-center justify-center border border-line text-zinc-500 hover:border-red-300 hover:text-red-700"
                  onClick={() => removeProof(index)}
                  aria-label="Remove proof link"
                >
                  <X size={16} />
                </button>
              </div>
              ),
            )}
            {!form.attachments.some(
              (attachment) => attachment.type !== "file",
            ) && (
              <p className="text-sm text-zinc-400">No proof links added.</p>
            )}
          </div>
        </FormSection>
        <FormSection
          icon={Paperclip}
          title="Upload Attachments"
          description="Upload images, videos, PDFs, or documents up to 25MB."
        >
          {task?.id && !String(task.id).startsWith("task-") ? (
            <>
              <div className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50 p-4 sm:col-span-2">
                <div>
                  <label className="block">
                    <span className="mb-2 block text-xs font-semibold text-zinc-600">
                      Choose a file
                    </span>
                    <input
                      ref={attachmentInputRef}
                      className="block w-full rounded-lg border border-zinc-200 bg-white text-sm text-zinc-600 file:mr-3 file:border-0 file:border-r file:border-zinc-200 file:bg-zinc-50 file:px-3 file:py-2.5 file:text-xs file:font-semibold file:text-zinc-700 hover:border-zinc-300"
                      type="file"
                      accept=".jpg,.jpeg,.png,.webp,.gif,.mp4,.mov,.webm,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv"
                      disabled={uploadingAttachment}
                      onChange={(event) => {
                        setAttachmentError("");
                        const file = event.target.files?.[0];
                        if (file) uploadAttachment(file);
                      }}
                    />
                  </label>
                  {uploadingAttachment && (
                    <div className="mt-3 flex items-center gap-2 text-xs font-medium text-zinc-500">
                      <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-zinc-200 border-t-blue" />
                      Uploading attachment…
                    </div>
                  )}
                </div>
                {attachmentError && (
                  <p className="mt-3 text-xs font-medium text-red-700">
                    {attachmentError}
                  </p>
                )}
              </div>
              <div className="grid gap-3 sm:col-span-2 sm:grid-cols-2">
                {form.attachments.map((attachment, index) =>
                  attachment.type !== "file" ? null : (
                    <article
                      key={attachment.id || `${attachment.url}-${index}`}
                      className="overflow-hidden rounded-xl border border-zinc-200 bg-white"
                    >
                      {attachment.isImage ? (
                        <AttachmentImagePreview attachment={attachment} />
                      ) : String(attachment.mimeType || "").startsWith(
                          "video/",
                        ) ? (
                        <video
                          className="h-28 w-full bg-zinc-950 object-contain"
                          src={getAttachmentPreviewUrl(attachment, "modal")}
                          controls
                          preload="metadata"
                        >
                          Your browser does not support video playback.
                        </video>
                      ) : (
                        <a
                          href={getAttachmentPreviewUrl(attachment, "modal")}
                          target="_blank"
                          rel="noreferrer"
                          className="flex h-28 items-center justify-center bg-zinc-50 text-zinc-400 hover:text-blue"
                        >
                          <FileText size={28} />
                        </a>
                      )}
                      <div className="flex items-center gap-3 p-3">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-semibold text-zinc-800">
                            {attachment.originalFilename || attachment.title}
                          </p>
                          <p className="mt-0.5 text-[10px] text-zinc-400">
                            {(attachment.originalFilename || attachment.title)
                              .split(".")
                              .pop()
                              ?.toUpperCase() || "FILE"}
                            {attachment.fileSize
                              ? ` · ${(attachment.fileSize / 1024 / 1024).toFixed(2)} MB`
                              : ""}
                          </p>
                        </div>
                        <a
                          className="text-xs font-semibold text-blue hover:underline"
                          href={getAttachmentPreviewUrl(attachment, "download")}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Open
                        </a>
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 text-xs font-semibold text-zinc-600 hover:text-blue"
                          onClick={async () => {
                            try {
                              await downloadTaskAttachment(
                                attachment.id,
                                attachment.originalFilename ||
                                  attachment.title ||
                                  "attachment",
                              );
                            } catch (error) {
                              setAttachmentError(error.message);
                            }
                          }}
                        >
                          <Download size={13} />
                          Download
                        </button>
                        <button
                          type="button"
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 hover:bg-red-50 hover:text-red-700"
                          onClick={() =>
                            removeFileAttachment(index, attachment)
                          }
                          aria-label={`Remove ${attachment.originalFilename || attachment.title}`}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </article>
                  ),
                )}
                {!form.attachments.some(
                  (attachment) => attachment.type === "file",
                ) && (
                  <p className="text-sm text-zinc-400">
                    No uploaded attachments.
                  </p>
                )}
              </div>
            </>
          ) : (
            <p className="text-sm text-zinc-500 sm:col-span-2">
              Save the task first, then reopen it to upload files.
            </p>
          )}
        </FormSection>
        <FormSection icon={FileText} title="Notes">
          <Field label="Task notes" className="sm:col-span-2">
            <textarea
              className="field min-h-28 resize-y"
              value={form.description}
              onChange={(event) => change("description", event.target.value)}
              placeholder="Context, deliverables, and completion requirements"
            />
          </Field>
        </FormSection>
        {task?.id && !String(task.id).startsWith("task-") && (
          <div className="grid gap-4 lg:grid-cols-2">
            <FormSection
              icon={ListChecks}
              title="Checklist"
              description={`${checklist.filter((item) => Number(item.is_completed)).length} of ${checklist.length} completed`}
            >
              <div className="space-y-2 sm:col-span-2">
                {checklist.map((item) => (
                  <div
                    className="flex items-center gap-3 border-b border-line py-2"
                    key={item.id}
                  >
                    <input
                      type="checkbox"
                      checked={Boolean(Number(item.is_completed))}
                      onChange={() => toggleChecklistItem(item)}
                      className="h-4 w-4 accent-blue"
                    />
                    <span
                      className={`flex-1 text-sm ${Number(item.is_completed) ? "text-zinc-400 line-through" : ""}`}
                    >
                      {item.title}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeChecklistItem(item.id)}
                      className="text-zinc-400 hover:text-red-700"
                      aria-label="Delete checklist item"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
                <div className="flex gap-2 pt-2">
                  <input
                    className="field"
                    value={checklistTitle}
                    onChange={(event) => setChecklistTitle(event.target.value)}
                    placeholder="Add checklist item"
                  />
                  <button
                    type="button"
                    className="button-secondary shrink-0"
                    onClick={addChecklistItem}
                  >
                    <Plus size={14} />
                    Add
                  </button>
                </div>
              </div>
            </FormSection>
            <FormSection
              icon={MessageSquare}
              title="Comments"
              description="Updates from the team"
            >
              <div className="space-y-3 sm:col-span-2">
                {comments.map((comment) => (
                  <article
                    className="border-b border-line pb-3"
                    key={comment.id}
                  >
                    <div className="flex justify-between gap-3">
                      <p className="text-xs font-semibold">
                        {comment.user_name}
                      </p>
                      <button
                        type="button"
                        onClick={() => removeComment(comment.id)}
                        className="text-zinc-400 hover:text-red-700"
                        aria-label="Delete comment"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                    <p className="mt-1 text-sm leading-5 text-zinc-600">
                      {comment.comment}
                    </p>
                    <p className="mt-1 text-[11px] text-zinc-400">
                      {formatDate(String(comment.created_at).slice(0, 10))}
                    </p>
                  </article>
                ))}
                <textarea
                  className="field min-h-20 resize-y"
                  value={commentText}
                  onChange={(event) => setCommentText(event.target.value)}
                  placeholder="Add a comment"
                />
                <button
                  type="button"
                  className="button-secondary"
                  onClick={addComment}
                >
                  <MessageSquare size={14} />
                  Add comment
                </button>
              </div>
            </FormSection>
          </div>
        )}
        {collaborationError && (
          <p className="border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {collaborationError}
          </p>
        )}
      </div>
      <div className="sticky bottom-0 z-10 flex justify-end gap-3 border-t border-line bg-white/95 p-4 backdrop-blur sm:px-6">
        <button type="button" className="button-secondary" onClick={onClose}>
          Cancel
        </button>
        <button className="button-primary" disabled={saving} type="submit">
          {saving ? "Saving…" : task?.id ? "Save changes" : "Create task"}
        </button>
      </div>
    </form>
  );
}

function ClientForm({ client, onSave, onClose }) {
  const [form, setForm] = useState(
    client || {
      id: "",
      name: "",
      initials: "",
      color: "#002FA7",
      contact: "",
      email: "",
      phone: "",
      servicePackage: "",
      monthlyFee: 0,
      startDate: "",
      status: "active",
      notes: "",
    },
  );
  const [saving, setSaving] = useState(false);
  const change = (key, value) =>
    setForm((current) => ({ ...current, [key]: value }));
  const submit = async (event) => {
    event.preventDefault();
    const initials =
      form.initials ||
      form.name
        .split(" ")
        .map((part) => part[0])
        .join("")
        .slice(0, 2)
        .toUpperCase();
    setSaving(true);
    await onSave({ ...form, initials });
    setSaving(false);
    onClose();
  };
  return (
    <form onSubmit={submit}>
      <div className="grid gap-5 p-5 sm:grid-cols-2 sm:p-6">
        <Field label="Client name">
          <input
            className="field"
            required
            value={form.name}
            onChange={(event) => change("name", event.target.value)}
          />
        </Field>
        <Field label="Contact person">
          <input
            className="field"
            required
            value={form.contact}
            onChange={(event) => change("contact", event.target.value)}
          />
        </Field>
        <Field label="Email">
          <input
            className="field"
            type="email"
            value={form.email}
            onChange={(event) => change("email", event.target.value)}
          />
        </Field>
        <Field label="Phone">
          <input
            className="field"
            value={form.phone}
            onChange={(event) => change("phone", event.target.value)}
          />
        </Field>
        <Field label="Service package">
          <input
            className="field"
            value={form.servicePackage || ""}
            onChange={(event) => change("servicePackage", event.target.value)}
          />
        </Field>
        <Field label="Monthly fee">
          <input
            className="field"
            type="number"
            min="0"
            value={form.monthlyFee || 0}
            onChange={(event) => change("monthlyFee", event.target.value)}
          />
        </Field>
        <Field label="Start date">
          <input
            className="field"
            type="date"
            value={form.startDate || ""}
            onChange={(event) => change("startDate", event.target.value)}
          />
        </Field>
        <Field label="Status">
          <select
            className="field"
            value={String(form.status || "active")
              .toLowerCase()
              .replace(" ", "_")}
            onChange={(event) => change("status", event.target.value)}
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="on_hold">On hold</option>
          </select>
        </Field>
        <Field label="Initials">
          <input
            className="field"
            maxLength="2"
            value={form.initials}
            onChange={(event) =>
              change("initials", event.target.value.toUpperCase())
            }
            placeholder="Auto-generated"
          />
        </Field>
        <Field label="Brand color">
          <input
            className="field h-11 p-1"
            type="color"
            value={form.color}
            onChange={(event) => change("color", event.target.value)}
          />
        </Field>
        <Field label="Notes" className="sm:col-span-2">
          <textarea
            className="field min-h-24"
            value={form.notes}
            onChange={(event) => change("notes", event.target.value)}
          />
        </Field>
      </div>
      <div className="flex justify-end gap-3 border-t border-line bg-canvas p-4 sm:px-6">
        <button type="button" className="button-secondary" onClick={onClose}>
          Cancel
        </button>
        <button className="button-primary" disabled={saving}>
          {saving ? "Saving…" : client?.id ? "Save changes" : "Add client"}
        </button>
      </div>
    </form>
  );
}

function DeadlineColumn({ title, description, tasks, clients, tone }) {
  const toneClasses = {
    red: ["bg-red-50 text-red-700", "bg-red-600"],
    orange: ["bg-orange-50 text-orange-700", "bg-orange-500"],
    blue: ["bg-blue/5 text-blue", "bg-blue"],
  };
  const [toneSurface, toneBar] = toneClasses[tone];
  return (
    <section className="overflow-hidden rounded-2xl border border-white/70 bg-white shadow-[0_8px_24px_rgba(24,24,27,0.045)] ring-1 ring-zinc-200/80">
      <div className={`h-1 ${toneBar}`} />
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold tracking-tight">{title}</h3>
            <p className="mt-1 text-xs text-zinc-500">{description}</p>
          </div>
          <span
            className={`flex h-9 min-w-9 items-center justify-center rounded-xl px-2 text-sm font-bold tabular-nums ${toneSurface}`}
          >
            {tasks.length}
          </span>
        </div>
        {tasks.length ? (
          <div className="mt-4 space-y-2">
            {tasks.slice(0, 2).map((task) => (
              <div className="rounded-xl bg-canvas/80 p-3" key={task.id}>
                <p className="truncate text-xs font-semibold text-zinc-800">
                  {task.title}
                </p>
                <p className="mt-1 truncate text-[11px] text-zinc-500">
                  {clients.find((client) => client.id === task.clientId)
                    ?.name || "Deleted client"}{" "}
                  · {formatDate(task.deadline)}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-4 rounded-xl border border-dashed border-zinc-200 px-3 py-4 text-center text-xs text-zinc-400">
            No tasks
          </div>
        )}
      </div>
    </section>
  );
}

function DashboardMetricCard({
  label,
  value,
  detail,
  icon: Icon,
  accent = "blue",
}) {
  const accents = {
    blue: "bg-blue/5 text-blue",
    emerald: "bg-blue/5 text-blue",
    orange: "bg-blue/5 text-blue",
    violet: "bg-blue/5 text-blue",
  };
  return (
    <article className="group rounded-xl border border-line bg-white p-4 shadow-soft transition duration-150 hover:border-zinc-300">
      <div className="flex items-start justify-between gap-4">
        <span
          className={`flex h-9 w-9 items-center justify-center rounded-lg ${accents[accent]}`}
        >
          <Icon size={18} strokeWidth={1.8} />
        </span>
        <span className="max-w-28 text-right text-[10px] font-medium leading-4 text-zinc-400">{detail}</span>
      </div>
      <p className="mt-5 text-[1.75rem] font-semibold leading-none tracking-[-0.04em] text-ink tabular-nums">
        {value}
      </p>
      <p className="mt-2 text-xs font-semibold text-zinc-600">{label}</p>
    </article>
  );
}

function DashboardTaskCard({ task, client, onEdit, updateTask }) {
  const completed = Number(task.checklistCompleted || 0);
  const total = Number(task.checklistTotal || 0);
  const progress = total ? Math.round((completed / total) * 100) : 0;
  const initials = task.assignedUserName
    ? task.assignedUserName
        .split(/\s+/)
        .map((part) => part[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "";
  return (
    <article className="rounded-xl border border-line bg-white p-4 shadow-soft transition duration-150 hover:border-zinc-300">
      <div className="flex items-start justify-between gap-4">
        <button className="min-w-0 text-left" onClick={() => onEdit(task)}>
          <h3 className="truncate text-sm font-semibold tracking-tight hover:text-blue">
            {task.title}
          </h3>
          <p className="mt-1 truncate text-xs text-zinc-500">
            {client?.name || "Deleted client"}
          </p>
        </button>
        <PriorityBadge priority={task.priority} />
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <DeadlineBadge task={task} />
        <Badge variant="neutral">
          <CalendarDays size={11} className="mr-1" />
          {formatDate(task.deadline)}
        </Badge>
        <span className="ml-auto flex items-center gap-1.5 text-[11px] text-zinc-500">
          {initials ? (
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-ink text-[9px] font-bold text-white">
              {initials}
            </span>
          ) : (
            <UserRound size={13} />
          )}
          {task.assignedUserName || "Unassigned"}
        </span>
      </div>
      {total > 0 && (
        <div className="mt-4 rounded-xl bg-canvas p-3">
          <div className="mb-2 flex items-center justify-between text-[10px] text-zinc-500">
            <span>Checklist progress</span>
            <span className="font-semibold tabular-nums">
              {completed}/{total}
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-zinc-200">
            <div
              className="h-full rounded-full bg-blue"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}
      <div className="mt-4 border-t border-line pt-3">
        <select
          className="w-full rounded-lg bg-canvas px-2 py-2 text-xs font-semibold outline-none hover:bg-zinc-100"
          value={task.status}
          onChange={(event) =>
            updateTask(task.id, { status: event.target.value })
          }
        >
          {TASK_STATUSES.map((status) => (
            <option key={status}>{status}</option>
          ))}
        </select>
      </div>
    </article>
  );
}

function Dashboard({
  clients,
  tasks,
  activities,
  notifications = [],
  connectionStatus,
  onNewTask,
  setActivePage,
  onEditTask,
  updateTask,
  onOpenNotification,
}) {
  const completed = tasks.filter((task) => task.status === "Completed");
  const billable = tasks.filter((task) => task.billable);
  const todayTasks = tasks.filter((task) => task.deadline === TODAY);
  const openTasks = tasks.filter((task) => task.status !== "Completed");
  const overdueTasks = openTasks
    .filter((task) => deadlineState(task) === "Overdue")
    .sort((a, b) => a.deadline.localeCompare(b.deadline));
  const dueTodayTasks = openTasks.filter(
    (task) => deadlineState(task) === "Due Today",
  );
  const dueThisWeekTasks = openTasks
    .filter((task) =>
      ["Due Tomorrow", "Due This Week"].includes(deadlineState(task)),
    )
    .sort((a, b) => a.deadline.localeCompare(b.deadline));
  const upcomingTasks = openTasks
    .filter((task) => deadlineState(task) === "Upcoming")
    .sort((a, b) => a.deadline.localeCompare(b.deadline));
  const recurringTasks = tasks
    .filter((task) => task.isRecurring && task.nextOccurrenceDate)
    .sort((a, b) => a.nextOccurrenceDate.localeCompare(b.nextOccurrenceDate));
  const recurringDueToday = recurringTasks.filter(
    (task) => task.nextOccurrenceDate === TODAY,
  );
  const recurringUpcoming = recurringTasks
    .filter((task) => task.nextOccurrenceDate > TODAY)
    .slice(0, 4);
  const stats = [
    [
      "Active clients",
      String(clients.length).padStart(2, "0"),
      "Client workspaces",
      Users,
      "blue",
    ],
    [
      "Today’s tasks",
      String(todayTasks.length).padStart(2, "0"),
      `${todayTasks.filter((task) => task.status !== "Completed").length} open`,
      ClipboardList,
      "orange",
    ],
    [
      "Pending tasks",
      String(tasks.length - completed.length).padStart(2, "0"),
      "Across all clients",
      Clock3,
      "violet",
    ],
    [
      "Completed work",
      String(completed.length).padStart(2, "0"),
      "Stored in daily logs",
      CheckCircle2,
      "emerald",
    ],
    [
      "Billable work",
      formatMoney(billable.reduce((sum, task) => sum + Number(task.amount), 0)),
      `${billable.length} items`,
      CircleDollarSign,
      "blue",
    ],
    [
      "Reports ready",
      String(new Set(completed.map((task) => task.clientId)).size).padStart(
        2,
        "0",
      ),
      "From completed work",
      FileText,
      "emerald",
    ],
  ];
  const priorityTasks = tasks
    .filter((task) => task.status !== "Completed")
    .sort((a, b) => {
      const rank = { Urgent: 0, High: 1, Medium: 2, Low: 3 };
      return (
        (rank[a.priority] ?? 4) - (rank[b.priority] ?? 4) ||
        String(a.deadline || "9999").localeCompare(String(b.deadline || "9999"))
      );
    })
    .slice(0, 6);
  const importantNotifications = notifications
    .filter(
      (notification) =>
        ["overdue_task", "due_today", "reminder", "unpaid_billing"].includes(
          notification.type,
        ) && Number(notification.is_read) !== 1,
    )
    .slice(0, 5);
  const statusLabel =
    connectionStatus === "connected"
      ? "Connected to API"
      : connectionStatus === "fallback"
        ? "Demo/Fallback Mode"
        : "API Error";
  const statusClasses =
    connectionStatus === "connected"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : connectionStatus === "fallback"
        ? "border-amber-200 bg-amber-50 text-amber-800"
        : "border-red-200 bg-red-50 text-red-700";
  return (
    <>
      <header className="border-b border-line pb-5">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-3 flex items-center gap-3">
              <span
                className={`inline-flex items-center gap-2 rounded-md border px-2 py-1 text-[11px] font-medium ${statusClasses}`}
              >
                <span className="h-1.5 w-1.5 rounded-full bg-current" />
                {statusLabel}
              </span>
            </div>
            <h1 className="text-2xl font-semibold tracking-[-0.03em] text-ink sm:text-3xl">
              Dashboard
            </h1>
            {/* <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-500">
              A focused view of client delivery, deadlines, team attention, and
              billable work.
            </p> */}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              onClick={() => setActivePage("Calendar")}
            >
              <CalendarDays size={16} />
              Open calendar
            </Button>
            <Button onClick={onNewTask}>
              <Plus size={16} />
              Create task
            </Button>
          </div>
        </div>
      </header>

      <section className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        {stats.map(([label, value, detail, Icon, accent]) => (
          <DashboardMetricCard
            key={label}
            label={label}
            value={value}
            detail={detail}
            icon={Icon}
            accent={accent}
          />
        ))}
      </section>

      <div className="mt-6 grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0 space-y-5">
          <section>
            <div className="mb-4 flex items-end justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold tracking-tight">
                  Deadline attention
                </h2>
                <p className="mt-1 text-sm text-zinc-500">
                  Open client work ordered by urgency.
                </p>
              </div>
              <button
                className="text-sm font-semibold text-blue hover:underline"
                onClick={() => setActivePage("Reminders")}
              >
                View reminders
              </button>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-4">
              <DeadlineColumn
                title="Overdue"
                description="Past deadline"
                tasks={overdueTasks}
                clients={clients}
                tone="red"
              />
              <DeadlineColumn
                title="Due today"
                description={formatDate(TODAY, {
                  month: "long",
                  day: "numeric",
                })}
                tasks={dueTodayTasks}
                clients={clients}
                tone="orange"
              />
              <DeadlineColumn
                title="Due this week"
                description="Next seven days"
                tasks={dueThisWeekTasks}
                clients={clients}
                tone="blue"
              />
              <DeadlineColumn
                title="Upcoming"
                description="Beyond seven days"
                tasks={upcomingTasks}
                clients={clients}
                tone="blue"
              />
            </div>
          </section>

          <section className="overflow-hidden rounded-xl border border-line bg-white shadow-soft">
            <div className="flex items-center justify-between border-b border-line px-5 py-4 sm:px-6">
              <div>
                <h2 className="text-base font-semibold tracking-tight">
                  Priority work
                </h2>
                <p className="mt-1 text-xs text-zinc-500">
                  High-attention tasks across active clients.
                </p>
              </div>
              <button
                className="text-sm font-semibold text-blue hover:underline"
                onClick={() => setActivePage("Tasks")}
              >
                View all tasks
              </button>
            </div>
            {priorityTasks.length ? (
              <div className="grid gap-4 p-4 md:grid-cols-2 sm:p-5">
                {priorityTasks.map((task) => (
                  <DashboardTaskCard
                    key={task.id}
                    task={task}
                    client={clients.find(
                      (client) => client.id === task.clientId,
                    )}
                    onEdit={onEditTask}
                    updateTask={updateTask}
                  />
                ))}
              </div>
            ) : (
              <div className="p-5">
                <EmptyState
                  title="No priority work"
                  description="Open tasks requiring attention will appear here."
                  action="Create task"
                  onAction={onNewTask}
                />
              </div>
            )}
          </section>

          <section className="overflow-hidden rounded-xl border border-line bg-white shadow-soft">
            <div className="flex items-center justify-between border-b border-line px-5 py-4 sm:px-6">
              <div>
                <h2 className="text-base font-semibold tracking-tight">
                  Recurring workflow
                </h2>
                <p className="mt-1 text-xs text-zinc-500">
                  Templates scheduled for upcoming delivery.
                </p>
              </div>
              <button
                className="text-sm font-semibold text-blue hover:underline"
                onClick={() => setActivePage("Recurring Tasks")}
              >
                Manage
              </button>
            </div>
            <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
              {recurringUpcoming.length ? (
                recurringUpcoming.map((task) => (
                  <article className="rounded-lg border border-line bg-canvas p-4" key={task.id}>
                    <div className="flex items-start justify-between gap-3">
                      <Repeat2 size={15} className="text-violet-600" />
                      <span className="text-[10px] font-semibold text-violet-700">
                        {formatDate(task.nextOccurrenceDate, {
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                    </div>
                    <p className="mt-4 truncate text-sm font-semibold">
                      {task.title}
                    </p>
                    <p className="mt-1 truncate text-xs text-zinc-500">
                      {clients.find((client) => client.id === task.clientId)
                        ?.name || "Deleted client"}
                    </p>
                  </article>
                ))
              ) : (
                <p className="col-span-full rounded-2xl border border-dashed border-zinc-200 p-6 text-center text-sm text-zinc-400">
                  No upcoming recurring tasks.
                </p>
              )}
            </div>
            {recurringDueToday.length > 0 && (
              <button
                className="flex w-full items-center justify-between border-t border-violet-100 bg-violet-50 px-5 py-3 text-left text-sm font-semibold text-violet-800 hover:bg-violet-100"
                onClick={() => setActivePage("Recurring Tasks")}
              >
                <span>
                  {recurringDueToday.length} recurring task
                  {recurringDueToday.length === 1 ? "" : "s"} due today
                </span>
                <ChevronRight size={16} />
              </button>
            )}
          </section>
        </div>

        <aside className="space-y-5 xl:sticky xl:top-24 xl:self-start">
          <section className="overflow-hidden rounded-xl border border-line bg-white shadow-soft">
            <div className="border-b border-line px-5 py-4">
              <h2 className="text-base font-semibold tracking-tight">
                Delivery pulse
              </h2>
              <p className="mt-1 text-xs text-zinc-500">
                {formatDate(TODAY, {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                })}
              </p>
            </div>
            <div className="space-y-4 p-5">
              {clients.length ? (
                clients.slice(0, 6).map((client) => {
                  const clientTasks = tasks.filter(
                    (task) => task.clientId === client.id,
                  );
                  const done = clientTasks.filter(
                    (task) => task.status === "Completed",
                  ).length;
                  const percentage = clientTasks.length
                    ? Math.round((done / clientTasks.length) * 100)
                    : 0;
                  return (
                    <div key={client.id}>
                      <div className="flex items-center justify-between gap-4">
                        <p className="truncate text-xs font-semibold">
                          {client.name}
                        </p>
                        <span className="text-[10px] font-medium tabular-nums text-zinc-400">
                          {done}/{clientTasks.length}
                        </span>
                      </div>
                      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-zinc-100">
                        <div
                          className="h-full rounded-full bg-blue"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="rounded-xl border border-dashed border-zinc-200 p-5 text-center text-xs text-zinc-400">
                  No clients yet.
                </p>
              )}
            </div>
          </section>

          <section className="overflow-hidden rounded-xl border border-line bg-white shadow-soft">
            <div className="flex items-center justify-between border-b border-line px-5 py-4">
              <div>
                <h2 className="text-base font-semibold tracking-tight">
                  Notifications
                </h2>
                <p className="mt-1 text-xs text-zinc-500">
                  Items that need attention.
                </p>
              </div>
              <button
                className="text-xs font-semibold text-blue hover:underline"
                onClick={() => setActivePage("Notifications")}
              >
                View all
              </button>
            </div>
            {importantNotifications.length ? (
              <div className="divide-y divide-line">
                {importantNotifications.slice(0, 4).map((notification) => (
                  <NotificationItem
                    key={notification.id}
                    compact
                    notification={notification}
                    onOpen={onOpenNotification}
                  />
                ))}
              </div>
            ) : (
              <div className="p-5">
                <div className="rounded-lg border border-dashed border-zinc-200 p-5 text-center">
                  <CheckCircle2
                    size={20}
                    className="mx-auto text-emerald-600"
                  />
                  <p className="mt-2 text-xs font-semibold">Nothing urgent</p>
                  <p className="mt-1 text-[11px] text-zinc-500">
                    Important alerts will appear here.
                  </p>
                </div>
              </div>
            )}
          </section>

          <section className="overflow-hidden rounded-xl border border-line bg-white shadow-soft">
            <div className="flex items-center justify-between border-b border-line px-5 py-4">
              <div>
                <h2 className="text-base font-semibold tracking-tight">
                  Recent activity
                </h2>
                <p className="mt-1 text-xs text-zinc-500">
                  Latest workspace actions.
                </p>
              </div>
              <button
                className="text-xs font-semibold text-blue hover:underline"
                onClick={() => setActivePage("Activity")}
              >
                View all
              </button>
            </div>
            <ActivityFeed activities={(activities || []).slice(0, 4)} compact />
          </section>
        </aside>
      </div>
    </>
  );
}

function ClientsPage({
  clients,
  tasks,
  onNewClient,
  onEditClient,
  onDeleteClient,
  onViewClient,
}) {
  const metrics = (id) => {
    const list = tasks.filter((task) => task.clientId === id);
    return {
      total: list.length,
      completed: list.filter((task) => task.status === "Completed").length,
      pending: list.filter((task) => task.status !== "Completed").length,
      billable: list
        .filter((task) => task.billable)
        .reduce((sum, task) => sum + Number(task.amount), 0),
    };
  };
  return (
    <>
      <PageHeading
        number="02"
        title="Clients"
        description="Client workspaces with task progress, contacts, and billable totals."
        action="Add client"
        onAction={onNewClient}
      />
      {clients.length ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {clients.map((client) => (
            <ClientCard
              key={client.id}
              client={client}
              metrics={metrics(client.id)}
              onView={() => onViewClient(client.id)}
              onEdit={() => onEditClient(client)}
              onDelete={() => onDeleteClient(client.id)}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          title="No clients yet."
          description="Add your first client."
          action="Add client"
          onAction={onNewClient}
        />
      )}
    </>
  );
}

function TaskFilterControl({
  label,
  value,
  onChange,
  children,
  className = "",
}) {
  return (
    <label
      className={`group flex min-w-[148px] flex-1 items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 py-2 shadow-sm transition hover:border-zinc-300 focus-within:border-blue/50 focus-within:ring-4 focus-within:ring-blue/10 ${className}`}
    >
      <span className="shrink-0 text-[10px] font-bold uppercase tracking-[0.12em] text-zinc-400">
        {label}
      </span>
      <select
        className="min-w-0 flex-1 bg-transparent text-xs font-semibold text-zinc-700 outline-none"
        value={value}
        onChange={onChange}
      >
        {children}
      </select>
    </label>
  );
}

function AssigneePill({ name }) {
  const initials = name
    ? name
        .split(" ")
        .map((part) => part[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "—";
  return (
    <div className="flex min-w-0 items-center gap-2">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue/10 text-[10px] font-bold text-blue">
        {initials}
      </span>
      <span className="truncate text-xs font-medium text-zinc-600">
        {name || "Unassigned"}
      </span>
    </div>
  );
}

const firstTaskImage = (task) =>
  task.attachments?.find(
    (attachment) =>
      attachment.isImage ||
      String(attachment.mimeType || "").startsWith("image/"),
  );

const firstTaskVideo = (task) =>
  task.attachments?.find((attachment) =>
    String(attachment.mimeType || "").startsWith("video/"),
  );

function TaskListRow({
  task,
  client,
  selected,
  onToggle,
  onEdit,
  onDelete,
  updateTask,
}) {
  const checklistPercent = task.checklistTotal
    ? Math.round((task.checklistCompleted / task.checklistTotal) * 100)
    : 0;
  const imageAttachment = firstTaskImage(task);
  const imagePreviewUrl = getAttachmentPreviewUrl(imageAttachment, "card");
  const videoAttachment = firstTaskVideo(task);
  return (
    <article
      className={`group relative grid gap-4 border-b border-zinc-100 px-4 py-4 transition last:border-b-0 hover:bg-blue/[0.025] sm:px-5 xl:grid-cols-[32px_minmax(260px,1.5fr)_minmax(150px,.7fr)_minmax(150px,.7fr)_145px_120px_36px] xl:items-center ${selected ? "bg-blue/[0.045]" : "bg-white"}`}
    >
      <div className="absolute inset-y-2 left-0 w-0.5 rounded-r-full bg-blue opacity-0 transition group-hover:opacity-100" />
      <input
        className="h-4 w-4 rounded border-zinc-300 text-blue focus:ring-blue/20"
        type="checkbox"
        checked={selected}
        onChange={onToggle}
        aria-label={`Select ${task.title}`}
      />
      <button className="min-w-0 text-left" onClick={onEdit}>
        {imageAttachment && imagePreviewUrl ? (
          <img
            className="mb-3 h-14 w-20 rounded-lg border border-zinc-200 object-cover sm:float-left sm:mb-0 sm:mr-3"
            src={imagePreviewUrl}
            alt=""
            loading="lazy"
            decoding="async"
          />
        ) : imageAttachment ? (
          <span className="mb-3 flex h-14 w-20 items-center justify-center rounded-lg border border-zinc-200 bg-zinc-50 text-[10px] font-medium text-zinc-400 sm:float-left sm:mb-0 sm:mr-3">
            Image
          </span>
        ) : videoAttachment ? (
          <span className="mb-3 flex h-14 w-20 items-center justify-center rounded-lg border border-zinc-200 bg-zinc-50 text-[10px] font-semibold text-zinc-500 sm:float-left sm:mb-0 sm:mr-3">
            <Video size={15} className="mr-1" />
            VIDEO
          </span>
        ) : null}
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="truncate text-sm font-semibold tracking-tight text-zinc-900 transition group-hover:text-blue">
            {task.title}
          </h3>
          <PriorityBadge priority={task.priority} />
          {task.isRecurring && (
            <Badge className="border-violet-200 bg-violet-50 text-violet-700">
              <Repeat2 size={11} className="mr-1" />
              Recurring
            </Badge>
          )}
        </div>
        <p className="mt-1 truncate text-xs text-zinc-500">
          {task.category || "General task"}
        </p>
        {task.checklistTotal > 0 && (
          <div className="mt-3 max-w-xs">
            <div className="mb-1.5 flex items-center justify-between text-[10px] font-semibold text-zinc-400">
              <span>Checklist</span>
              <span>
                {task.checklistCompleted}/{task.checklistTotal}
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-zinc-100">
              <div
                className="h-full rounded-full bg-blue transition-all"
                style={{ width: `${checklistPercent}%` }}
              />
            </div>
          </div>
        )}
      </button>
      <div className="min-w-0">
        <p className="truncate text-xs font-semibold text-zinc-800">
          {client?.name || "Deleted client"}
        </p>
        <div className="mt-2">
          <AssigneePill name={task.assignedUserName} />
        </div>
      </div>
      <div>
        <p className="text-xs font-semibold text-zinc-700">
          {task.deadline ? formatDate(task.deadline) : "No deadline"}
        </p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <DeadlineBadge task={task} />
          {task.reminderDate && (
            <Badge className="border-orange-200 bg-orange-50 text-orange-700">
              <BellRing size={11} className="mr-1" />
              Reminder
            </Badge>
          )}
        </div>
      </div>
      <div className="space-y-2">
        <StatusBadge status={task.status} />
        <select
          className="w-full rounded-lg border border-zinc-200 bg-white px-2 py-1.5 text-[11px] font-semibold text-zinc-600 outline-none transition focus:border-blue/50 focus:ring-2 focus:ring-blue/10"
          value={task.status}
          onChange={(event) =>
            updateTask(task.id, { status: event.target.value })
          }
          aria-label={`Update ${task.title} status`}
        >
          {TASK_STATUSES.map((status) => (
            <option key={status}>{status}</option>
          ))}
        </select>
      </div>
      <div>
        {task.billable ? (
          <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700">
            <CircleDollarSign size={11} className="mr-1" />
            {formatMoney(task.amount)}
          </Badge>
        ) : (
          <span className="text-[11px] font-medium text-zinc-400">
            Non-billable
          </span>
        )}
      </div>
      <ActionMenu onEdit={onEdit} onDelete={onDelete} />
    </article>
  );
}

function KanbanTaskCard({ task, client, onEdit, onDelete, updateTask }) {
  const checklistPercent = task.checklistTotal
    ? Math.round((task.checklistCompleted / task.checklistTotal) * 100)
    : 0;
  const proofCount = task.attachments?.length || (task.proofLink ? 1 : 0);
  const imageAttachment = firstTaskImage(task);
  const imagePreviewUrl = getAttachmentPreviewUrl(imageAttachment, "card");
  const videoAttachment = firstTaskVideo(task);
  return (
    <article className="group rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-[0_5px_18px_rgba(24,24,27,0.045)] transition duration-200 hover:-translate-y-0.5 hover:border-blue/20 hover:shadow-[0_12px_30px_rgba(37,99,235,0.09)]">
      {imageAttachment && imagePreviewUrl ? (
        <button
          className="mb-3 block w-full overflow-hidden rounded-lg"
          onClick={onEdit}
          aria-label={`Open ${task.title}`}
        >
          <img
            className="h-24 w-full object-cover transition duration-200 group-hover:scale-[1.01]"
            src={imagePreviewUrl}
            alt=""
            loading="lazy"
            decoding="async"
          />
        </button>
      ) : imageAttachment ? (
        <button
          className="mb-3 flex h-20 w-full items-center justify-center rounded-lg border border-zinc-200 bg-zinc-50 text-xs font-medium text-zinc-400"
          onClick={onEdit}
          aria-label={`Open ${task.title}`}
        >
          Image preview unavailable
        </button>
      ) : videoAttachment ? (
        <button
          className="mb-3 flex h-20 w-full items-center justify-center rounded-lg border border-zinc-200 bg-zinc-50 text-xs font-semibold text-zinc-500 hover:border-zinc-300 hover:text-zinc-700"
          onClick={onEdit}
          aria-label={`Open video attachment for ${task.title}`}
        >
          <Video size={17} className="mr-2" />
          Video attachment
        </button>
      ) : null}
      <div className="flex items-start justify-between gap-3">
        <button className="min-w-0 flex-1 text-left" onClick={onEdit}>
          <h3 className="text-sm font-semibold leading-5 tracking-tight text-zinc-900 transition group-hover:text-blue">
            {task.title}
          </h3>
          <p className="mt-1 truncate text-xs font-medium text-zinc-400">
            {client?.name || "Deleted client"}
          </p>
        </button>
        <ActionMenu onEdit={onEdit} onDelete={onDelete} />
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        <StatusBadge status={task.status} />
        <PriorityBadge priority={task.priority} />
        {task.billable && <BillingBadge />}
      </div>
      <div className="mt-4 rounded-xl bg-zinc-50 p-3">
        <AssigneePill name={task.assignedUserName} />
        <div className="mt-3 flex flex-wrap gap-1.5">
          <DeadlineBadge task={task} />
          {task.reminderDate && (
            <Badge className="border-orange-200 bg-orange-50 text-orange-700">
              <BellRing size={11} className="mr-1" />
              Reminder
            </Badge>
          )}
        </div>
      </div>
      {task.checklistTotal > 0 && (
        <div className="mt-4">
          <div className="mb-1.5 flex items-center justify-between text-[10px] font-semibold text-zinc-400">
            <span>Checklist progress</span>
            <span>
              {task.checklistCompleted}/{task.checklistTotal}
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-zinc-100">
            <div
              className="h-full rounded-full bg-blue"
              style={{ width: `${checklistPercent}%` }}
            />
          </div>
        </div>
      )}
      <div className="mt-4 flex items-center justify-between border-t border-zinc-100 pt-3">
        <div className="flex items-center gap-3 text-[11px] font-medium text-zinc-400">
          {proofCount > 0 && (
            <span className="inline-flex items-center gap-1">
              <Link2 size={13} />
              {proofCount} proof{proofCount === 1 ? "" : "s"}
            </span>
          )}
          {task.isRecurring && (
            <span className="inline-flex items-center gap-1 text-violet-600">
              <Repeat2 size={13} />
              Recurring
            </span>
          )}
        </div>
        <select
          className="max-w-[128px] rounded-lg border border-zinc-200 bg-white px-2 py-1.5 text-[10px] font-bold text-zinc-600 outline-none focus:border-blue/50"
          value={task.status}
          onChange={(event) =>
            updateTask(task.id, { status: event.target.value })
          }
          aria-label={`Move ${task.title}`}
        >
          {TASK_STATUSES.map((status) => (
            <option key={status}>{status}</option>
          ))}
        </select>
      </div>
    </article>
  );
}

function TasksPage({
  clients,
  users,
  tasks,
  onNewTask,
  onEditTask,
  onDeleteTask,
  updateTask,
  setActivePage,
}) {
  const [search, setSearch] = useState("");
  const [clientFilter, setClientFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [priorityFilter, setPriorityFilter] = useState("All");
  const [assigneeFilter, setAssigneeFilter] = useState("All");
  const [deadlineFilter, setDeadlineFilter] = useState("All");
  const [billableOnly, setBillableOnly] = useState(false);
  const [recurringOnly, setRecurringOnly] = useState(false);
  const [selected, setSelected] = useState([]);
  const [bulkStatus, setBulkStatus] = useState("");
  const [bulkPriority, setBulkPriority] = useState("");
  const [bulkAssignee, setBulkAssignee] = useState("");
  const filtered = tasks.filter((task) => {
    const client = clients.find((item) => item.id === task.clientId);
    const deadline = deadlineState(task);
    const matchesDeadline =
      deadlineFilter === "All" ||
      deadline === deadlineFilter ||
      (deadlineFilter === "Due This Week" &&
        ["Due Tomorrow", "Due This Week"].includes(deadline));
    return (
      (!search ||
        `${task.title} ${task.description} ${client?.name}`
          .toLowerCase()
          .includes(search.toLowerCase())) &&
      (clientFilter === "All" || task.clientId === clientFilter) &&
      (statusFilter === "All" || task.status === statusFilter) &&
      (priorityFilter === "All" || task.priority === priorityFilter) &&
      (assigneeFilter === "All" ||
        (assigneeFilter === "Unassigned"
          ? !task.assignedUserId
          : task.assignedUserId === assigneeFilter)) &&
      (!billableOnly || task.billable) &&
      (!recurringOnly || task.isRecurring) &&
      matchesDeadline
    );
  });
  const statusOrder = {
    "In Progress": 1,
    Revision: 2,
    "Waiting for Client": 3,
    New: 4,
  };
  const timestamp = (value) => {
    if (!value) return 0;
    const parsed = Date.parse(String(value).replace(" ", "T"));
    return Number.isNaN(parsed) ? 0 : parsed;
  };
  const sortedTasks = [...filtered].sort((a, b) => {
    const aCompleted = a.status === "Completed";
    const bCompleted = b.status === "Completed";
    if (aCompleted !== bCompleted) return aCompleted ? 1 : -1;

    if (aCompleted && bCompleted) {
      const aCompletedTime = timestamp(
        a.completedAtTimestamp || a.completedAt || a.updatedAt || a.createdAt,
      );
      const bCompletedTime = timestamp(
        b.completedAtTimestamp || b.completedAt || b.updatedAt || b.createdAt,
      );
      return bCompletedTime - aCompletedTime;
    }

    const statusDifference =
      (statusOrder[a.status] || 99) - (statusOrder[b.status] || 99);
    if (statusDifference !== 0) return statusDifference;

    const aCreatedTime = timestamp(a.createdAt);
    const bCreatedTime = timestamp(b.createdAt);
    if (aCreatedTime && bCreatedTime) return bCreatedTime - aCreatedTime;
    if (aCreatedTime !== bCreatedTime) return aCreatedTime ? -1 : 1;

    return String(a.deadline || "9999-12-31").localeCompare(
      String(b.deadline || "9999-12-31"),
    );
  });
  const allVisibleSelected =
    filtered.length > 0 && filtered.every((task) => selected.includes(task.id));
  const toggleSelected = (id) =>
    setSelected((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    );
  const applyBulk = async (patch) => {
    const normalizedPatch =
      "assignedUserId" in patch
        ? {
            ...patch,
            assignedUserName:
              users.find(
                (user) => String(user.id) === String(patch.assignedUserId),
              )?.name || "",
          }
        : patch;
    for (const id of selected) await updateTask(id, normalizedPatch);
    setSelected([]);
  };
  const deleteSelected = async () => {
    if (
      !window.confirm(
        `Delete ${selected.length} selected task${selected.length === 1 ? "" : "s"}?`,
      )
    )
      return;
    for (const id of selected) await onDeleteTask(id);
    setSelected([]);
  };
  const clearFilters = () => {
    setSearch("");
    setClientFilter("All");
    setStatusFilter("All");
    setPriorityFilter("All");
    setAssigneeFilter("All");
    setDeadlineFilter("All");
    setBillableOnly(false);
    setRecurringOnly(false);
  };
  return (
    <>
      <PageHeader
        eyebrow="Work management"
        title="Tasks"
        description="Plan, assign, and deliver every client commitment from one focused workspace."
        action={
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              onClick={() => setActivePage("Kanban Board")}
            >
              <LayoutDashboard size={15} />
              Board view
            </Button>
            <Button onClick={onNewTask}>
              <Plus size={15} />
              Create task
            </Button>
          </div>
        }
      />
      {!tasks.length ? (
        <div className="rounded-3xl border border-zinc-200/80 bg-white p-6 shadow-sm">
          <EmptyState
            title="Your task workspace is ready"
            description="Create the first client task to start planning deadlines, assignments, and delivery."
            action="Create task"
            onAction={onNewTask}
          />
        </div>
      ) : (
        <div className="space-y-4">
          <section className="rounded-3xl border border-zinc-200/80 bg-zinc-50/70 p-3 shadow-[0_8px_30px_rgba(24,24,27,0.035)] sm:p-4">
            <div className="flex flex-col gap-3 xl:flex-row">
              <div className="flex min-w-[240px] flex-[1.5] items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 shadow-sm transition focus-within:border-blue/50 focus-within:ring-4 focus-within:ring-blue/10">
                <Search size={15} className="shrink-0 text-zinc-400" />
                <input
                  className="w-full bg-transparent py-3 text-sm font-medium outline-none placeholder:text-zinc-400"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search tasks, clients, or notes..."
                />
              </div>
              <div className="flex flex-1 flex-wrap gap-2">
                <TaskFilterControl
                  label="Client"
                  value={clientFilter}
                  onChange={(event) => setClientFilter(event.target.value)}
                >
                  <option>All</option>
                  {clients.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.name}
                    </option>
                  ))}
                </TaskFilterControl>
                <TaskFilterControl
                  label="Assignee"
                  value={assigneeFilter}
                  onChange={(event) => setAssigneeFilter(event.target.value)}
                >
                  <option>All</option>
                  <option>Unassigned</option>
                  {users.map((user) => (
                    <option key={user.id} value={String(user.id)}>
                      {user.name}
                    </option>
                  ))}
                </TaskFilterControl>
              </div>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              <TaskFilterControl
                label="Status"
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
              >
                <option>All</option>
                {TASK_STATUSES.map((status) => (
                  <option key={status}>{status}</option>
                ))}
              </TaskFilterControl>
              <TaskFilterControl
                label="Priority"
                value={priorityFilter}
                onChange={(event) => setPriorityFilter(event.target.value)}
              >
                <option>All</option>
                {PRIORITIES.map((priority) => (
                  <option key={priority}>{priority}</option>
                ))}
              </TaskFilterControl>
              <TaskFilterControl
                label="Deadline"
                value={deadlineFilter}
                onChange={(event) => setDeadlineFilter(event.target.value)}
              >
                <option>All</option>
                <option>Overdue</option>
                <option>Due Today</option>
                <option>Due This Week</option>
                <option>No Deadline</option>
              </TaskFilterControl>
              <button
                className={`inline-flex min-h-10 items-center gap-2 rounded-xl border px-3 text-xs font-semibold shadow-sm transition ${billableOnly ? "border-blue/20 bg-blue text-white" : "border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300"}`}
                onClick={() => setBillableOnly((current) => !current)}
                aria-pressed={billableOnly}
              >
                <CircleDollarSign size={14} />
                Billable
              </button>
              <button
                className={`inline-flex min-h-10 items-center gap-2 rounded-xl border px-3 text-xs font-semibold shadow-sm transition ${recurringOnly ? "border-blue/20 bg-blue text-white" : "border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300"}`}
                onClick={() => setRecurringOnly((current) => !current)}
                aria-pressed={recurringOnly}
              >
                <Repeat2 size={14} />
                Recurring
              </button>
            </div>
          </section>
          {selected.length > 0 && (
            <section className="sticky top-3 z-20 flex flex-wrap items-center gap-2 rounded-2xl border border-blue/20 bg-white/95 p-3 shadow-[0_12px_36px_rgba(37,99,235,0.14)] backdrop-blur">
              <div className="mr-2 flex items-center gap-2 rounded-xl bg-blue/10 px-3 py-2 text-xs font-bold text-blue">
                <CheckCircle2 size={14} />
                {selected.length} selected
              </div>
              <select
                className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold outline-none"
                value={bulkStatus}
                onChange={(event) => setBulkStatus(event.target.value)}
              >
                <option value="">Change status</option>
                {TASK_STATUSES.map((status) => (
                  <option key={status}>{status}</option>
                ))}
              </select>
              <Button
                variant="secondary"
                size="sm"
                disabled={!bulkStatus}
                onClick={() => applyBulk({ status: bulkStatus })}
              >
                Apply
              </Button>
              <select
                className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold outline-none"
                value={bulkPriority}
                onChange={(event) => setBulkPriority(event.target.value)}
              >
                <option value="">Change priority</option>
                {PRIORITIES.map((priority) => (
                  <option key={priority}>{priority}</option>
                ))}
              </select>
              <Button
                variant="secondary"
                size="sm"
                disabled={!bulkPriority}
                onClick={() => applyBulk({ priority: bulkPriority })}
              >
                Apply
              </Button>
              <select
                className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold outline-none"
                value={bulkAssignee}
                onChange={(event) => setBulkAssignee(event.target.value)}
              >
                <option value="">Assign user</option>
                <option value="unassigned">Unassigned</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name}
                  </option>
                ))}
              </select>
              <Button
                variant="secondary"
                size="sm"
                disabled={!bulkAssignee}
                onClick={() =>
                  applyBulk({
                    assignedUserId:
                      bulkAssignee === "unassigned" ? "" : String(bulkAssignee),
                  })
                }
              >
                Apply
              </Button>
              <Button
                className="ml-auto"
                variant="danger"
                size="sm"
                onClick={deleteSelected}
              >
                <Trash2 size={14} />
                Delete
              </Button>
            </section>
          )}
          <section className="overflow-hidden rounded-3xl border border-zinc-200/80 bg-white shadow-[0_10px_34px_rgba(24,24,27,0.05)]">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-100 px-4 py-3 sm:px-5">
              <label className="flex items-center gap-3 text-xs font-semibold text-zinc-500">
                <input
                  className="h-4 w-4 rounded border-zinc-300 text-blue focus:ring-blue/20"
                  type="checkbox"
                  checked={allVisibleSelected}
                  onChange={() =>
                    setSelected(
                      allVisibleSelected
                        ? selected.filter(
                            (id) => !filtered.some((task) => task.id === id),
                          )
                        : [
                            ...new Set([
                              ...selected,
                              ...filtered.map((task) => task.id),
                            ]),
                          ],
                    )
                  }
                  aria-label="Select visible tasks"
                />
                <span>
                  <strong className="text-zinc-800">{filtered.length}</strong>{" "}
                  of {tasks.length} tasks
                </span>
              </label>
              {filtered.length === 0 && (
                <button
                  className="text-xs font-bold text-blue hover:underline"
                  onClick={clearFilters}
                >
                  Clear all filters
                </button>
              )}
            </div>
            {filtered.length ? (
              <div>
                {sortedTasks.map((task) => (
                  <TaskListRow
                    key={task.id}
                    task={task}
                    client={clients.find(
                      (client) => client.id === task.clientId,
                    )}
                    selected={selected.includes(task.id)}
                    onToggle={() => toggleSelected(task.id)}
                    onEdit={() => onEditTask(task)}
                    onDelete={() => onDeleteTask(task.id)}
                    updateTask={updateTask}
                  />
                ))}
              </div>
            ) : (
              <div className="p-6">
                <EmptyState
                  title="No matching tasks"
                  description="Adjust your filters or clear them to return to the full task workspace."
                  action="Clear filters"
                  onAction={clearFilters}
                />
              </div>
            )}
          </section>
        </div>
      )}
    </>
  );
}

function KanbanPage({
  clients,
  tasks,
  onNewTask,
  onEditTask,
  onDeleteTask,
  updateTask,
  setActivePage,
}) {
  return (
    <>
      <PageHeader
        eyebrow="Delivery pipeline"
        title="Kanban Board"
        description="Move client work through delivery stages without losing the details that matter."
        action={
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => setActivePage("Tasks")}>
              <ListChecks size={15} />
              List view
            </Button>
            <Button onClick={onNewTask}>
              <Plus size={15} />
              Create task
            </Button>
          </div>
        }
      />
      <section className="overflow-hidden rounded-3xl border border-zinc-200/80 bg-zinc-100/60 shadow-[0_10px_34px_rgba(24,24,27,0.045)]">
        <div className="flex items-center justify-between border-b border-zinc-200/80 bg-white/80 px-4 py-3 backdrop-blur sm:px-5">
          <p className="text-xs font-semibold text-zinc-500">
            <strong className="text-zinc-900">{tasks.length}</strong> tasks
            across {TASK_STATUSES.length} delivery stages
          </p>
          <p className="hidden text-[11px] font-medium text-zinc-400 sm:block">
            Use each card menu to edit, delete, or move work
          </p>
        </div>
        <div className="flex gap-4 overflow-x-auto p-4 pb-5 sm:p-5">
          {TASK_STATUSES.map((status) => {
            const list = tasks.filter((task) => task.status === status);
            return (
              <section
                key={status}
                className="w-[310px] shrink-0 rounded-2xl border border-zinc-200/80 bg-zinc-50/80 p-2.5 sm:w-[330px]"
              >
                <div className="sticky top-0 z-10 mb-2 flex items-center justify-between rounded-xl bg-white px-3 py-3 shadow-sm">
                  <div className="flex items-center gap-2">
                    <span
                      className={`h-2.5 w-2.5 rounded-full ${status === "Completed" ? "bg-emerald-500" : status === "In Progress" ? "bg-blue" : status === "Revision" ? "bg-orange-500" : "bg-zinc-400"}`}
                    />
                    <h2 className="text-sm font-bold tracking-tight text-zinc-800">
                      {status}
                    </h2>
                  </div>
                  <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-zinc-100 px-2 text-[11px] font-bold text-zinc-600">
                    {list.length}
                  </span>
                </div>
                <div className="space-y-2.5">
                  {list.map((task) => (
                    <KanbanTaskCard
                      key={task.id}
                      task={task}
                      client={clients.find(
                        (client) => client.id === task.clientId,
                      )}
                      onEdit={() => onEditTask(task)}
                      onDelete={() => onDeleteTask(task.id)}
                      updateTask={updateTask}
                    />
                  ))}
                  {!list.length && (
                    <div className="rounded-2xl border border-dashed border-zinc-300 bg-white/60 px-4 py-8 text-center">
                      <div className="mx-auto flex h-9 w-9 items-center justify-center rounded-xl bg-zinc-100 text-zinc-400">
                        <ClipboardList size={17} />
                      </div>
                      <p className="mt-3 text-xs font-semibold text-zinc-500">
                        No {status.toLowerCase()} tasks
                      </p>
                      <p className="mt-1 text-[11px] text-zinc-400">
                        New work can start here.
                      </p>
                    </div>
                  )}
                  <button
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-zinc-300 bg-white/70 px-3 py-3 text-xs font-semibold text-zinc-500 transition hover:border-blue/40 hover:bg-white hover:text-blue"
                    onClick={() => onNewTask({ status })}
                  >
                    <Plus size={14} />
                    Add task to {status}
                  </button>
                </div>
              </section>
            );
          })}
        </div>
      </section>
    </>
  );
}

function DailyLogsPage({ clients, logs }) {
  const completed = [...logs].sort((a, b) =>
    (b.completedAt || "").localeCompare(a.completedAt || ""),
  );
  const groups = completed.reduce((result, task) => {
    const date = task.completedAt || task.deadline || "Undated";
    if (!result[date]) result[date] = [];
    result[date].push(task);
    return result;
  }, {});
  const metrics = [
    {
      label: "Completed entries",
      value: String(completed.length).padStart(2, "0"),
      detail: "Generated from completed work",
      icon: CheckCircle2,
      tone: "bg-emerald-50 text-emerald-700",
    },
    {
      label: "Clients delivered",
      value: String(
        new Set(completed.map((task) => task.clientId)).size,
      ).padStart(2, "0"),
      detail: "Unique client workspaces",
      icon: Users,
      tone: "bg-blue/10 text-blue",
    },
    {
      label: "Proof-backed work",
      value: String(
        completed.filter((task) => task.attachments?.length || task.proofLink)
          .length,
      ).padStart(2, "0"),
      detail: "Entries with evidence",
      icon: Link2,
      tone: "bg-violet-50 text-violet-700",
    },
    {
      label: "Billable delivered",
      value: formatMoney(
        completed
          .filter((task) => task.billable)
          .reduce((sum, task) => sum + Number(task.amount), 0),
      ),
      detail: "Completed billable value",
      icon: CircleDollarSign,
      tone: "bg-orange-50 text-orange-700",
    },
  ];
  return (
    <>
      <PageHeader
        eyebrow="Delivery record"
        title="Daily Logs"
        description="A chronological record of completed client work, proof, and billable delivery."
      />
      <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <article
            key={metric.label}
            className="rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-[0_6px_22px_rgba(24,24,27,0.04)] sm:p-5"
          >
            <div
              className={`flex h-9 w-9 items-center justify-center rounded-xl ${metric.tone}`}
            >
              <metric.icon size={17} />
            </div>
            <p className="mt-5 text-2xl font-semibold tracking-tight text-zinc-900">
              {metric.value}
            </p>
            <p className="mt-1 text-xs font-bold text-zinc-700">
              {metric.label}
            </p>
            <p className="mt-1 text-[11px] text-zinc-400">{metric.detail}</p>
          </article>
        ))}
      </div>
      {completed.length ? (
        <section className="overflow-hidden rounded-3xl border border-zinc-200/80 bg-white shadow-[0_10px_34px_rgba(24,24,27,0.05)]">
          <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-4">
            <div>
              <h2 className="text-sm font-semibold text-zinc-900">
                Completed work ledger
              </h2>
              <p className="mt-1 text-xs text-zinc-400">
                Grouped by completion date
              </p>
            </div>
            <Badge className="border-blue/15 bg-blue/5 text-blue">
              {completed.length} entries
            </Badge>
          </div>
          <div className="divide-y divide-zinc-100">
            {Object.entries(groups).map(([date, entries]) => (
              <section key={date} className="grid lg:grid-cols-[160px_1fr]">
                <div className="border-b border-zinc-100 bg-zinc-50/70 px-5 py-5 lg:border-b-0 lg:border-r">
                  <p className="text-2xl font-light tracking-tight text-zinc-900">
                    {date === "Undated"
                      ? "—"
                      : new Date(`${date.slice(0, 10)}T00:00:00`)
                          .getDate()
                          .toString()
                          .padStart(2, "0")}
                  </p>
                  <p className="mt-1 text-xs font-semibold text-zinc-500">
                    {date === "Undated"
                      ? "Undated"
                      : formatDate(date, {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                  </p>
                  <p className="mt-2 text-[10px] font-bold uppercase tracking-[0.12em] text-zinc-400">
                    {entries.length} deliverable
                    {entries.length === 1 ? "" : "s"}
                  </p>
                </div>
                <div className="divide-y divide-zinc-100">
                  {entries.map((task) => {
                    const proofs = task.attachments?.length
                      ? task.attachments
                      : task.proofLink
                        ? [{ title: "View proof", url: task.proofLink }]
                        : [];
                    return (
                      <article
                        key={task.id}
                        className="grid gap-4 px-5 py-5 transition hover:bg-blue/[0.02] md:grid-cols-[minmax(240px,1fr)_150px_minmax(150px,.7fr)_120px] md:items-center"
                      >
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-sm font-semibold text-zinc-900">
                              {task.title}
                            </h3>
                            <Badge className="border-zinc-200 bg-zinc-50 text-zinc-600">
                              {task.category}
                            </Badge>
                          </div>
                          <p className="mt-1.5 line-clamp-2 text-xs leading-5 text-zinc-500">
                            {task.description ||
                              "No additional delivery notes."}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                            Client
                          </p>
                          <p className="mt-1 text-xs font-semibold text-zinc-700">
                            {clients.find(
                              (client) => client.id === task.clientId,
                            )?.name || "Deleted client"}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                            Proof
                          </p>
                          <div className="mt-1.5 flex flex-wrap gap-1.5">
                            {proofs.length ? (
                              proofs.map((proof) => (
                                <a
                                  key={proof.id || proof.url}
                                  className="inline-flex items-center gap-1 rounded-lg border border-blue/15 bg-blue/5 px-2 py-1 text-[11px] font-semibold text-blue transition hover:bg-blue/10"
                                  href={proof.url}
                                  target="_blank"
                                  rel="noreferrer"
                                >
                                  <Link2 size={11} />
                                  {proof.title}
                                </a>
                              ))
                            ) : (
                              <span className="text-xs text-zinc-400">
                                No proof attached
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="md:text-right">
                          {task.billable ? (
                            <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700">
                              {formatMoney(task.amount)}
                            </Badge>
                          ) : (
                            <span className="text-[11px] font-medium text-zinc-400">
                              Non-billable
                            </span>
                          )}
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        </section>
      ) : (
        <div className="rounded-3xl border border-zinc-200/80 bg-white p-6 shadow-sm">
          <EmptyState
            title="No completed work yet"
            description="Completed tasks will appear here automatically with their client, proof, and billing details."
          />
        </div>
      )}
    </>
  );
}

export function LegacyReportsPage({ clients, tasks, isFallback }) {
  const [clientId, setClientId] = useState(clients[0]?.id || "");
  const [month, setMonth] = useState("2026-06");
  const [generated, setGenerated] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [reportError, setReportError] = useState("");
  const [apiReport, setApiReport] = useState(null);
  useEffect(() => {
    if (!clients.some((client) => client.id === clientId))
      setClientId(clients[0]?.id || "");
  }, [clients, clientId]);
  const client = clients.find((item) => item.id === clientId);
  const scoped = tasks.filter((task) => task.clientId === clientId);
  const fallbackCompleted = scoped.filter(
    (task) =>
      task.status === "Completed" &&
      (task.completedAt || task.deadline).startsWith(month),
  );
  const fallbackPending = scoped.filter((task) => task.status !== "Completed");
  const fallbackBillable = scoped.filter((task) => task.billable);
  const completed = apiReport?.work_completed || fallbackCompleted;
  const pending = apiReport?.pending_tasks || fallbackPending;
  const billable = apiReport?.extra_billable_work?.items || fallbackBillable;
  const deliverables =
    apiReport?.deliverables ||
    completed.filter((task) =>
      ["Reels", "Print Design", "Creative"].includes(
        task.category,
      ),
    );
  const monthLabel = month
    ? new Intl.DateTimeFormat("en-US", {
        month: "long",
        year: "numeric",
        timeZone: "UTC",
      }).format(new Date(`${month}-01T00:00:00Z`))
    : "";
  const amountFor = (task) => Number(task.billable_amount ?? task.amount ?? 0);
  const reportText = `${client?.name || "Client"} — ${monthLabel}\n\nWork completed:\n${completed.map((task) => `- ${task.title}`).join("\n") || "- No completed work recorded"}\n\nDesigns/content delivered:\n${deliverables.map((task) => `- ${task.title}`).join("\n") || "- No design or content deliverables recorded"}\n\nPending tasks:\n${pending.map((task) => `- ${task.title} (${task.status})`).join("\n") || "- No pending tasks"}\n\nExtra billable work:\n${billable.map((task) => `- ${task.title}: ${formatMoney(amountFor(task))}`).join("\n") || "- No extra billable work"}\n\nNext month plan:\n- Complete pending deliverables\n- Review campaign performance\n- Confirm next month priorities with the client`;
  const generate = async () => {
    setGenerating(true);
    setReportError("");
    setApiReport(null);
    if (!isFallback) {
      try {
        const [year, monthNumber] = month.split("-").map(Number);
        setApiReport(await generateReportApi(clientId, monthNumber, year));
      } catch (requestError) {
        setReportError(
          `Report API failed. Showing cached task data. ${requestError.message}`,
        );
      }
    }
    setGenerated(true);
    setGenerating(false);
  };
  const copyReport = async () => {
    await navigator.clipboard.writeText(reportText);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };
  return (
    <>
      <PageHeading
        number="06"
        title="Reports"
        description="Generate a client delivery summary from completed and pending workspace tasks."
      />
      <div className="panel p-4 sm:p-5">
        <div className="grid gap-4 md:grid-cols-[1fr_1fr_auto]">
          <Field label="Client">
            <select
              className="field"
              value={clientId}
              onChange={(event) => {
                setClientId(event.target.value);
                setGenerated(false);
              }}
            >
              {clients.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Month">
            <input
              className="field"
              type="month"
              value={month}
              onChange={(event) => {
                setMonth(event.target.value);
                setGenerated(false);
              }}
            />
          </Field>
          <button
            className="button-primary self-end"
            disabled={!clientId || generating}
            onClick={generate}
          >
            <FileText size={16} />
            {generating ? "Generating…" : "Generate report"}
          </button>
        </div>
        {reportError && (
          <p className="mt-4 border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            {reportError}
          </p>
        )}
      </div>
      {generated ? (
        <article className="mx-auto mt-6 max-w-4xl border border-line bg-white">
          <header className="flex flex-col gap-4 border-b border-line p-6 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-blue">
                {monthLabel} client report
              </p>
              <h2 className="mt-2 text-2xl font-semibold">{client?.name}</h2>
              <p className="mt-1 text-sm text-zinc-500">
                Prepared by Brahmanda Tech
              </p>
            </div>
            <button className="button-secondary" onClick={copyReport}>
              <ClipboardCopy size={15} />
              {copied ? "Copied" : "Copy report"}
            </button>
          </header>
          <div className="p-6">
            <ReportSection title="Work completed">
              {completed.length ? (
                <ul className="space-y-2">
                  {completed.map((task) => (
                    <li
                      key={task.id}
                      className="flex justify-between gap-4 border-b border-line pb-2"
                    >
                      <span>{task.title}</span>
                      <span className="text-zinc-500">{task.category}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-zinc-500">
                  No completed work recorded for this month.
                </p>
              )}
            </ReportSection>
            <ReportSection title="Designs and content delivered">
              {deliverables.length ? (
                <p>
                  {deliverables.length} deliverable
                  {deliverables.length === 1 ? "" : "s"} completed:{" "}
                  {deliverables.map((task) => task.title).join(", ")}.
                </p>
              ) : (
                <p className="text-zinc-500">
                  No design or content deliverables recorded.
                </p>
              )}
            </ReportSection>
            <ReportSection title="Pending tasks">
              {pending.length ? (
                <div className="space-y-2">
                  {pending.map((task) => (
                    <div
                      key={task.id}
                      className="flex items-center justify-between gap-4 border-b border-line pb-2"
                    >
                      <span>{task.title}</span>
                      <StatusBadge status={task.status} />
                    </div>
                  ))}
                </div>
              ) : (
                <p>No pending tasks.</p>
              )}
            </ReportSection>
            <ReportSection title="Extra billable work">
              {billable.length ? (
                <div className="space-y-2">
                  {billable.map((task) => (
                    <div key={task.id} className="flex justify-between">
                      <span>{task.title}</span>
                      <strong>{formatMoney(amountFor(task))}</strong>
                    </div>
                  ))}
                  <div className="flex justify-between border-t border-line pt-3">
                    <span>Total</span>
                    <strong>
                      {formatMoney(
                        apiReport?.extra_billable_work?.total ??
                          billable.reduce(
                            (sum, task) => sum + amountFor(task),
                            0,
                          ),
                      )}
                    </strong>
                  </div>
                </div>
              ) : (
                <p>No extra billable work recorded.</p>
              )}
            </ReportSection>
            <ReportSection title="Next month plan">
              <ul className="list-disc space-y-1 pl-5">
                {(
                  apiReport?.next_month_plan || [
                    "Complete pending deliverables and revisions.",
                    "Review campaign performance and report findings.",
                    "Confirm next month priorities with the client.",
                  ]
                ).map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </ReportSection>
          </div>
        </article>
      ) : (
        <div className="mt-6">
          <EmptyState
            title="Report preview is ready to generate"
            description="Choose a client and month, then generate a report from the current task data."
          />
        </div>
      )}
    </>
  );
}

function BillingPage({ clients, billings, updateTask }) {
  const billable = billings;
  const total = billable.reduce((sum, task) => sum + Number(task.amount), 0);
  const paid = billable
    .filter((task) => task.paymentStatus === "Paid")
    .reduce((sum, task) => sum + Number(task.amount), 0);
  const unpaidCount = billable.filter(
    (task) => task.paymentStatus !== "Paid",
  ).length;
  const metrics = [
    {
      label: "Total billable",
      value: formatMoney(total),
      detail: `${billable.length} work items`,
      icon: CircleDollarSign,
      tone: "bg-blue/10 text-blue",
    },
    {
      label: "Paid",
      value: formatMoney(paid),
      detail: `${billable.filter((task) => task.paymentStatus === "Paid").length} settled`,
      icon: CheckCircle2,
      tone: "bg-emerald-50 text-emerald-700",
    },
    {
      label: "Outstanding",
      value: formatMoney(total - paid),
      detail: "Awaiting payment",
      icon: Clock3,
      tone: "bg-orange-50 text-orange-700",
    },
    {
      label: "Unpaid items",
      value: String(unpaidCount).padStart(2, "0"),
      detail: unpaidCount ? "Requires follow-up" : "Nothing outstanding",
      icon: ReceiptText,
      tone: "bg-red-50 text-red-700",
    },
  ];
  return (
    <>
      <PageHeader
        eyebrow="Revenue operations"
        title="Billing"
        description="Track billable client work, invoice progress, and payment collection in one ledger."
      />
      <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <article
            key={metric.label}
            className="rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-[0_6px_22px_rgba(24,24,27,0.04)] sm:p-5"
          >
            <div className="flex items-start justify-between">
              <span
                className={`flex h-9 w-9 items-center justify-center rounded-xl ${metric.tone}`}
              >
                <metric.icon size={17} />
              </span>
              <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-zinc-300">
                NPR
              </span>
            </div>
            <p className="mt-5 text-2xl font-semibold tracking-tight text-zinc-900">
              {metric.value}
            </p>
            <p className="mt-1 text-xs font-bold text-zinc-700">
              {metric.label}
            </p>
            <p className="mt-1 text-[11px] text-zinc-400">{metric.detail}</p>
          </article>
        ))}
      </div>
      {billable.length ? (
        <section className="overflow-hidden rounded-3xl border border-zinc-200/80 bg-white shadow-[0_10px_34px_rgba(24,24,27,0.05)]">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-100 px-5 py-4">
            <div>
              <h2 className="text-sm font-semibold text-zinc-900">
                Billable work ledger
              </h2>
              <p className="mt-1 text-xs text-zinc-400">
                Payment and invoice status update immediately
              </p>
            </div>
            <Badge className="border-zinc-200 bg-zinc-50 text-zinc-600">
              {billable.length} items
            </Badge>
          </div>
          <div className="hidden grid-cols-[minmax(260px,1.4fr)_150px_130px_150px_150px] gap-4 border-b border-zinc-100 bg-zinc-50/70 px-5 py-3 text-[10px] font-bold uppercase tracking-[0.12em] text-zinc-400 lg:grid">
            <span>Client work</span>
            <span>Date</span>
            <span>Amount</span>
            <span>Payment</span>
            <span>Invoice</span>
          </div>
          <div className="divide-y divide-zinc-100">
            {billable.map((task) => (
              <article
                key={task.id}
                className="grid gap-4 px-5 py-5 transition hover:bg-blue/[0.02] lg:grid-cols-[minmax(260px,1.4fr)_150px_130px_150px_150px] lg:items-center"
              >
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-semibold text-zinc-900">
                      {task.title}
                    </h3>
                    <StatusBadge status={task.status} />
                  </div>
                  <p className="mt-1.5 text-xs font-medium text-zinc-500">
                    {task.clientName ||
                      clients.find((client) => client.id === task.clientId)
                        ?.name ||
                      "Deleted client"}
                  </p>
                  <p className="mt-1 text-[11px] text-zinc-400">
                    Related task #{task.id}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 lg:hidden">
                    Date
                  </p>
                  <p className="mt-1 text-xs font-semibold text-zinc-600">
                    {task.completedAt || task.deadline
                      ? formatDate(task.completedAt || task.deadline)
                      : "No date"}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 lg:hidden">
                    Amount
                  </p>
                  <p className="mt-1 text-sm font-bold text-zinc-900">
                    {formatMoney(task.amount)}
                  </p>
                </div>
                <label>
                  <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-zinc-400 lg:hidden">
                    Payment
                  </span>
                  <select
                    className={`w-full rounded-xl border px-3 py-2 text-xs font-bold outline-none transition focus:ring-4 focus:ring-blue/10 ${task.paymentStatus === "Paid" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-orange-200 bg-orange-50 text-orange-700"}`}
                    value={task.paymentStatus || "Unpaid"}
                    onChange={(event) =>
                      updateTask(task.id, { paymentStatus: event.target.value })
                    }
                  >
                    <option>Unpaid</option>
                    <option>Paid</option>
                  </select>
                </label>
                <label>
                  <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-zinc-400 lg:hidden">
                    Invoice
                  </span>
                  <select
                    className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-bold text-zinc-600 outline-none transition focus:border-blue/40 focus:ring-4 focus:ring-blue/10"
                    value={task.invoiceStatus || "Not invoiced"}
                    onChange={(event) =>
                      updateTask(task.id, { invoiceStatus: event.target.value })
                    }
                  >
                    <option>Not invoiced</option>
                    <option>Draft</option>
                    <option>Sent</option>
                  </select>
                </label>
              </article>
            ))}
          </div>
        </section>
      ) : (
        <div className="rounded-3xl border border-zinc-200/80 bg-white p-6 shadow-sm">
          <EmptyState
            title="No billable work yet"
            description="Tasks marked as billable will appear here with payment and invoice tracking."
          />
        </div>
      )}
    </>
  );
}

function WorkspaceApp({ user, onLogout, onUserUpdate }) {
  const workspace = useWorkspace();
  const initialClientId =
    window.location.hash.match(/^#clients\/(.+)$/)?.[1] || "";
  const [activePage, setActivePage] = useState(
    initialClientId ? "Client Detail" : "Dashboard",
  );
  const [selectedClientId, setSelectedClientId] = useState(
    initialClientId ? decodeURIComponent(initialClientId) : "",
  );
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [taskModal, setTaskModal] = useState(null);
  const [clientModal, setClientModal] = useState(null);
  const [quickTaskDefaults, setQuickTaskDefaults] = useState(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [generatingNotifications, setGeneratingNotifications] = useState(false);
  const [generatingRecurring, setGeneratingRecurring] = useState(false);
  const [recurringMessage, setRecurringMessage] = useState("");
  const [activityFilters, setActivityFilters] = useState({
    user_id: "",
    client_id: "",
    module: "",
    action_type: "",
    date_from: "",
    date_to: "",
  });
  const [activityResults, setActivityResults] = useState([]);
  const [recentClientIds, setRecentClientIds] = useState(() => {
    try {
      return JSON.parse(
        localStorage.getItem("brahmanda-recent-clients") || "[]",
      );
    } catch {
      return [];
    }
  });
  const [recentTaskIds, setRecentTaskIds] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("brahmanda-recent-tasks") || "[]");
    } catch {
      return [];
    }
  });

  const newTask = (defaults = {}) =>
    setTaskModal({
      ...blankTask(workspace.clients[0]?.id),
      priority: workspace.settings?.default_task_priority || "Medium",
      ...defaults,
    });
  const quickTask = useCallback(
    (defaults = {}) =>
      setQuickTaskDefaults({
        clientId: selectedClientId || workspace.clients[0]?.id,
        priority: workspace.settings?.default_task_priority || "Medium",
        ...defaults,
      }),
    [
      selectedClientId,
      workspace.clients,
      workspace.settings?.default_task_priority,
    ],
  );
  const deleteTask = (id) =>
    window.confirm("Delete this task? This cannot be undone.") &&
    workspace.deleteTask(id);
  const deleteClient = (id) =>
    window.confirm("Delete this client and all of its tasks?") &&
    workspace.deleteClient(id);
  const navigatePage = (page) => {
    setActivePage(page);
    if (page !== "Client Detail") {
      setSelectedClientId("");
      if (window.location.hash.startsWith("#clients/"))
        window.history.pushState(
          {},
          "",
          `${window.location.pathname}${window.location.search}`,
        );
    }
  };
  const openClient = (id) => {
    const nextRecent = [
      id,
      ...recentClientIds.filter((item) => item !== id),
    ].slice(0, 6);
    setRecentClientIds(nextRecent);
    localStorage.setItem(
      "brahmanda-recent-clients",
      JSON.stringify(nextRecent),
    );
    setSelectedClientId(id);
    setActivePage("Client Detail");
    window.history.pushState(
      { clientId: id },
      "",
      `#clients/${encodeURIComponent(id)}`,
    );
  };
  const loadNotifications = useCallback(async () => {
    if (workspace.isFallback) {
      setNotifications([]);
      return [];
    }
    const rows = await getNotifications({ limit: 200 });
    setNotifications(rows);
    return rows;
  }, [workspace.isFallback]);
  useEffect(() => {
    if (workspace.loading || workspace.isFallback) return;
    let active = true;
    const refresh = async () => {
      try {
        await generateNotificationsApi();
        if (active) await loadNotifications();
      } catch {
        if (active) setNotifications([]);
      }
    };
    refresh();
    return () => {
      active = false;
    };
  }, [loadNotifications, workspace.isFallback, workspace.loading]);
  const readNotification = async (id) => {
    setNotifications((items) =>
      items.map((item) =>
        String(item.id) === String(id)
          ? { ...item, is_read: 1, read_at: new Date().toISOString() }
          : item,
      ),
    );
    if (!workspace.isFallback) await markNotificationRead(id);
  };
  const readAllNotifications = async () => {
    setNotifications((items) =>
      items.map((item) => ({
        ...item,
        is_read: 1,
        read_at: item.read_at || new Date().toISOString(),
      })),
    );
    if (!workspace.isFallback) await markAllNotificationsRead();
  };
  const removeNotification = async (id) => {
    setNotifications((items) =>
      items.filter((item) => String(item.id) !== String(id)),
    );
    if (!workspace.isFallback) await deleteNotificationApi(id);
  };
  const openNotification = async (notification) => {
    if (Number(notification.is_read) !== 1)
      await readNotification(notification.id);
    const task =
      notification.related_module === "tasks"
        ? workspace.tasks.find(
            (item) => String(item.id) === String(notification.related_id),
          )
        : null;
    if (task) {
      setTaskModal(task);
      return;
    }
    navigatePage(notification.action_url || "Notifications");
  };
  const generateNotificationAlerts = async () => {
    if (workspace.isFallback) return;
    setGeneratingNotifications(true);
    try {
      await generateNotificationsApi();
      await loadNotifications();
      await workspace.refreshActivities();
    } finally {
      setGeneratingNotifications(false);
    }
  };
  useEffect(() => {
    const syncRoute = () => {
      const id = window.location.hash.match(/^#clients\/(.+)$/)?.[1];
      if (id) {
        setSelectedClientId(decodeURIComponent(id));
        setActivePage("Client Detail");
      } else {
        setSelectedClientId("");
        setActivePage((current) =>
          current === "Client Detail" ? "Clients" : current,
        );
      }
    };
    window.addEventListener("popstate", syncRoute);
    window.addEventListener("hashchange", syncRoute);
    return () => {
      window.removeEventListener("popstate", syncRoute);
      window.removeEventListener("hashchange", syncRoute);
    };
  }, []);
  useEffect(() => {
    const shortcuts = (event) => {
      if (event.key === "Escape") {
        setSearchOpen(false);
        setQuickAddOpen(false);
        return;
      }
      if (!(event.ctrlKey || event.metaKey)) return;
      if (event.key.toLowerCase() === "k") {
        event.preventDefault();
        setSearchOpen(true);
        setQuickAddOpen(false);
      }
      if (event.key.toLowerCase() === "n") {
        event.preventDefault();
        quickTask();
        setSearchOpen(false);
        setQuickAddOpen(false);
      }
    };
    window.addEventListener("keydown", shortcuts);
    return () => window.removeEventListener("keydown", shortcuts);
  }, [quickTask]);
  useEffect(() => {
    let active = true;
    const load = async () => {
      const params = Object.fromEntries(
        Object.entries(activityFilters).filter(([, value]) => value),
      );
      if (workspace.isFallback) {
        const filtered = (workspace.activities || []).filter(
          (item) =>
            (!params.user_id || item.userId === params.user_id) &&
            (!params.client_id || item.clientId === params.client_id) &&
            (!params.module || item.module === params.module) &&
            (!params.action_type || item.actionType === params.action_type) &&
            (!params.date_from ||
              String(item.createdAt).slice(0, 10) >= params.date_from) &&
            (!params.date_to ||
              String(item.createdAt).slice(0, 10) <= params.date_to),
        );
        if (active) setActivityResults(filtered);
        return;
      }
      try {
        const rows = await getActivityLogs({ ...params, limit: 500 });
        if (active) setActivityResults(rows.map(activityFromApi));
      } catch {
        if (active) setActivityResults(workspace.activities || []);
      }
    };
    if (!workspace.loading) load();
    return () => {
      active = false;
    };
  }, [
    activityFilters,
    workspace.activities,
    workspace.isFallback,
    workspace.loading,
  ]);
  const selectedClient = workspace.clients.find(
    (client) => client.id === selectedClientId,
  );
  const saveTaskWithRecent = async (task) => {
    await workspace.saveTask(task);
    await loadNotifications().catch(() => {});
    if (task.id) {
      const nextRecent = [
        task.id,
        ...recentTaskIds.filter((item) => item !== task.id),
      ].slice(0, 6);
      setRecentTaskIds(nextRecent);
      localStorage.setItem(
        "brahmanda-recent-tasks",
        JSON.stringify(nextRecent),
      );
    }
  };
  const selectSearchResult = (result) => {
    setSearchOpen(false);
    if (result.type === "Client") openClient(result.id);
    if (result.type === "Task") setTaskModal(result.task);
    if (result.type === "Report") navigatePage("Reports");
    if (result.type === "Proof")
      window.open(result.url, "_blank", "noopener,noreferrer");
  };
  const quickAddActions = {
    onAddTask: () => quickTask({ modeTitle: "Quick add task" }),
    onAddClient: () => setClientModal({}),
    onAddDailyLog: () =>
      quickTask({
        modeTitle: "Add daily log",
        status: "Completed",
        deadline: TODAY,
      }),
    onAddBilling: () =>
      quickTask({ modeTitle: "Add billing item", billable: true }),
  };
  const generateDueRecurring = async () => {
    setGeneratingRecurring(true);
    setRecurringMessage("");
    const result = await workspace.generateRecurringTasks();
    await loadNotifications().catch(() => {});
    const count = Number(result?.generated_count || 0);
    setRecurringMessage(
      count
        ? `${count} recurring task occurrence${count === 1 ? "" : "s"} generated.`
        : "No recurring tasks are currently due.",
    );
    setGeneratingRecurring(false);
  };
  const refreshWorkspaceEvents = async () => {
    await Promise.all([
      workspace.refreshActivities(),
      loadNotifications().catch(() => []),
    ]);
  };
  const shared = {
    clients: workspace.clients,
    users: workspace.users || [],
    tasks: workspace.tasks,
    activities: workspace.activities,
    notifications,
    connectionStatus: workspace.connectionStatus,
    onNewTask: newTask,
    onEditTask: setTaskModal,
    onDeleteTask: deleteTask,
    updateTask: workspace.updateTask,
    setActivePage: navigatePage,
    onOpenNotification: openNotification,
  };
  const pages = {
    Dashboard: <Dashboard {...shared} />,
    Clients: (
      <ClientsPage
        clients={workspace.clients}
        tasks={workspace.tasks}
        onNewClient={() => setClientModal({})}
        onEditClient={setClientModal}
        onDeleteClient={deleteClient}
        onViewClient={openClient}
      />
    ),
    "Client Detail": selectedClient ? (
      <ClientDetailPage
        client={selectedClient}
        tasks={workspace.tasks}
        billings={workspace.billings}
        activities={(workspace.activities || [])
          .filter((activity) => activity.clientId === selectedClient.id)
          .slice(0, 20)}
        isFallback={workspace.isFallback}
        onBack={() => navigatePage("Clients")}
        onNewTask={newTask}
        onEditTask={setTaskModal}
        onDeleteTask={deleteTask}
        updateTask={workspace.updateTask}
      />
    ) : (
      <EmptyState
        title="Client not found"
        description="This client may have been removed or the link is invalid."
        action="Back to clients"
        onAction={() => navigatePage("Clients")}
      />
    ),
    Tasks: <TasksPage {...shared} />,
    "Kanban Board": <KanbanPage {...shared} />,
    "Daily Logs": (
      <DailyLogsPage clients={workspace.clients} logs={workspace.logs} />
    ),
    Reminders: (
      <RemindersPage
        clients={workspace.clients}
        tasks={workspace.tasks}
        onEditTask={setTaskModal}
      />
    ),
    Calendar: (
      <CalendarPage
        clients={workspace.clients}
        tasks={workspace.tasks}
        onEditTask={setTaskModal}
        updateTask={workspace.updateTask}
      />
    ),
    "Recurring Tasks": (
      <RecurringTasksPage
        clients={workspace.clients}
        tasks={workspace.tasks}
        onEditTask={setTaskModal}
        updateTask={workspace.updateTask}
        onGenerate={generateDueRecurring}
        generating={generatingRecurring}
        generationMessage={recurringMessage}
      />
    ),
    Notifications: (
      <NotificationsPage
        notifications={notifications}
        clients={workspace.clients}
        onOpen={openNotification}
        onRead={readNotification}
        onReadAll={readAllNotifications}
        onDelete={removeNotification}
        onGenerate={generateNotificationAlerts}
        generating={generatingNotifications}
      />
    ),
    Activity: (
      <ActivityPage
        activities={activityResults}
        sourceActivities={workspace.activities || []}
        clients={workspace.clients}
        filters={activityFilters}
        setFilters={setActivityFilters}
      />
    ),
    Reports: (
      <MonthlyReportsPage
        clients={workspace.clients}
        tasks={workspace.tasks}
        settings={workspace.settings || DEFAULT_SETTINGS}
        isFallback={workspace.isFallback}
        onActivityRefresh={refreshWorkspaceEvents}
      />
    ),
    Billing: (
      <BillingPage
        clients={workspace.clients}
        billings={workspace.billings}
        updateTask={workspace.updateTask}
      />
    ),
    Team: (
      <TeamPage
        currentUser={user}
        onCurrentUserUpdate={onUserUpdate}
        onActivityRefresh={workspace.refreshActivities}
      />
    ),
    Settings: (
      <SettingsPage
        settings={workspace.settings || DEFAULT_SETTINGS}
        currentUser={user}
        onSaveSettings={workspace.saveSettings}
        onCurrentUserUpdate={onUserUpdate}
        resetWorkspace={workspace.resetWorkspace}
      />
    ),
  };

  return (
    <div className="min-h-screen bg-canvas">
      <Sidebar
        activePage={activePage}
        setActivePage={navigatePage}
        open={sidebarOpen}
        setOpen={setSidebarOpen}
        collapsed={sidebarCollapsed}
        settings={workspace.settings || DEFAULT_SETTINGS}
      />
      <div className={sidebarCollapsed ? "lg:pl-20" : "lg:pl-64"}>
        <Topbar
          activePage={
            activePage === "Client Detail"
              ? selectedClient?.name || "Client Detail"
              : activePage
          }
          setOpen={setSidebarOpen}
          onToggleCollapse={() => setSidebarCollapsed((value) => !value)}
          collapsed={sidebarCollapsed}
          onOpenSearch={() => {
            setSearchOpen(true);
            setQuickAddOpen(false);
            setNotificationsOpen(false);
          }}
          quickAddOpen={quickAddOpen}
          setQuickAddOpen={setQuickAddOpen}
          quickAddActions={quickAddActions}
          settings={workspace.settings || DEFAULT_SETTINGS}
          user={user}
          onLogout={onLogout}
          notifications={notifications}
          notificationsOpen={notificationsOpen}
          setNotificationsOpen={setNotificationsOpen}
          onOpenNotification={openNotification}
          onReadAllNotifications={readAllNotifications}
          onViewNotifications={() => navigatePage("Notifications")}
        />
        <main className="mx-auto w-full max-w-[1520px] p-4 md:p-6 lg:p-8">
          {workspace.error && (
            <div className="mb-5 border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              {workspace.error}
            </div>
          )}
          {workspace.loading ? (
            <div className="panel flex min-h-64 items-center justify-center">
              <div className="text-center">
                <div className="mx-auto h-7 w-7 animate-spin border-2 border-zinc-200 border-t-blue" />
                <p className="mt-3 text-sm text-zinc-500">
                  Loading workspace data…
                </p>
              </div>
            </div>
          ) : (
            pages[activePage]
          )}
        </main>
      </div>
      <Modal
        open={Boolean(taskModal)}
        onClose={() => setTaskModal(null)}
        title={taskModal?.id ? "Edit task" : "Create task"}
        description="Task changes update every workspace view."
        size="max-w-5xl"
      >
        {taskModal && (
          <TaskForm
            task={taskModal}
            clients={workspace.clients}
            users={workspace.users || []}
            onSave={saveTaskWithRecent}
            onClose={() => setTaskModal(null)}
            onNotificationsRefresh={loadNotifications}
          />
        )}
      </Modal>
      <Modal
        open={Boolean(quickTaskDefaults)}
        onClose={() => setQuickTaskDefaults(null)}
        title={quickTaskDefaults?.modeTitle || "Quick add task"}
        description="Create essential daily work without opening the full task form."
      >
        {quickTaskDefaults && (
          <QuickTaskForm
            clients={workspace.clients}
            defaults={quickTaskDefaults}
            onSave={saveTaskWithRecent}
            onClose={() => setQuickTaskDefaults(null)}
          />
        )}
      </Modal>
      <Modal
        open={Boolean(clientModal)}
        onClose={() => setClientModal(null)}
        title={clientModal?.id ? "Edit client" : "Add client"}
        description="Create a client workspace for tasks, reports, and billing."
      >
        {clientModal && (
          <ClientForm
            client={clientModal.id ? clientModal : null}
            onSave={workspace.saveClient}
            onClose={() => setClientModal(null)}
          />
        )}
      </Modal>
      <GlobalSearch
        open={searchOpen}
        clients={workspace.clients}
        tasks={workspace.tasks}
        reports={workspace.reports || []}
        recentClientIds={recentClientIds}
        recentTaskIds={recentTaskIds}
        onClose={() => setSearchOpen(false)}
        onSelect={selectSearchResult}
      />
    </div>
  );
}

export default function App() {
  const portalMatch = window.location.pathname.match(/^\/portal\/([^/]+)\/?$/i);
  const [user, setUser] = useState(() => getCurrentUser());

  useEffect(() => {
    const handleUnauthorized = () => setUser(null);
    window.addEventListener("auth:unauthorized", handleUnauthorized);
    return () =>
      window.removeEventListener("auth:unauthorized", handleUnauthorized);
  }, []);

  if (portalMatch) {
    return <ClientPortalPage token={portalMatch[1]} />;
  }

  if (!user) {
    return <LoginPage onLogin={setUser} />;
  }

  const handleLogout = async () => {
    await logout();
    setUser(null);
  };

  const handleUserUpdate = (updatedUser) => {
    updateCurrentUser(updatedUser);
    setUser(updatedUser);
  };

  return (
    <WorkspaceApp
      user={user}
      onLogout={handleLogout}
      onUserUpdate={handleUserUpdate}
    />
  );
}
