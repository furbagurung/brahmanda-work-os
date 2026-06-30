import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  closestCorners,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  ArrowUpDown,
  BarChart3,
  BellRing,
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
  Filter,
  FileText,
  History,
  ImagePlus,
  LayoutDashboard,
  Link2,
  ListChecks,
  LogOut,
  Menu,
  MessageSquare,
  Paperclip,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  ReceiptText,
  Repeat2,
  Search,
  Settings,
  SlidersHorizontal,
  Table2,
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
  CATEGORY_COMBOBOX_OPTIONS,
  CLIENT_STATUS_COMBOBOX_OPTIONS,
  ClientCard,
  ClientCombobox,
  DeadlineBadge,
  EmptyState,
  Modal,
  ModernSelect,
  PageHeader,
  PriorityBadge,
  ProofLink,
  ReportSection,
  StatCard,
  StatusBadge,
  Table,
  TASK_STATUS_COMBOBOX_OPTIONS,
  getBillingTone,
  getStatusLabel,
  getStatusDotTone,
} from "./components";
import {
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
  generateMonthlyInvoice,
  updateTaskChecklist,
  uploadTaskAttachment,
  uploadClientLogo,
  removeClientLogo,
  getAssignableUsers,
  logFromApi,
  markTaskCompleted,
  taskFromApi,
  taskToApi,
  updateBilling as updateBillingApi,
  updateMonthlyInvoice,
  attachmentFromApi,
  monthlyInvoiceFromApi,
  reportFromApi,
  updateClient as updateClientApi,
  updateTask as updateTaskApi,
  reorderTasks as reorderTasksApi,
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
import { optimizeClientLogo } from "./clientLogoUtils";
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
const PAGE_ROUTES = {
  Dashboard: "dashboard",
  Clients: "clients",
  Tasks: "tasks",
  "Daily Logs": "daily-logs",
  Reminders: "reminders",
  Calendar: "calendar",
  "Recurring Tasks": "recurring-tasks",
  Notifications: "notifications",
  Activity: "activity",
  Reports: "reports",
  Billing: "billing",
  Team: "team",
  Settings: "settings",
};
const ROUTE_PAGES = Object.fromEntries(
  Object.entries(PAGE_ROUTES).map(([page, route]) => [route, page]),
);

function normalizeRoutePath(value) {
  return String(value || "")
    .replace(/^#/, "")
    .replace(/^\//, "")
    .replace(/\/$/, "");
}

function routeFromLocation() {
  const hash = normalizeRoutePath(window.location.hash);
  if (hash) return hash;
  const path = normalizeRoutePath(window.location.pathname);
  if (path) return `${path}${window.location.search || ""}`;
  return "";
}

function routeStateFromLocation() {
  const route = routeFromLocation();
  if (!route) return { page: "Dashboard", taskView: "table", clientId: "" };
  const [pathPart, query = ""] = route.split("?");
  const path = normalizeRoutePath(pathPart);
  const params = new URLSearchParams(query);

  if (path === "kanban") {
    return { page: "Tasks", taskView: "board", clientId: "" };
  }
  if (path === "tasks") {
    const requestedView = params.get("view");
    const view = ["table", "board", "calendar", "list"].includes(requestedView)
      ? requestedView
      : "table";
    return { page: "Tasks", taskView: view, clientId: "" };
  }
  if (path.startsWith("clients/")) {
    const clientId = path.slice("clients/".length);
    return {
      page: clientId ? "Client Detail" : "Clients",
      taskView: "table",
      clientId: clientId ? decodeURIComponent(clientId) : "",
    };
  }
  if (path === "clients") {
    return { page: "Clients", taskView: "table", clientId: "" };
  }
  const page = ROUTE_PAGES[path];
  return { page: page || "Dashboard", taskView: "table", clientId: "" };
}

function routeForPage(page, { taskView = "table", clientId = "" } = {}) {
  if (page === "Client Detail" && clientId) {
    return `#/clients/${encodeURIComponent(clientId)}`;
  }
  if (page === "Tasks") {
    const view = ["table", "board", "calendar", "list"].includes(taskView)
      ? taskView
      : "table";
    return `#/tasks?view=${view}`;
  }
  return `#/${PAGE_ROUTES[page] || PAGE_ROUTES.Dashboard}`;
}

function pushAppRoute(page, options = {}, replace = false) {
  const route = routeForPage(page, options);
  if (window.location.hash === route) return;
  const nextUrl = `${window.location.pathname}${window.location.search}${route}`;
  const method = replace ? "replaceState" : "pushState";
  window.history[method]({}, "", nextUrl);
}

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
        monthlyInvoices: parsed.monthlyInvoices || [],
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
        monthlyInvoices: [],
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
      monthlyInvoices: (billing.monthly_invoices || []).map(
        monthlyInvoiceFromApi,
      ),
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
      const nextTaskOrder = exists
        ? Number(task.taskOrder ?? previous?.taskOrder ?? 0)
        : topTaskOrderForStatus(current.tasks, task.status);
      const normalized = {
        ...task,
        taskOrder: nextTaskOrder,
        amount: task.billable ? Number(task.amount || 0) : 0,
        completedAt,
        createdAt: exists ? task.createdAt || previous?.createdAt || "" : new Date().toISOString(),
        updatedAt: new Date().toISOString(),
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
      const currentTask = current.tasks.find((task) => task.id === id);
      const movedTaskOrder =
        patch.status && currentTask && patch.status !== currentTask.status
          ? Math.max(
              0,
              ...current.tasks
                .filter((task) => task.status === patch.status)
                .map((task) => Number(task.taskOrder || 0)),
            ) + 1000
          : null;
      const tasks = current.tasks.map((task) => {
        if (task.id !== id) return task;
        const next = { ...task, ...patch };
        if (movedTaskOrder !== null) next.taskOrder = movedTaskOrder;
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

  const runWithFallback = async (apiAction, fallbackAction, rethrow = false) => {
    if (isFallback) {
      return fallbackAction();
    }
    setError("");
    try {
      const result = await apiAction();
      await loadApiData();
      return result;
    } catch (requestError) {
      toast.error(requestError.message || "API request failed.");
      if (rethrow) {
        setError(`API request failed. ${requestError.message}`);
        throw requestError;
      }
      setIsFallback(true);
      setConnectionStatus("error");
      setError(
        `API request failed. Change saved in demo mode only. ${requestError.message}`,
      );
      return fallbackAction();
    }
  };

  const saveTask = async (task) => {
    const exists = workspace.tasks.some((item) => item.id === task.id);
    const result = await runWithFallback(
      async () => {
        const current = workspace.tasks.find((item) => item.id === task.id);
        const response = exists
          ? await updateTaskApi(task.id, taskToApi(task))
          : await createTaskApi(taskToApi(task));
        const taskId = exists ? task.id : String(response.id);
        if (!exists) {
          saveTaskLocal({
            ...task,
            id: taskId,
            taskOrder: topTaskOrderForStatus(workspace.tasks, task.status),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
        }
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
    toast.success(exists ? "Task updated." : "Task created.");
    return result;
  };

  const updateTask = async (id, patch, options = {}) => {
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
      Boolean(options.rethrow),
    );
    if (options.silent) return;
    if (options.feedbackMessage) toast.success(options.feedbackMessage);
    else if ("status" in patch) toast.success("Task status updated.");
    else if ("paymentStatus" in patch || "invoiceStatus" in patch)
      toast.success("Billing item updated.");
    else toast.success("Task updated.");
  };

  const reorderBoardTasks = async (items, feedbackMessage) => {
    await runWithFallback(
      () => reorderTasksApi(items),
      () =>
        setWorkspace((current) => {
          const updates = new Map(items.map((item) => [String(item.id), item]));
          const tasks = current.tasks.map((task) => {
            const update = updates.get(String(task.id));
            return update
              ? {
                  ...task,
                  status: update.status,
                  taskOrder: Number(update.task_order),
                  completedAt:
                    update.status === "Completed"
                      ? task.completedAt || TODAY
                      : "",
                }
              : task;
          });
          return {
            ...current,
            tasks,
            logs: tasks.filter((task) => task.status === "Completed"),
            billings: tasks.filter((task) => task.billable),
          };
        }),
      true,
    );
    if (feedbackMessage) toast.success(feedbackMessage);
  };

  const deleteTask = async (id) => {
    const result = await runWithFallback(
      () => deleteTaskApi(id),
      () =>
        setWorkspace((current) => ({
          ...current,
          tasks: current.tasks.filter((task) => task.id !== id),
          logs: current.logs.filter((log) => log.taskId !== id),
          billings: current.billings.filter((billing) => billing.id !== id),
        })),
    );
    toast.success("Task deleted.");
    return result;
  };

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

  const saveClient = async (client, logoChange = {}, feedbackMessage = "") => {
    const exists = workspace.clients.some((item) => item.id === client.id);
    const result = await runWithFallback(
      async () => {
        const saved = exists
          ? await updateClientApi(client.id, clientToApi(client))
          : await createClientApi(clientToApi(client));
        const clientId = String(client.id || saved?.id || "");
        if (logoChange.removeLogo && clientId) {
          await removeClientLogo(clientId);
        }
        if (logoChange.logoFile && clientId) {
          await uploadClientLogo(clientId, logoChange.logoFile);
        }
        return { id: clientId };
      },
      () => saveClientLocal(client),
      Boolean(logoChange.logoFile || logoChange.removeLogo),
    );
    toast.success(feedbackMessage || (exists ? "Client updated." : "Client created."));
    if (logoChange.logoFile) toast.success("Client logo uploaded.");
    if (logoChange.removeLogo) toast.success("Client logo removed.");
    return result;
  };

  const saveClientLogo = async (id, file) => {
    const result = await runWithFallback(
      () => uploadClientLogo(id, file),
      () => {
        throw new Error("Client logo uploads require the backend API.");
      },
      true,
    );
    toast.success("Client logo uploaded.");
    return result;
  };

  const clearClientLogo = async (id) => {
    const result = await runWithFallback(
      () => removeClientLogo(id),
      () => {
        throw new Error("Client logo removal requires the backend API.");
      },
      true,
    );
    toast.success("Client logo removed.");
    return result;
  };

  const deleteClient = async (id) => {
    const result = await runWithFallback(
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
          monthlyInvoices: (current.monthlyInvoices || []).filter(
            (invoice) => invoice.clientId !== id,
          ),
        })),
    );
    toast.success("Client deleted.");
    return result;
  };

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
      toast.success("Settings saved.");
      return settings;
    }
    const saved = await updateSettingsApi(settings);
    setWorkspace((current) => ({ ...current, settings: saved }));
    setWorkspaceCurrency(saved.currency);
    setWorkspaceDateFormat(saved.date_format);
    await refreshActivities();
    toast.success("Settings saved.");
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
      monthlyInvoices: [],
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
    reorderBoardTasks,
    deleteTask,
    saveClient,
    saveClientLogo,
    clearClientLogo,
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
  onToggleCollapse,
  settings,
  user,
}) {
  const initials = user.name
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
        className={`fixed inset-y-0 left-0 z-40 flex flex-col border-r border-line bg-white transition-all duration-300 ease-in-out ${collapsed ? "w-20" : "w-[300px]"} ${open ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0`}
      >
        <div className={`flex h-24 items-center ${collapsed ? "justify-center px-3" : "justify-between gap-3 px-4"}`}>
          {!collapsed && (
            <button
              className="grid min-w-0 grid-cols-[44px_1fr] items-center gap-3 text-left"
              onClick={() => setActivePage("Dashboard")}
            >
              <span
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-white shadow-soft"
                style={{ backgroundColor: settings.brand_color }}
              >
                <Command size={20} />
              </span>
              <span className="min-w-0 leading-tight">
                <span className="block truncate text-sm font-bold tracking-tight text-ink">
                  {settings.agency_name}
                </span>
                <span className="mt-1 block truncate text-xs font-medium text-zinc-500">
                  Work OS
                </span>
              </span>
            </button>
          )}
          <button
            className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-line bg-white text-zinc-500 shadow-soft transition hover:bg-zinc-50 hover:text-ink lg:flex"
            onClick={onToggleCollapse}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <PanelLeftOpen size={17} /> : <PanelLeftClose size={17} />}
          </button>
          <button
            className="ml-auto rounded-lg p-2 text-zinc-500 hover:bg-canvas lg:hidden"
            onClick={() => setOpen(false)}
            aria-label="Close menu"
          >
            <X size={20} />
          </button>
        </div>
        <div className="mx-4 h-px bg-zinc-100" />
        <nav className="flex-1 overflow-y-auto px-3 py-5">
          <div className="space-y-5">
            {groups.map((group) => (
              <section key={group}>
                {!collapsed && (
                  <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-400">
                    {group === "Workspace" ? "Main" : group}
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
                            className={`relative flex h-11 w-full items-center ${collapsed ? "justify-center px-1.5" : "gap-3 px-3.5"} rounded-lg border text-left text-sm font-medium transition duration-200 ${isActive ? "border-ink bg-ink text-white shadow-soft" : "border-transparent text-zinc-600 hover:bg-zinc-100/70 hover:text-ink"}`}
                          >
                            <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md transition ${isActive ? "bg-white/10" : "group-hover:bg-white"}`}>
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
        <div className="p-3">
          <div className="mb-3 h-px bg-zinc-100" />
          <div
            className={`flex items-center border border-line bg-white shadow-soft ${collapsed ? "mx-auto h-12 w-12 justify-center rounded-full" : "gap-3 rounded-md p-3"}`}
          >
            <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-ink text-xs font-bold text-white">
              {initials}
              <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white bg-emerald-500" />
            </span>
            {!collapsed && (
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-ink">
                  {user.name}
                </p>
                <p className="mt-1 truncate text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
                  {user.role}
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
    <header className="sticky top-0 z-20 border-b border-line bg-white/90 backdrop-blur-xl">
      <div className="grid h-16 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-3 md:px-6 xl:grid-cols-[1fr_minmax(360px,560px)_1fr]">
        <div className="flex min-w-0 items-center gap-3">
          <button
            className="rounded-lg border border-line bg-white p-2 text-zinc-500 hover:border-zinc-400 lg:hidden"
            onClick={() => setOpen(true)}
            aria-label="Open menu"
          >
            <Menu size={20} />
          </button>
          <div className="hidden min-w-0 xl:block">
            <p className="truncate text-sm font-semibold text-ink">{activePage}</p>
            <p className="truncate text-[11px] text-zinc-500">{settings.agency_name}</p>
          </div>
        </div>
      <button
        className="group flex min-w-0 items-center gap-3 rounded-full border border-zinc-200 bg-white p-1.5 pr-3 text-left text-sm text-zinc-500 shadow-soft transition hover:border-zinc-300 hover:shadow-panel"
        onClick={onOpenSearch}
      >
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-zinc-500 transition group-hover:bg-blue/5 group-hover:text-blue">
          <Search size={15} />
        </span>
        <span className="truncate font-medium">Search clients, tasks, reports and proofs</span>
        <kbd className="ml-auto hidden rounded-md border border-line bg-zinc-50 px-1.5 py-0.5 text-[10px] font-bold text-zinc-500 sm:block">
          CTRL K
        </kbd>
      </button>
      <div className="flex items-center justify-end gap-2">
      <div className="relative">
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
      <div className="relative" ref={profileRef}>
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
          <div className="absolute right-0 top-12 z-50 w-72 overflow-hidden rounded-xl border border-line bg-white shadow-panel">
            <div className="flex items-center gap-3 border-b border-line bg-zinc-50/70 px-4 py-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-ink text-xs font-bold text-white">{initials}</span>
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-ink">{user.name}</p>
                <p className="mt-0.5 truncate text-xs text-zinc-500">{user.email}</p>
              </div>
            </div>
            <div className="p-2">
              <div className="flex items-center justify-between rounded-lg px-3 py-2 text-xs">
                <span className="text-zinc-500">Role</span>
                <Badge className="capitalize" variant="info">{user.role}</Badge>
              </div>
              <div className="my-1 h-px bg-zinc-100" />
              <button
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-semibold text-red-700 hover:bg-red-50"
                onClick={onLogout}
              >
                <LogOut size={15} />
                Log out
              </button>
            </div>
          </div>
        )}
      </div>
      </div>
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

const topTaskOrderForStatus = (tasks, status) => {
  const orders = tasks
    .filter((task) => task.status === status)
    .map((task) => Number(task.taskOrder || 0))
    .filter((order) => order > 0);
  if (!orders.length) return 1000;
  return Math.max(1, Math.min(...orders) - 1000);
};

function FormSection({
  icon: Icon,
  title,
  description,
  children,
  allowOverflow = false,
}) {
  return (
    <section
      className={`${allowOverflow ? "overflow-visible" : "overflow-hidden"} rounded-xl border border-line bg-white`}
    >
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
      toast.success("Attachment uploaded.");
      if (attachmentInputRef.current) attachmentInputRef.current.value = "";
    } catch (error) {
      setAttachmentError(error.message);
      toast.error(error.message);
    } finally {
      setUploadingAttachment(false);
    }
  };
  const removeFileAttachment = async (index, attachment) => {
    setAttachmentError("");
    if (attachment.uploadedThisSession && attachment.id) {
      try {
        await deleteTaskAttachment(attachment.id);
        toast.success("Attachment deleted.");
      } catch (error) {
        setAttachmentError(error.message);
        toast.error(error.message);
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
  const assignedUserOptions = [
    {
      value: "",
      label: "Unassigned",
      description: "No assigned user",
      icon: UserRound,
      tone: "bg-zinc-100 text-zinc-500",
    },
    ...users.map((user) => ({
      value: String(user.id),
      label: user.name,
      description: user.role || user.status || "",
      initials: String(user.name || "")
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0])
        .join("")
        .toUpperCase(),
    })),
  ];
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
        <FormSection icon={ClipboardList} title="Basic Info" allowOverflow>
          <Field label="Task title" className="sm:col-span-2">
            <input
              className="field"
              value={form.title}
              onChange={(event) => change("title", event.target.value)}
              required
              placeholder="What needs to be done?"
            />
          </Field>
          <div>
            <span className="mb-2 block text-sm font-semibold">Category</span>
            <ModernSelect
              options={CATEGORY_COMBOBOX_OPTIONS}
              value={form.category}
              onChange={(category) => change("category", category)}
              placeholder="Select category"
              required
            />
          </div>
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
          <div>
            <span className="mb-2 block text-sm font-semibold">Status</span>
            <ModernSelect
              options={TASK_STATUS_COMBOBOX_OPTIONS}
              value={form.status}
              onChange={(status) => change("status", status)}
              required
            />
          </div>
        </FormSection>
        <FormSection
          icon={UserRound}
          title="Client & Assignment"
          allowOverflow
        >
          <div>
            <span className="mb-2 block text-sm font-semibold">Client</span>
            <ClientCombobox
              clients={clients}
              value={form.clientId}
              onChange={(clientId) => change("clientId", clientId)}
            />
          </div>
          <div>
            <span className="mb-2 block text-sm font-semibold">
              Assigned user
            </span>
            <ModernSelect
              options={assignedUserOptions}
              value={form.assignedUserId || ""}
              onChange={(assignedUserId) =>
                change("assignedUserId", assignedUserId)
              }
              searchable
              searchPlaceholder="Search users..."
            />
          </div>
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
          {!form.billable && (
            <p className="text-xs leading-5 text-zinc-500 sm:col-span-2">
              This task will be treated as included in the monthly package.
            </p>
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
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(client?.logoUrl || "");
  const [logoPreviewFailed, setLogoPreviewFailed] = useState(false);
  const [removeLogo, setRemoveLogo] = useState(false);
  const [logoError, setLogoError] = useState("");
  const change = (key, value) =>
    setForm((current) => ({ ...current, [key]: value }));
  useEffect(
    () => () => {
      if (logoPreview?.startsWith("blob:")) URL.revokeObjectURL(logoPreview);
    },
    [logoPreview],
  );
  const chooseLogo = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setLogoError("");
    let optimizedFile;
    try {
      optimizedFile = await optimizeClientLogo(file);
    } catch (error) {
      setLogoError(error.message);
      toast.error(error.message);
      return;
    }
    if (logoPreview?.startsWith("blob:")) URL.revokeObjectURL(logoPreview);
    setLogoFile(optimizedFile);
    setLogoPreview(URL.createObjectURL(optimizedFile));
    setLogoPreviewFailed(false);
    setRemoveLogo(false);
    setLogoError("");
  };
  const clearLogo = () => {
    if (logoPreview?.startsWith("blob:")) URL.revokeObjectURL(logoPreview);
    setLogoFile(null);
    setLogoPreview("");
    setLogoPreviewFailed(false);
    setRemoveLogo(Boolean(client?.logoUrl));
    setLogoError("");
  };
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
    setLogoError("");
    try {
      await onSave({ ...form, initials }, { logoFile, removeLogo });
      onClose();
    } catch (error) {
      setLogoError(error.message);
    } finally {
      setSaving(false);
    }
  };
  return (
    <form onSubmit={submit}>
      <div className="grid gap-5 p-5 sm:grid-cols-2 sm:p-6">
        <Field label="Client logo" className="sm:col-span-2">
          <div className="flex items-center gap-4 rounded-xl border border-dashed border-line bg-canvas/70 p-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-line bg-white text-lg font-bold text-blue shadow-soft">
              {logoPreview && !logoPreviewFailed ? (
                <img className="h-full w-full bg-white object-cover object-center" src={logoPreview} alt="Client logo preview" onError={() => setLogoPreviewFailed(true)} />
              ) : (
                <span className="flex h-full w-full items-center justify-center bg-blue/10">
                  {form.name
                    .trim()
                    .split(/\s+/)
                    .filter(Boolean)
                    .slice(0, 2)
                    .map((part) => part.charAt(0))
                    .join("")
                    .toUpperCase() || <ImagePlus size={21} className="text-zinc-400" />}
                </span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-ink">Client identity image</p>
              <p className="mt-1 text-xs text-zinc-500">JPG, PNG, or WEBP. Maximum 5MB.</p>
              {logoError && <p className="mt-2 text-xs font-medium text-red-600">{logoError}</p>}
              <div className="mt-3 flex flex-wrap gap-2">
                <label className="button-secondary cursor-pointer px-3 py-2 text-xs">
                  <ImagePlus size={14} />
                  {logoPreview ? "Change logo" : "Choose logo"}
                  <input className="hidden" type="file" accept="image/jpeg,image/png,image/webp" onChange={chooseLogo} />
                </label>
                {logoPreview && <button className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50" type="button" onClick={clearLogo}><Trash2 size={14} />Remove</button>}
              </div>
            </div>
          </div>
        </Field>
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
        <div>
          <span className="mb-2 block text-sm font-semibold">Status</span>
          <ModernSelect
            options={CLIENT_STATUS_COMBOBOX_OPTIONS}
            value={String(form.status || "active")
              .toLowerCase()
              .replace(" ", "_")}
            onChange={(status) => change("status", status)}
            required
          />
        </div>
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
    slate: ["bg-slate-100 text-slate-700", "bg-slate-400"],
  };
  const [toneSurface, toneBar] = toneClasses[tone];
  return (
    <section className="overflow-hidden rounded-xl border border-line bg-white shadow-soft">
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
              <div className="rounded-lg border border-line bg-canvas/70 p-3" key={task.id}>
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
  featured = false,
}) {
  const accents = {
    blue: "bg-blue/5 text-blue",
    emerald: "bg-emerald-50 text-emerald-700",
    orange: "bg-orange-50 text-orange-700",
    violet: "bg-violet-50 text-violet-700",
  };
  return (
    <article className={`group relative min-h-40 overflow-hidden rounded-xl border p-5 shadow-soft transition duration-200 hover:-translate-y-0.5 hover:shadow-panel ${featured ? "border-ink bg-gradient-to-br from-ink via-zinc-900 to-blue text-white" : "border-line bg-white hover:border-zinc-300"}`}>
      {featured && <span className="pointer-events-none absolute -right-8 -top-10 h-28 w-28 rounded-full bg-blue/40 blur-2xl" />}
      <div className="flex items-start justify-between gap-4">
        <span
          className={`relative flex h-10 w-10 items-center justify-center rounded-xl ${featured ? "bg-white/10 text-white" : accents[accent]}`}
        >
          <Icon size={18} strokeWidth={1.8} />
        </span>
        <span className={`relative max-w-28 text-right text-[10px] font-medium leading-4 ${featured ? "text-white/60" : "text-zinc-400"}`}>{detail}</span>
      </div>
      <p className={`relative mt-6 text-[1.9rem] font-semibold leading-none tracking-[-0.04em] tabular-nums ${featured ? "text-white" : "text-ink"}`}>
        {value}
      </p>
      <p className={`relative mt-2 text-xs font-semibold ${featured ? "text-white/80" : "text-zinc-600"}`}>{label}</p>
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
            <option key={status} value={status}>{getStatusLabel(status)}</option>
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
  const activeClients = clients.filter(
    (client) => String(client.status || "active").toLowerCase() === "active",
  );
  const monthlyRevenue = activeClients.reduce(
    (sum, client) => sum + Number(client.monthlyFee || 0),
    0,
  );
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
      "Today’s tasks",
      String(todayTasks.length).padStart(2, "0"),
      `${todayTasks.filter((task) => task.status !== "Completed").length} open`,
      ClipboardList,
      "orange",
    ],
    [
      "Active clients",
      String(activeClients.length).padStart(2, "0"),
      "Client workspaces",
      Users,
      "blue",
    ],
    [
      "Pending tasks",
      String(tasks.length - completed.length).padStart(2, "0"),
      "Across all clients",
      Clock3,
      "violet",
    ],
    [
      "Monthly Revenue",
      formatMoney(monthlyRevenue),
      "Active monthly packages",
      CircleDollarSign,
      "blue",
    ],
    [
      "Completed work",
      String(completed.length).padStart(2, "0"),
      "Stored in daily logs",
      CheckCircle2,
      "emerald",
    ],
    [
      "Extra billable work",
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
  const reportsReady = new Set(completed.map((task) => task.clientId)).size;
  const workflowTotal = Math.max(tasks.length, 1);
  const statusFlow = [
    {
      label: getStatusLabel("New"),
      value: tasks.filter((task) => task.status === "New").length,
      bar: "bg-zinc-300",
    },
    {
      label: "In progress",
      value: tasks.filter((task) => task.status === "In Progress").length,
      bar: "bg-blue",
    },
    {
      label: "Waiting",
      value: tasks.filter((task) => task.status === "Waiting for Client").length,
      bar: "bg-amber-500",
    },
    {
      label: "Revision",
      value: tasks.filter((task) => task.status === "Revision").length,
      bar: "bg-orange-500",
    },
    {
      label: "Completed",
      value: completed.length,
      bar: "bg-emerald-600",
    },
  ];
  const maxStatusCount = Math.max(...statusFlow.map((item) => item.value), 1);
  const pendingWithoutToday = Math.max(openTasks.length - dueTodayTasks.length, 0);
  const completedSplit = Math.round((completed.length / workflowTotal) * 100);
  const dueTodaySplit = Math.round((dueTodayTasks.length / workflowTotal) * 100);
  const pendingSplit = Math.max(100 - completedSplit - dueTodaySplit, 0);
  const deadlineSummary = [
    { label: "Overdue", value: overdueTasks.length, tone: "border-red-200 bg-red-50 text-red-700" },
    { label: "Due today", value: dueTodayTasks.length, tone: "border-amber-200 bg-amber-50 text-amber-800" },
    { label: "This week", value: dueThisWeekTasks.length, tone: "border-blue/20 bg-blue/5 text-blue" },
    { label: "Upcoming", value: upcomingTasks.length, tone: "border-slate-200 bg-slate-50 text-slate-700" },
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
      <div className="flex flex-col gap-3 pt-4 lg:flex-row lg:items-center lg:justify-between">
          <section className="w-full rounded-xl border border-line bg-white px-4 py-3 shadow-soft sm:w-auto sm:min-w-[260px]">
            <div className="flex items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue/5 text-blue"><CalendarDays size={17} /></span>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-zinc-400">Today</p>
                <p className="mt-1 text-sm font-semibold text-ink">{formatDate(TODAY, { weekday: "long", month: "long", day: "numeric" })}</p>
              </div>
            </div>
          </section>
          <div className="flex flex-wrap items-center gap-2">
              <span
                className={`inline-flex items-center gap-2 rounded-md border px-2 py-1 text-[11px] font-medium ${statusClasses}`}
              >
                <span className="h-1.5 w-1.5 rounded-full bg-current" />
                {statusLabel}
              </span>
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

      <section className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.slice(0, 4).map(([label, value, detail, Icon, accent], index) => (
          <DashboardMetricCard
            key={label}
            label={label}
            value={value}
            detail={detail}
            icon={Icon}
            accent={accent}
            featured={index === 0}
          />
        ))}
      </section>

      <div className="mt-5 grid gap-4 xl:grid-cols-[1.35fr_0.65fr]">
        <div className="min-w-0 space-y-4">
          <section className="overflow-hidden rounded-xl border border-line bg-white shadow-soft">
            <div className="flex items-start justify-between border-b border-line px-5 py-4">
              <div>
                <h2 className="text-base font-semibold tracking-tight">
                  Delivery Flow
                </h2>
                <p className="mt-1 text-xs text-zinc-500">
                  Task movement across your workspace.
                </p>
              </div>
              <Badge variant="info">{tasks.length} tasks</Badge>
            </div>
            <div className="p-5">
              <div className="grid h-[250px] grid-cols-5 items-end gap-3 border-b border-line px-2 pb-4 sm:gap-5">
                {statusFlow.map((item) => (
                  <div className="flex h-full min-w-0 flex-col justify-end" key={item.label}>
                    <span className="mb-2 text-center text-sm font-bold tabular-nums text-ink">
                      {item.value}
                    </span>
                    <div className="flex h-[170px] items-end overflow-hidden rounded-lg bg-zinc-50">
                      <div
                        className={`w-full rounded-t-lg transition-all ${item.bar}`}
                        style={{
                          height: `${Math.max((item.value / maxStatusCount) * 100, item.value ? 10 : 2)}%`,
                        }}
                      />
                    </div>
                    <span className="mt-2 truncate text-center text-[10px] font-semibold text-zinc-500">
                      {item.label}
                    </span>
                  </div>
                ))}
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-6">
                <div className="rounded-xl border border-line bg-canvas/70 p-4">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue/5 text-blue">
                    <CheckCircle2 size={16} />
                  </span>
                  <p className="mt-4 text-2xl font-semibold tabular-nums text-ink">
                    {String(completed.length).padStart(2, "0")}
                  </p>
                  <p className="mt-1 text-xs font-semibold text-zinc-500">
                    Completed work
                  </p>
                </div>
                <div className="rounded-xl border border-line bg-canvas/70 p-4">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-100 text-zinc-600">
                    <FileText size={16} />
                  </span>
                  <p className="mt-4 text-2xl font-semibold tabular-nums text-ink">
                    {String(reportsReady).padStart(2, "0")}
                  </p>
                  <p className="mt-1 text-xs font-semibold text-zinc-500">
                    Reports ready
                  </p>
                </div>
                {deadlineSummary.map((item) => (
                  <div className={`rounded-xl border p-4 ${item.tone}`} key={item.label}>
                    <p className="text-xl font-semibold tabular-nums">{item.value}</p>
                    <p className="mt-1 text-[10px] font-semibold opacity-80">{item.label}</p>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex justify-end">
                <button className="text-xs font-semibold text-blue hover:underline" onClick={() => setActivePage("Reminders")}>
                  View deadline details
                </button>
              </div>
            </div>
          </section>

          <section className="hidden">
            <div className="flex items-end justify-between gap-4 border-b border-line px-5 py-4">
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
            <div className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-4">
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
                tone="slate"
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
              <div className="divide-y divide-line">
                {priorityTasks.map((task) => (
                  <div className="grid gap-3 px-5 py-3.5 transition hover:bg-zinc-50/70 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-center" key={task.id}>
                    <button className="min-w-0 text-left" onClick={() => onEditTask(task)}>
                      <p className="truncate text-sm font-semibold text-ink hover:text-blue">{task.title}</p>
                      <p className="mt-1 truncate text-[11px] text-zinc-500">
                        {clients.find((client) => client.id === task.clientId)?.name || "Deleted client"}
                        {" · "}
                        {task.deadline ? formatDate(task.deadline) : "No deadline"}
                      </p>
                    </button>
                    <PriorityBadge priority={task.priority} />
                    <select
                      className="rounded-lg border border-line bg-white px-2 py-1.5 text-[10px] font-semibold text-zinc-600 outline-none focus:border-blue/40"
                      value={task.status}
                      onChange={(event) => updateTask(task.id, { status: event.target.value })}
                      aria-label={`Update ${task.title} status`}
                    >
                      {TASK_STATUSES.map((status) => <option key={status} value={status}>{getStatusLabel(status)}</option>)}
                    </select>
                  </div>
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

          <section className="hidden">
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

        <aside className="space-y-4 xl:sticky xl:top-24 xl:self-start">
          <section className="overflow-hidden rounded-xl border border-line bg-white shadow-soft">
            <div className="border-b border-line px-5 py-4">
              <h2 className="text-base font-semibold tracking-tight">
                Work Split
              </h2>
              <p className="mt-1 text-xs text-zinc-500">
                Completed, pending and due today.
              </p>
            </div>
            <div className="space-y-4 p-5">
              <div className="flex items-center gap-5">
                <div
                  className="relative h-28 w-28 shrink-0 rounded-full"
                  style={{
                    background: `conic-gradient(#059669 0 ${completedSplit}%, #64748B ${completedSplit}% ${completedSplit + pendingSplit}%, #F59E0B ${completedSplit + pendingSplit}% 100%)`,
                  }}
                >
                  <div className="absolute inset-4 flex flex-col items-center justify-center rounded-full bg-white">
                    <span className="text-xl font-semibold tabular-nums text-ink">{tasks.length}</span>
                    <span className="text-[9px] font-semibold uppercase tracking-wide text-zinc-400">Tasks</span>
                  </div>
                </div>
                <div className="min-w-0 flex-1 space-y-3">
                  {[
                    ["Completed", completed.length, "bg-emerald-600"],
                    ["Pending", pendingWithoutToday, "bg-slate-500"],
                    ["Due today", dueTodayTasks.length, "bg-amber-500"],
                  ].map(([label, value, dot]) => (
                    <div className="flex items-center justify-between gap-3 text-xs" key={label}>
                      <span className="flex items-center gap-2 text-zinc-500">
                        <span className={`h-2 w-2 rounded-full ${dot}`} />
                        {label}
                      </span>
                      <span className="font-bold tabular-nums text-ink">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="border-t border-line pt-4">
                <p className="mb-4 text-[10px] font-bold uppercase tracking-[0.14em] text-zinc-400">
                  Client delivery
                </p>
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
        description={`${clients.length} client workspace${clients.length === 1 ? "" : "s"} with delivery and billing context.`}
        action="Add client"
        onAction={onNewClient}
      />
      {clients.length ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
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
      className={`filter-control group ${className}`}
    >
      <span className="shrink-0 text-[10px] font-bold uppercase tracking-[0.12em] text-zinc-400">
        {label}
      </span>
      <select
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
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-blue/5 text-[10px] font-bold text-blue">
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
      className={`group relative grid gap-3 border-b border-line px-4 py-3 transition last:border-b-0 hover:bg-zinc-50/70 sm:px-5 xl:grid-cols-[28px_minmax(270px,1.6fr)_minmax(145px,.65fr)_minmax(135px,.6fr)_128px_110px_32px] xl:items-center ${selected ? "bg-blue/[0.045]" : "bg-white"}`}
    >
      <div className={`absolute inset-y-2 left-0 w-0.5 rounded-r-full bg-blue transition ${selected ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`} />
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
            className="mb-3 h-11 w-14 rounded-lg border border-line object-cover sm:float-left sm:mb-0 sm:mr-3"
            src={imagePreviewUrl}
            alt=""
            loading="lazy"
            decoding="async"
          />
        ) : imageAttachment ? (
          <span className="mb-3 flex h-11 w-14 items-center justify-center rounded-lg border border-line bg-zinc-50 text-[10px] font-medium text-zinc-400 sm:float-left sm:mb-0 sm:mr-3">
            Image
          </span>
        ) : videoAttachment ? (
          <span className="mb-3 flex h-11 w-14 items-center justify-center rounded-lg border border-line bg-zinc-50 text-[10px] font-semibold text-zinc-500 sm:float-left sm:mb-0 sm:mr-3">
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
      <div>
        <select
          className="w-full rounded-lg border border-line bg-zinc-50 px-2 py-2 text-[11px] font-semibold text-zinc-700 outline-none transition hover:bg-white focus:border-blue/50 focus:ring-2 focus:ring-blue/10"
          value={task.status}
          onChange={(event) =>
            updateTask(task.id, { status: event.target.value })
          }
          aria-label={`Update ${task.title} status`}
        >
          {TASK_STATUSES.map((status) => (
            <option key={status} value={status}>{getStatusLabel(status)}</option>
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
            Included in package
          </span>
        )}
      </div>
      <ActionMenu onEdit={onEdit} onDelete={onDelete} />
    </article>
  );
}

function BoardDateBadge({ task }) {
  if (!task.deadline) return null;
  const state = deadlineState(task);
  const completed = task.status === "Completed";
  const tone = completed
    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
    : state === "Overdue"
      ? "border-red-200 bg-red-50 text-red-700"
      : state === "Due Today"
        ? "border-amber-200 bg-amber-50 text-amber-800"
        : ["Due Tomorrow", "Due This Week"].includes(state)
          ? "border-blue/20 bg-blue/5 text-blue"
          : "border-slate-200 bg-slate-50 text-slate-600";
  const Icon = completed ? CheckCircle2 : Clock3;
  return (
    <span className={`inline-flex h-6 items-center gap-1 rounded-md border px-1.5 text-[10px] font-semibold ${tone}`}>
      <Icon size={11} />
      {formatDate(task.deadline, { month: "short", day: "numeric" })}
    </span>
  );
}

function BoardAssigneeAvatar({ name }) {
  if (!name) {
    return (
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-zinc-200 bg-zinc-50 text-zinc-400" title="Unassigned">
        <UserRound size={11} />
      </span>
    );
  }
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
  return (
    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue text-[9px] font-bold text-white shadow-soft" title={name}>
      {initials}
    </span>
  );
}

function KanbanTaskCard({
  task,
  client,
  onEdit,
  onDelete,
  overlay = false,
}) {
  const proofCount = (task.attachments?.length || 0) + (task.proofLink ? 1 : 0);
  const imageAttachment = firstTaskImage(task);
  const imagePreviewUrl = getAttachmentPreviewUrl(imageAttachment, "card");
  const videoAttachment = firstTaskVideo(task);
  return (
    <article className={`group overflow-hidden rounded-xl border border-line bg-white shadow-soft transition duration-150 hover:border-zinc-300 hover:shadow-panel ${overlay ? "w-[304px] rotate-1 shadow-xl" : ""}`}>
      {imageAttachment && imagePreviewUrl ? (
        <button
          className="block w-full overflow-hidden border-b border-line"
          onClick={onEdit}
          aria-label={`Open ${task.title}`}
        >
          <img
            className="h-24 w-full object-cover"
            src={imagePreviewUrl}
            alt=""
            loading="lazy"
            decoding="async"
          />
        </button>
      ) : imageAttachment ? (
        <button
          className="flex h-20 w-full items-center justify-center border-b border-line bg-zinc-50 text-xs font-medium text-zinc-400"
          onClick={onEdit}
          aria-label={`Open ${task.title}`}
        >
          Image preview unavailable
        </button>
      ) : videoAttachment ? (
        <button
          className="flex h-20 w-full items-center justify-center border-b border-line bg-zinc-50 text-xs font-semibold text-zinc-500 hover:text-zinc-700"
          onClick={onEdit}
          aria-label={`Open video attachment for ${task.title}`}
        >
          <Video size={17} className="mr-2" />
          Video attachment
        </button>
      ) : null}
      <div className="p-3">
        <div className="flex items-start justify-between gap-2">
          <button className="min-w-0 flex-1 text-left" onClick={onEdit}>
          <h3 className="text-sm font-semibold leading-5 tracking-tight text-zinc-900 transition group-hover:text-blue">
            {task.title}
          </h3>
          <p className="mt-1 truncate text-xs font-medium text-zinc-400">
            {client?.name || "Deleted client"}
          </p>
          </button>
          {!overlay && <ActionMenu onEdit={onEdit} onDelete={onDelete} />}
        </div>
        <div className="mt-3 flex min-w-0 items-center gap-1.5">
          <PriorityBadge priority={task.priority} />
          <BoardDateBadge task={task} />
          {task.reminderDate && (
            <span className="flex h-6 w-6 items-center justify-center rounded-md border border-amber-200 bg-amber-50 text-amber-700" title="Reminder set">
              <BellRing size={11} />
            </span>
          )}
          <span className="flex-1" />
          <div className="flex items-center gap-2 text-[10px] font-medium text-zinc-500">
            {proofCount > 0 && (
              <span className="inline-flex items-center gap-1" title={`${proofCount} attachment or proof item${proofCount === 1 ? "" : "s"}`}>
                <Paperclip size={12} />
                {proofCount}
              </span>
            )}
            {task.checklistTotal > 0 && (
              <span className="inline-flex items-center gap-1" title="Checklist progress">
                <ListChecks size={12} />
                {task.checklistCompleted}/{task.checklistTotal}
              </span>
            )}
            {task.isRecurring && (
              <span className="inline-flex items-center text-violet-600" title="Recurring task">
                <Repeat2 size={12} />
              </span>
            )}
            {task.billable && (
              <span className="inline-flex items-center text-emerald-700" title="Extra billable task">
                <CircleDollarSign size={12} />
              </span>
            )}
            <BoardAssigneeAvatar name={task.assignedUserName} />
          </div>
        </div>
      </div>
    </article>
  );
}

const boardColumnTone = {
  New: "border-slate-200 bg-slate-50/80",
  "In Progress": "border-blue/15 bg-blue/[0.035]",
  "Waiting for Client": "border-amber-200 bg-amber-50/65",
  Revision: "border-orange-200 bg-orange-50/65",
  Completed: "border-emerald-200 bg-emerald-50/60",
};

const boardHeaderTone = {
  New: "border-slate-200 bg-slate-100 text-slate-700",
  "In Progress": "border-blue/15 bg-blue/10 text-blue",
  "Waiting for Client": "border-amber-200 bg-amber-100/80 text-amber-800",
  Revision: "border-orange-200 bg-orange-100/80 text-orange-700",
  Completed: "border-emerald-200 bg-emerald-100/80 text-emerald-700",
};

function SortableBoardCard({ task, client, onEdit, onDelete }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: `task-${task.id}`,
    data: { type: "task", task },
    transition: {
      duration: 140,
      easing: "cubic-bezier(0.2, 0, 0, 1)",
    },
  });

  return (
    <div
      ref={setNodeRef}
      className={`touch-manipulation cursor-grab rounded-xl active:cursor-grabbing ${isDragging ? "opacity-25" : ""}`}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      {...attributes}
      {...listeners}
    >
      <KanbanTaskCard
        task={task}
        client={client}
        onEdit={onEdit}
        onDelete={onDelete}
      />
    </div>
  );
}

function BoardColumn({
  status,
  tasks,
  clients,
  onNewTask,
  onEditTask,
  onDeleteTask,
  highlighted,
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `column-${status}`,
    data: { type: "column", status },
  });

  return (
    <section
      ref={setNodeRef}
      className={`flex w-[304px] shrink-0 flex-col rounded-xl border p-2.5 transition sm:w-[320px] ${boardColumnTone[status]} ${isOver || highlighted ? "ring-2 ring-blue/20 ring-offset-2" : ""}`}
    >
      <header className="mb-2 flex items-center justify-between gap-3 px-1 py-1.5">
        <div className="flex min-w-0 items-center gap-2">
          <span className={`inline-flex min-w-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${boardHeaderTone[status]}`}>
            <span className={`h-2 w-2 shrink-0 rounded-full ${getStatusDotTone(status)}`} />
            <span className="truncate">{getStatusLabel(status)}</span>
          </span>
          <span className="text-[11px] font-medium tabular-nums text-zinc-500">
            {tasks.length}
          </span>
        </div>
        <button
          className="flex h-7 w-7 items-center justify-center rounded-lg text-zinc-400 transition hover:bg-zinc-100 hover:text-blue"
          type="button"
          onClick={() => onNewTask({ status })}
          aria-label={`Add task to ${getStatusLabel(status)}`}
        >
          <Plus size={15} />
        </button>
      </header>
      <SortableContext
        items={tasks.map((task) => `task-${task.id}`)}
        strategy={verticalListSortingStrategy}
      >
        <div className="min-h-24 flex-1 space-y-2.5">
          {tasks.map((task) => (
            <SortableBoardCard
              key={task.id}
              task={task}
              client={clients.find((client) => client.id === task.clientId)}
              onEdit={() => onEditTask(task)}
              onDelete={() => onDeleteTask(task.id)}
            />
          ))}
          {!tasks.length && (
            <div className="flex min-h-24 flex-col items-center justify-center rounded-xl border border-dashed border-zinc-300/80 bg-white/55 px-4 text-center">
              <ClipboardList size={16} className="text-zinc-400" />
              <p className="mt-2 text-xs font-medium text-zinc-500">No tasks here</p>
            </div>
          )}
        </div>
      </SortableContext>
      <button
        className="mt-2.5 flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-zinc-300/90 bg-white/60 px-3 py-2.5 text-xs font-semibold text-zinc-500 transition hover:border-blue/30 hover:bg-white hover:text-blue"
        type="button"
        onClick={() => onNewTask({ status })}
      >
        <Plus size={14} />
        Add task
      </button>
    </section>
  );
}

const sortBoardTasks = (tasks) => [...tasks].sort((a, b) => {
  const aOrder = Number(a.taskOrder || 0);
  const bOrder = Number(b.taskOrder || 0);
  if (aOrder > 0 && bOrder > 0 && aOrder !== bOrder) return aOrder - bOrder;
  if (aOrder > 0 && bOrder === 0) return -1;
  if (bOrder > 0 && aOrder === 0) return 1;
  const aCreatedAt = Date.parse(a.createdAt || a.updatedAt || "");
  const bCreatedAt = Date.parse(b.createdAt || b.updatedAt || "");
  const aCreatedRank = Number.isNaN(aCreatedAt) ? 0 : aCreatedAt;
  const bCreatedRank = Number.isNaN(bCreatedAt) ? 0 : bCreatedAt;
  if (aCreatedRank !== bCreatedRank) return bCreatedRank - aCreatedRank;
  return String(b.id).localeCompare(String(a.id), undefined, { numeric: true });
});

function positionBoardTask(baseTasks, movedTask, over) {
  const destinationStatus =
    over?.data.current?.type === "column"
      ? over.data.current.status
      : over?.data.current?.task?.status;
  if (!movedTask || !destinationStatus) return null;

  const currentTask =
    baseTasks.find((task) => String(task.id) === String(movedTask.id)) ||
    movedTask;
  const fullDestinationTasks = sortBoardTasks(
    baseTasks.filter((task) => task.status === destinationStatus),
  );
  const withoutMoved = baseTasks.filter(
    (task) => String(task.id) !== String(movedTask.id),
  );
  const destinationTasks = sortBoardTasks(
    withoutMoved.filter((task) => task.status === destinationStatus),
  );
  const overTaskId =
    over?.data.current?.type === "task"
      ? String(over.data.current.task.id)
      : "";
  let insertAt = destinationTasks.length;
  if (overTaskId) {
    const overIndex = fullDestinationTasks.findIndex(
      (task) => String(task.id) === overTaskId,
    );
    if (overIndex >= 0) {
      insertAt = Math.min(overIndex, destinationTasks.length);
    }
  }
  destinationTasks.splice(insertAt, 0, {
    ...currentTask,
    status: destinationStatus,
  });
  const destinationOrder = new Map(
    destinationTasks.map((task, index) => [
      String(task.id),
      (index + 1) * 1000,
    ]),
  );
  const positioned = baseTasks.map((task) => {
    if (String(task.id) === String(movedTask.id)) {
      return {
        ...task,
        status: destinationStatus,
        taskOrder: destinationOrder.get(String(task.id)),
      };
    }
    if (task.status === destinationStatus && destinationOrder.has(String(task.id))) {
      return { ...task, taskOrder: destinationOrder.get(String(task.id)) };
    }
    return task;
  });
  return {
    tasks: positioned,
    destinationStatus,
  };
}

function TaskBoard({
  clients,
  tasks,
  visibleTaskIds,
  onNewTask,
  onEditTask,
  onDeleteTask,
  reorderTasks,
}) {
  const [activeTask, setActiveTask] = useState(null);
  const [overStatus, setOverStatus] = useState("");
  const [optimisticTasks, setOptimisticTasks] = useState(null);
  const lastDragTargetRef = useRef("");
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, {
      activationConstraint: { distance: 6 },
    }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const effectiveTasks = optimisticTasks || tasks;
  const visibleTasks = effectiveTasks.filter((task) => visibleTaskIds.has(String(task.id)));

  const handleDragEnd = async ({ active, over }) => {
    const movedTask = active.data.current?.task;
    setActiveTask(null);
    setOverStatus("");
    const hoveredDestinationStatus =
      over?.data.current?.type === "column"
        ? over.data.current.status
        : over?.data.current?.task?.status;
    const positioned =
      optimisticTasks && hoveredDestinationStatus
        ? {
            tasks: optimisticTasks,
            destinationStatus: hoveredDestinationStatus,
          }
        : positionBoardTask(tasks, movedTask, over);
    lastDragTargetRef.current = "";
    if (!positioned) {
      setOptimisticTasks(null);
      return;
    }
    const originalTask =
      tasks.find((task) => String(task.id) === String(movedTask.id)) ||
      movedTask;
    const { destinationStatus } = positioned;
    const affectedStatuses = new Set([
      originalTask.status,
      destinationStatus,
    ]);
    const orderedByStatus = {};
    affectedStatuses.forEach((status) => {
      orderedByStatus[status] = sortBoardTasks(
        positioned.tasks.filter((task) => task.status === status),
      );
    });
    const updates = [];
    const nextTasks = positioned.tasks.map((task) => {
      for (const status of affectedStatuses) {
        const index = orderedByStatus[status].findIndex((item) => String(item.id) === String(task.id));
        if (index >= 0) {
          const next = { ...task, status, taskOrder: (index + 1) * 1000 };
          updates.push({ id: task.id, status, task_order: next.taskOrder });
          return next;
        }
      }
      return task;
    });
    const unchanged = updates.every((update) => {
      const current = effectiveTasks.find((task) => String(task.id) === String(update.id));
      return current?.status === update.status && Number(current?.taskOrder || 0) === update.task_order;
    });
    if (unchanged) return;

    setOptimisticTasks(nextTasks);
    try {
      await reorderTasks(
        updates,
        originalTask.status === destinationStatus
          ? ""
          : `Moved to ${destinationStatus}`,
      );
    } catch {
      setOptimisticTasks(null);
      return;
    }
    setOptimisticTasks(null);
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={({ active }) => {
        lastDragTargetRef.current = "";
        setOptimisticTasks(null);
        setActiveTask(active.data.current?.task || null);
      }}
      onDragOver={({ active, over }) => {
        const nextStatus =
          over?.data.current?.type === "column"
            ? over.data.current.status
            : over?.data.current?.task?.status || "";
        setOverStatus(nextStatus);
        if (!over) return;
        const targetKey = `${active.id}:${nextStatus}:${over.id}`;
        if (targetKey === lastDragTargetRef.current) return;
        lastDragTargetRef.current = targetKey;
        setOptimisticTasks((current) => {
          const baseTasks = current || tasks;
          const currentTask = baseTasks.find(
            (task) =>
              String(task.id) ===
              String(active.data.current?.task?.id),
          );
          if (!current && currentTask?.status === nextStatus) {
            return current;
          }
          const positioned = positionBoardTask(
            baseTasks,
            active.data.current?.task,
            over,
          );
          return positioned?.tasks || current;
        });
      }}
      onDragCancel={() => {
        lastDragTargetRef.current = "";
        setActiveTask(null);
        setOverStatus("");
        setOptimisticTasks(null);
      }}
      onDragEnd={handleDragEnd}
    >
      <section className="overflow-hidden rounded-xl border border-line bg-white shadow-panel">
        <div className="flex items-center justify-between border-b border-line px-4 py-3 sm:px-5">
          <p className="text-xs font-medium text-zinc-500">
            Drag tasks between stages to update delivery status.
          </p>
          <span className="text-xs font-semibold tabular-nums text-zinc-700">
            {visibleTasks.length} tasks
          </span>
        </div>
        <div className="flex items-start gap-3 overflow-x-auto bg-zinc-50/50 p-3 pb-5 sm:p-4">
          {TASK_STATUSES.map((status) => (
            <BoardColumn
              key={status}
              status={status}
              tasks={sortBoardTasks(visibleTasks.filter((task) => task.status === status))}
              clients={clients}
              onNewTask={onNewTask}
              onEditTask={onEditTask}
              onDeleteTask={onDeleteTask}
              highlighted={overStatus === status}
            />
          ))}
        </div>
      </section>
      <DragOverlay dropAnimation={null}>
        {activeTask ? (
          <KanbanTaskCard
            task={activeTask}
            client={clients.find((client) => client.id === activeTask.clientId)}
            onEdit={() => {}}
            onDelete={() => {}}
            overlay
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

function TaskCompactList({ tasks, clients, onEditTask, updateTask }) {
  if (!tasks.length) {
    return (
      <div className="rounded-xl border border-line bg-white p-6 shadow-soft">
        <EmptyState
          title="No matching tasks"
          description="Adjust your filters or clear them to return to the full task workspace."
        />
      </div>
    );
  }
  return (
    <section className="overflow-hidden rounded-xl border border-line bg-white shadow-panel">
      <div className="divide-y divide-line">
        {tasks.map((task) => {
          const client = clients.find((item) => item.id === task.clientId);
          const initials = task.assignedUserName
            ? task.assignedUserName
                .split(/\s+/)
                .filter(Boolean)
                .slice(0, 2)
                .map((part) => part[0])
                .join("")
                .toUpperCase()
            : "";
          return (
            <article
              key={task.id}
              className="grid gap-3 px-4 py-3 transition hover:bg-zinc-50/70 sm:grid-cols-[minmax(0,1fr)_auto_auto_auto] sm:items-center"
            >
              <button
                className="min-w-0 text-left"
                type="button"
                onClick={() => onEditTask(task)}
              >
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  <h3 className="truncate text-sm font-semibold text-zinc-900 hover:text-blue">
                    {task.title}
                  </h3>
                  <PriorityBadge priority={task.priority} />
                  {task.billable && (
                    <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700">
                      <CircleDollarSign size={11} className="mr-1" />
                      Extra
                    </Badge>
                  )}
                </div>
                <p className="mt-1 truncate text-xs text-zinc-500">
                  {client?.name || "Deleted client"} ·{" "}
                  {task.deadline ? formatDate(task.deadline) : "No deadline"}
                </p>
              </button>
              <StatusBadge status={task.status} />
              <span className="flex items-center gap-2 text-xs font-medium text-zinc-500">
                {initials ? (
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-ink text-[10px] font-bold text-white">
                    {initials}
                  </span>
                ) : (
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-zinc-100 text-zinc-400">
                    <UserRound size={13} />
                  </span>
                )}
                <span className="hidden sm:inline">
                  {task.assignedUserName || "Unassigned"}
                </span>
              </span>
              <select
                className="rounded-lg border border-line bg-white px-2 py-1.5 text-[10px] font-semibold text-zinc-600 outline-none focus:border-blue/40"
                value={task.status}
                onChange={(event) =>
                  updateTask(task.id, { status: event.target.value })
                }
                aria-label={`Update ${task.title} status`}
              >
                {TASK_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {getStatusLabel(status)}
                  </option>
                ))}
              </select>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function TaskDatabaseTable({
  tasks,
  clients,
  users,
  selected,
  allVisibleSelected,
  onToggle,
  onToggleAll,
  onEditTask,
  onDeleteTask,
  updateTask,
  onNewTask,
  clearFilters,
}) {
  const [editingCell, setEditingCell] = useState(null);
  const [optimisticPatches, setOptimisticPatches] = useState({});
  const visibleTasks = tasks.map((task) => ({
    ...task,
    ...(optimisticPatches[String(task.id)] || {}),
  }));
  const assignedUserOptions = [
    {
      value: "",
      label: "Unassigned",
      description: "No owner",
      icon: UserRound,
      tone: "bg-zinc-100 text-zinc-500",
    },
    ...users.map((user) => ({
      value: String(user.id),
      label: user.name,
      description: user.role || user.status || "",
      initials: String(user.name || "")
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0])
        .join("")
        .toUpperCase(),
    })),
  ];
  const priorityOptions = PRIORITIES.map((priority) => ({
    value: priority,
    label: priority,
  }));
  const commitTaskPatch = async (task, patch) => {
    const normalizedPatch = Object.fromEntries(
      Object.entries(patch).filter(([key, value]) => task[key] !== value),
    );
    if (!Object.keys(normalizedPatch).length) return;
    const taskKey = String(task.id);
    const previousPatch = optimisticPatches[taskKey] || {};
    setOptimisticPatches((current) => ({
      ...current,
      [taskKey]: { ...(current[taskKey] || {}), ...normalizedPatch },
    }));
    try {
      await updateTask(task.id, normalizedPatch, {
        silent: true,
        rethrow: true,
      });
    } catch {
      setOptimisticPatches((current) => {
        const next = { ...current };
        if (Object.keys(previousPatch).length) next[taskKey] = previousPatch;
        else delete next[taskKey];
        return next;
      });
    }
  };
  const startTextEdit = (task, field, value) =>
    setEditingCell({
      taskId: String(task.id),
      field,
      value: String(value ?? ""),
    });
  const cancelTextEdit = () => setEditingCell(null);
  const commitTextEdit = async (task) => {
    if (!editingCell || String(task.id) !== String(editingCell.taskId)) return;
    const { field } = editingCell;
    let value = editingCell.value;
    setEditingCell(null);
    if (field === "title") {
      value = value.trim();
      if (!value) return;
    }
    if (field === "amount") value = Number(value || 0);
    await commitTaskPatch(task, { [field]: value });
  };
  const handleTextKeys = (event, task) => {
    if (event.key === "Escape") {
      event.preventDefault();
      cancelTextEdit();
    }
    if (event.key === "Enter") {
      event.preventDefault();
      commitTextEdit(task);
    }
  };
  const isEditing = (task, field) =>
    editingCell?.taskId === String(task.id) && editingCell?.field === field;
  const dateCellClass =
    "h-8 w-full rounded-md border border-transparent bg-transparent px-2 text-xs font-medium text-zinc-700 outline-none hover:border-zinc-200 hover:bg-white focus:border-blue/40 focus:bg-white focus:ring-2 focus:ring-blue/10";
  const dateButtonClass =
    "flex h-8 w-full items-center rounded-md px-2 text-left text-xs font-medium text-zinc-700 hover:bg-white";
  const compactSelectClass =
    "[&_button]:h-8 [&_button]:rounded-md [&_button]:px-2 [&_button]:text-xs [&_button]:shadow-none";
  const headerCellClass =
    "border-b border-r border-zinc-100 bg-zinc-50/80 px-3 py-2 text-left text-[10px] font-bold uppercase tracking-[0.11em] text-zinc-400";
  const bodyCellClass =
    "border-b border-r border-zinc-100 px-2 py-1.5 align-middle";

  if (!tasks.length) {
    return (
      <section className="rounded-xl border border-line bg-white p-6 shadow-soft">
        <EmptyState
          title="No matching tasks"
          description="Adjust your filters or clear them to return to the full task workspace."
          action="Clear filters"
          onAction={clearFilters}
        />
      </section>
    );
  }

  return (
    <section className="overflow-hidden rounded-xl border border-line bg-white shadow-panel">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-white px-4 py-3">
        <label className="flex items-center gap-3 text-xs font-semibold text-zinc-500">
          <input
            className="h-4 w-4 rounded border-zinc-300 text-blue focus:ring-blue/20"
            type="checkbox"
            checked={allVisibleSelected}
            onChange={onToggleAll}
            aria-label="Select visible tasks"
          />
          <span>
            <strong className="text-zinc-800">{tasks.length}</strong> task
            {tasks.length === 1 ? "" : "s"} in table
          </span>
        </label>
        <span className="text-[11px] font-medium text-zinc-400">
          Click a cell to edit. Enter saves, Escape cancels.
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1540px] border-collapse text-sm">
          <thead className="sticky top-0 z-10">
            <tr>
              <th className={`${headerCellClass} w-10`}></th>
              <th className={`${headerCellClass} w-[280px]`}>Task</th>
              <th className={`${headerCellClass} w-40`}>Category</th>
              <th className={`${headerCellClass} w-56`}>Client</th>
              <th className={`${headerCellClass} w-48`}>Owner</th>
              <th className={`${headerCellClass} w-36`}>Priority</th>
              <th className={`${headerCellClass} w-44`}>Status</th>
              <th className={`${headerCellClass} w-36`}>Deadline</th>
              <th className={`${headerCellClass} w-36`}>Reminder</th>
              <th className={`${headerCellClass} w-52`}>Billing</th>
              <th className={`${headerCellClass} w-32`}>Recurring</th>
              <th className={`${headerCellClass} w-20 border-r-0`}></th>
            </tr>
          </thead>
          <tbody>
            {visibleTasks.map((task) => {
              const client = clients.find((item) => item.id === task.clientId);
              const proofCount =
                (task.attachments?.length || 0) + (task.proofLink ? 1 : 0);
              return (
                <tr
                  key={task.id}
                  className={`group transition hover:bg-zinc-50/70 ${
                    selected.includes(task.id) ? "bg-blue/[0.035]" : "bg-white"
                  }`}
                >
                  <td className={`${bodyCellClass} text-center`}>
                    <input
                      className="h-4 w-4 rounded border-zinc-300 text-blue focus:ring-blue/20"
                      type="checkbox"
                      checked={selected.includes(task.id)}
                      onChange={() => onToggle(task.id)}
                      aria-label={`Select ${task.title}`}
                    />
                  </td>
                  <td className={bodyCellClass}>
                    {isEditing(task, "title") ? (
                      <input
                        className="h-8 w-full rounded-md border border-blue/30 bg-white px-2 text-sm font-semibold text-zinc-900 outline-none ring-2 ring-blue/10"
                        value={editingCell.value}
                        autoFocus
                        onChange={(event) =>
                          setEditingCell((current) => ({
                            ...current,
                            value: event.target.value,
                          }))
                        }
                        onBlur={() => commitTextEdit(task)}
                        onKeyDown={(event) => handleTextKeys(event, task)}
                      />
                    ) : (
                      <button
                        className="flex min-h-8 w-full min-w-0 items-center gap-2 rounded-md px-2 text-left hover:bg-white"
                        type="button"
                        onClick={() => startTextEdit(task, "title", task.title)}
                      >
                        <span className="truncate text-sm font-semibold text-zinc-900">
                          {task.title || "Untitled task"}
                        </span>
                        {proofCount > 0 && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-zinc-400">
                            <Paperclip size={11} />
                            {proofCount}
                          </span>
                        )}
                      </button>
                    )}
                  </td>
                  <td className={bodyCellClass}>
                    <ModernSelect
                      className={compactSelectClass}
                      options={CATEGORY_COMBOBOX_OPTIONS}
                      value={task.category}
                      onChange={(category) =>
                        commitTaskPatch(task, { category })
                      }
                    />
                  </td>
                  <td className={bodyCellClass}>
                    <ClientCombobox
                      className={compactSelectClass}
                      clients={clients}
                      value={task.clientId}
                      onChange={(clientId) =>
                        commitTaskPatch(task, { clientId })
                      }
                    />
                    {!client && (
                      <p className="mt-1 px-2 text-[10px] font-medium text-zinc-400">
                        Deleted client
                      </p>
                    )}
                  </td>
                  <td className={bodyCellClass}>
                    <ModernSelect
                      className={compactSelectClass}
                      options={assignedUserOptions}
                      value={task.assignedUserId || ""}
                      searchable
                      searchPlaceholder="Search users..."
                      onChange={(assignedUserId) =>
                        commitTaskPatch(task, {
                          assignedUserId,
                          assignedUserName:
                            users.find(
                              (user) =>
                                String(user.id) === String(assignedUserId),
                            )?.name || "",
                        })
                      }
                    />
                  </td>
                  <td className={bodyCellClass}>
                    <div className="grid grid-cols-[1fr_auto] items-center gap-2">
                      <PriorityBadge priority={task.priority} />
                      <ModernSelect
                        className={`${compactSelectClass} min-w-0`}
                        options={priorityOptions}
                        value={task.priority}
                        onChange={(priority) =>
                          commitTaskPatch(task, { priority })
                        }
                      />
                    </div>
                  </td>
                  <td className={bodyCellClass}>
                    <div className="grid grid-cols-[1fr_auto] items-center gap-2">
                      <StatusBadge status={task.status} />
                      <ModernSelect
                        className={`${compactSelectClass} min-w-0`}
                        options={TASK_STATUS_COMBOBOX_OPTIONS}
                        value={task.status}
                        onChange={(status) =>
                          commitTaskPatch(task, { status })
                        }
                      />
                    </div>
                  </td>
                  <td className={bodyCellClass}>
                    {isEditing(task, "deadline") ? (
                      <input
                        className={dateCellClass}
                        type="date"
                        value={editingCell.value}
                        autoFocus
                        onChange={(event) =>
                          setEditingCell((current) => ({
                            ...current,
                            value: event.target.value,
                          }))
                        }
                        onBlur={() => commitTextEdit(task)}
                        onKeyDown={(event) => handleTextKeys(event, task)}
                      />
                    ) : (
                      <button
                        type="button"
                        className={dateButtonClass}
                        onClick={() =>
                          startTextEdit(task, "deadline", task.deadline || "")
                        }
                      >
                        {task.deadline
                          ? formatDate(task.deadline, {
                              month: "short",
                              day: "numeric",
                            })
                          : "No date"}
                      </button>
                    )}
                  </td>
                  <td className={bodyCellClass}>
                    {isEditing(task, "reminderDate") ? (
                      <input
                        className={dateCellClass}
                        type="date"
                        value={editingCell.value}
                        autoFocus
                        onChange={(event) =>
                          setEditingCell((current) => ({
                            ...current,
                            value: event.target.value,
                          }))
                        }
                        onBlur={() => commitTextEdit(task)}
                        onKeyDown={(event) => handleTextKeys(event, task)}
                      />
                    ) : (
                      <button
                        type="button"
                        className={`${dateButtonClass} ${
                          task.reminderDate ? "" : "text-zinc-400"
                        }`}
                        onClick={() =>
                          startTextEdit(
                            task,
                            "reminderDate",
                            task.reminderDate || "",
                          )
                        }
                      >
                        {task.reminderDate
                          ? formatDate(task.reminderDate, {
                              month: "short",
                              day: "numeric",
                            })
                          : "No reminder"}
                      </button>
                    )}
                  </td>
                  <td className={bodyCellClass}>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        className={`inline-flex h-7 items-center gap-1.5 rounded-md border px-2 text-[11px] font-semibold transition ${
                          task.billable
                            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                            : "border-zinc-200 bg-zinc-50 text-zinc-500"
                        }`}
                        onClick={() =>
                          commitTaskPatch(task, {
                            billable: !task.billable,
                            amount: task.billable ? 0 : Number(task.amount || 0),
                          })
                        }
                      >
                        <CircleDollarSign size={12} />
                        {task.billable ? "Extra billable" : "Included"}
                      </button>
                      {task.billable ? (
                        isEditing(task, "amount") ? (
                          <input
                            className="h-7 w-24 rounded-md border border-blue/30 bg-white px-2 text-xs font-semibold outline-none ring-2 ring-blue/10"
                            type="number"
                            min="0"
                            value={editingCell.value}
                            autoFocus
                            onChange={(event) =>
                              setEditingCell((current) => ({
                                ...current,
                                value: event.target.value,
                              }))
                            }
                            onBlur={() => commitTextEdit(task)}
                            onKeyDown={(event) => handleTextKeys(event, task)}
                          />
                        ) : (
                          <button
                            type="button"
                            className="h-7 rounded-md px-2 text-xs font-bold text-zinc-800 hover:bg-white"
                            onClick={() =>
                              startTextEdit(task, "amount", task.amount || 0)
                            }
                          >
                            {formatMoney(task.amount)}
                          </button>
                        )
                      ) : null}
                    </div>
                  </td>
                  <td className={bodyCellClass}>
                    <button
                      type="button"
                      className={`inline-flex h-7 items-center gap-1.5 rounded-md border px-2 text-[11px] font-semibold transition ${
                        task.isRecurring
                          ? "border-violet-200 bg-violet-50 text-violet-700"
                          : "border-zinc-200 bg-zinc-50 text-zinc-500"
                      }`}
                      onClick={() =>
                        commitTaskPatch(task, {
                          isRecurring: !task.isRecurring,
                          recurrenceType:
                            task.recurrenceType || "monthly",
                          recurrenceInterval:
                            Number(task.recurrenceInterval || 1),
                          nextOccurrenceDate: !task.isRecurring
                            ? task.nextOccurrenceDate || task.deadline || TODAY
                            : task.nextOccurrenceDate,
                        })
                      }
                    >
                      <Repeat2 size={12} />
                      {task.isRecurring ? "Recurring" : "No"}
                    </button>
                  </td>
                  <td className={`${bodyCellClass} border-r-0`}>
                    <div className="flex items-center justify-end gap-1">
                      <button
                        type="button"
                        className="rounded-md px-2 py-1 text-[11px] font-semibold text-zinc-500 hover:bg-zinc-100 hover:text-blue"
                        onClick={() => onEditTask(task)}
                      >
                        Open
                      </button>
                      <ActionMenu
                        onEdit={() => onEditTask(task)}
                        onDelete={() => onDeleteTask(task.id)}
                      />
                    </div>
                  </td>
                </tr>
              );
            })}
            <tr>
              <td className="border-r border-zinc-100 px-2 py-2"></td>
              <td colSpan={11} className="px-2 py-2">
                <button
                  type="button"
                  className="flex h-9 w-full items-center gap-2 rounded-md px-2 text-left text-sm font-semibold text-zinc-500 transition hover:bg-zinc-50 hover:text-blue"
                  onClick={onNewTask}
                >
                  <Plus size={15} />
                  New task
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  );
}

function TaskCalendarGrid({ tasks, clients, onEditTask }) {
  const datedTasks = tasks
    .filter((task) => task.deadline || task.reminderDate)
    .sort((a, b) =>
      String(a.deadline || a.reminderDate || "").localeCompare(
        String(b.deadline || b.reminderDate || ""),
      ),
    );
  const groups = datedTasks.reduce((result, task) => {
    const date = task.deadline || task.reminderDate || "No date";
    if (!result[date]) result[date] = [];
    result[date].push(task);
    return result;
  }, {});

  if (!datedTasks.length) {
    return (
      <div className="rounded-xl border border-line bg-white p-6 shadow-soft">
        <EmptyState
          title="No dated tasks"
          description="Tasks with deadlines or reminders will appear in this calendar view."
        />
      </div>
    );
  }

  return (
    <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {Object.entries(groups).map(([date, entries]) => (
        <article
          key={date}
          className="overflow-hidden rounded-xl border border-line bg-white shadow-soft"
        >
          <div className="border-b border-line bg-zinc-50/70 px-4 py-3">
            <p className="text-sm font-semibold text-zinc-900">
              {formatDate(date, { weekday: "short", month: "short", day: "numeric" })}
            </p>
            <p className="mt-1 text-[11px] font-medium text-zinc-400">
              {entries.length} task{entries.length === 1 ? "" : "s"}
            </p>
          </div>
          <div className="divide-y divide-line">
            {entries.map((task) => {
              const client = clients.find((item) => item.id === task.clientId);
              return (
                <button
                  key={task.id}
                  type="button"
                  className="block w-full px-4 py-3 text-left transition hover:bg-zinc-50"
                  onClick={() => onEditTask(task)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-zinc-900">
                        {task.title}
                      </p>
                      <p className="mt-1 truncate text-xs text-zinc-500">
                        {client?.name || "Deleted client"}
                      </p>
                    </div>
                    <PriorityBadge priority={task.priority} />
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <StatusBadge status={task.status} />
                    <DeadlineBadge task={task} />
                  </div>
                </button>
              );
            })}
          </div>
        </article>
      ))}
    </section>
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
  reorderTasks,
  view,
  onViewChange,
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
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const [sortMode, setSortMode] = useState("default");
  const searchInputRef = useRef(null);
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
  const timestamp = (value) => {
    if (!value) return 0;
    const parsed = Date.parse(String(value).replace(" ", "T"));
    return Number.isNaN(parsed) ? 0 : parsed;
  };
  const idRank = (value) => {
    const numeric = Number(value);
    return Number.isNaN(numeric) ? 0 : numeric;
  };
  const priorityRank = { Urgent: 0, High: 1, Medium: 2, Low: 3 };
  const statusRank = {
    New: 0,
    "In Progress": 1,
    "Waiting for Client": 2,
    Revision: 3,
    Completed: 4,
  };
  const baseTaskSort = (a, b) => {
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
      if (aCompletedTime !== bCompletedTime)
        return bCompletedTime - aCompletedTime;
      return idRank(b.id) - idRank(a.id);
    }

    const aCreatedTime = timestamp(a.createdAt || a.updatedAt);
    const bCreatedTime = timestamp(b.createdAt || b.updatedAt);
    if (aCreatedTime !== bCreatedTime) return bCreatedTime - aCreatedTime;

    return idRank(b.id) - idRank(a.id);
  };
  const sortedTasks = [...filtered].sort((a, b) => {
    if (sortMode === "oldest") {
      const base = baseTaskSort(a, b);
      if (a.status === "Completed" || b.status === "Completed") return base;
      const aCreatedTime = timestamp(a.createdAt || a.updatedAt);
      const bCreatedTime = timestamp(b.createdAt || b.updatedAt);
      if (aCreatedTime !== bCreatedTime) return aCreatedTime - bCreatedTime;
      return idRank(a.id) - idRank(b.id);
    }
    if (sortMode === "deadline") {
      const base = baseTaskSort(a, b);
      if (a.status === "Completed" || b.status === "Completed") return base;
      return String(a.deadline || "9999-12-31").localeCompare(
        String(b.deadline || "9999-12-31"),
      );
    }
    if (sortMode === "priority") {
      const base = baseTaskSort(a, b);
      if (a.status === "Completed" || b.status === "Completed") return base;
      const priorityDifference =
        (priorityRank[a.priority] ?? 9) - (priorityRank[b.priority] ?? 9);
      return priorityDifference || base;
    }
    if (sortMode === "status") {
      const statusDifference =
        (statusRank[a.status] ?? 9) - (statusRank[b.status] ?? 9);
      return statusDifference || baseTaskSort(a, b);
    }
    if (sortMode === "client") {
      const aClient =
        clients.find((client) => client.id === a.clientId)?.name || "";
      const bClient =
        clients.find((client) => client.id === b.clientId)?.name || "";
      return aClient.localeCompare(bClient) || baseTaskSort(a, b);
    }
    return baseTaskSort(a, b);
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
  const viewTabs = [
    { value: "table", label: "Table", icon: Table2 },
    { value: "board", label: "Board", icon: LayoutDashboard },
    { value: "calendar", label: "Calendar", icon: CalendarDays },
    { value: "list", label: "List", icon: ListChecks },
  ];
  const sortOptions = [
    ["default", "Newest first"],
    ["oldest", "Oldest first"],
    ["deadline", "Deadline soonest"],
    ["priority", "Priority high first"],
    ["status", "Status order"],
    ["client", "Client name"],
  ];
  const clientFilterOptions = [
    { value: "All", label: "All clients" },
    ...clients.map((client) => ({
      value: client.id,
      label: client.name,
      description: client.servicePackage || "",
      initials: client.initials,
    })),
  ];
  const assigneeFilterOptions = [
    { value: "All", label: "All assignees" },
    { value: "Unassigned", label: "Unassigned", icon: UserRound },
    ...users.map((user) => ({
      value: String(user.id),
      label: user.name,
      description: user.role || "",
      initials: String(user.name || "")
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0])
        .join("")
        .toUpperCase(),
    })),
  ];
  const statusFilterOptions = [
    { value: "All", label: "All statuses" },
    ...TASK_STATUSES.map((status) => ({
      value: status,
      label: getStatusLabel(status),
      dotClass: getStatusDotTone(status),
    })),
  ];
  const priorityFilterOptions = [
    { value: "All", label: "All priorities" },
    ...PRIORITIES.map((priority) => ({ value: priority, label: priority })),
  ];
  const deadlineFilterOptions = [
    { value: "All", label: "All deadlines" },
    { value: "Overdue", label: "Overdue" },
    { value: "Due Today", label: "Due today" },
    { value: "Due This Week", label: "Due this week" },
    { value: "No Deadline", label: "No deadline" },
  ];
  const activeFilterCount = [
    clientFilter !== "All",
    statusFilter !== "All",
    priorityFilter !== "All",
    assigneeFilter !== "All",
    deadlineFilter !== "All",
    billableOnly,
    recurringOnly,
  ].filter(Boolean).length;
  return (
    <>
      <section className="mb-5 rounded-xl border border-line bg-white shadow-soft">
        <div className="flex flex-col gap-4 px-4 py-4 sm:px-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold tracking-[-0.035em] text-zinc-950 sm:text-3xl">
              Tasks
            </h1>
            <p className="mt-1 text-sm leading-6 text-zinc-500">
              Plan, assign, and track client work across every delivery view.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-line bg-white text-zinc-500 transition hover:border-zinc-300 hover:text-blue"
              type="button"
              onClick={() => searchInputRef.current?.focus()}
              aria-label="Focus task search"
            >
              <Search size={15} />
            </button>
            <button
              className={`inline-flex h-9 items-center gap-2 rounded-lg border px-3 text-xs font-semibold transition ${filtersOpen ? "border-blue/20 bg-blue/5 text-blue" : "border-line bg-white text-zinc-500 hover:border-zinc-300 hover:text-ink"}`}
              type="button"
              onClick={() => setFiltersOpen((current) => !current)}
            >
              <Filter size={14} />
              Filter
              {activeFilterCount > 0 && (
                <span className="rounded-full bg-blue px-1.5 py-0.5 text-[10px] text-white">
                  {activeFilterCount}
                </span>
              )}
            </button>
            <div className="relative">
              <button
                className={`inline-flex h-9 items-center gap-2 rounded-lg border px-3 text-xs font-semibold transition ${sortOpen ? "border-blue/20 bg-blue/5 text-blue" : "border-line bg-white text-zinc-500 hover:border-zinc-300 hover:text-ink"}`}
                type="button"
                onClick={() => setSortOpen((current) => !current)}
              >
                <ArrowUpDown size={14} />
                Sort
              </button>
              {sortOpen && (
                <div className="absolute right-0 top-11 z-30 w-52 rounded-xl border border-line bg-white p-1 shadow-panel">
                  {sortOptions.map(([value, label]) => (
                    <button
                      key={value}
                      className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-xs font-semibold transition ${sortMode === value ? "bg-ink text-white" : "text-zinc-600 hover:bg-zinc-50 hover:text-ink"}`}
                      type="button"
                      onClick={() => {
                        setSortMode(value);
                        setSortOpen(false);
                      }}
                    >
                      {label}
                      {sortMode === value && <CheckCircle2 size={13} />}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-line bg-white text-zinc-500 transition hover:border-zinc-300 hover:text-blue"
              type="button"
              aria-label="View options"
            >
              <SlidersHorizontal size={15} />
            </button>
            <Button onClick={onNewTask}>
              <Plus size={15} />
              New Task
            </Button>
          </div>
        </div>
        <div className="border-t border-line px-4 py-3 sm:px-5">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex min-w-0 flex-wrap items-center gap-1.5">
              {viewTabs.map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  className={`inline-flex h-9 items-center gap-2 rounded-full px-3 text-xs font-semibold transition ${view === value ? "bg-ink text-white shadow-soft" : "text-zinc-500 hover:bg-zinc-100 hover:text-ink"}`}
                  type="button"
                  onClick={() => onViewChange(value)}
                >
                  <Icon size={14} />
                  {label}
                </button>
              ))}
            </div>
            <div className="flex min-w-[240px] flex-1 items-center gap-2 rounded-xl border border-line bg-zinc-50/70 px-3 transition focus-within:border-blue/40 focus-within:bg-white focus-within:ring-2 focus-within:ring-blue/10 xl:max-w-md">
              <Search size={14} className="shrink-0 text-zinc-400" />
              <input
                ref={searchInputRef}
                className="w-full bg-transparent py-2.5 text-sm font-medium outline-none placeholder:text-zinc-400"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search tasks, clients, or notes..."
              />
            </div>
          </div>
          <p className="mt-3 text-xs font-medium text-zinc-400">
            {filtered.length} of {tasks.length} tasks shown
          </p>
        </div>
      </section>
      {!tasks.length ? (
        <div className="rounded-xl border border-line bg-white p-5 shadow-soft">
          <EmptyState
            title="Your task workspace is ready"
            description="Create the first client task to start planning deadlines, assignments, and delivery."
            action="Create task"
            onAction={onNewTask}
          />
        </div>
      ) : (
        <div className="space-y-3">
          {filtersOpen && (
            <section className="rounded-xl border border-line bg-white p-4 shadow-soft">
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                <div>
                  <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.12em] text-zinc-400">
                    Client
                  </span>
                  <ModernSelect
                    options={clientFilterOptions}
                    value={clientFilter}
                    onChange={setClientFilter}
                    searchable
                    searchPlaceholder="Search clients..."
                  />
                </div>
                <div>
                  <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.12em] text-zinc-400">
                    Assignee
                  </span>
                  <ModernSelect
                    options={assigneeFilterOptions}
                    value={assigneeFilter}
                    onChange={setAssigneeFilter}
                    searchable
                    searchPlaceholder="Search users..."
                  />
                </div>
                <div>
                  <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.12em] text-zinc-400">
                    Status
                  </span>
                  <ModernSelect
                    options={statusFilterOptions}
                    value={statusFilter}
                    onChange={setStatusFilter}
                  />
                </div>
                <div>
                  <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.12em] text-zinc-400">
                    Priority
                  </span>
                  <ModernSelect
                    options={priorityFilterOptions}
                    value={priorityFilter}
                    onChange={setPriorityFilter}
                  />
                </div>
                <div>
                  <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.12em] text-zinc-400">
                    Deadline
                  </span>
                  <ModernSelect
                    options={deadlineFilterOptions}
                    value={deadlineFilter}
                    onChange={setDeadlineFilter}
                  />
                </div>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <button
                  className={`inline-flex min-h-9 items-center gap-2 rounded-lg border px-3 text-xs font-semibold transition ${billableOnly ? "border-blue bg-blue text-white" : "border-line bg-white text-zinc-600 hover:border-zinc-300"}`}
                  type="button"
                  onClick={() => setBillableOnly((current) => !current)}
                  aria-pressed={billableOnly}
                >
                  <CircleDollarSign size={14} />
                  Extra billable
                </button>
                <button
                  className={`inline-flex min-h-9 items-center gap-2 rounded-lg border px-3 text-xs font-semibold transition ${recurringOnly ? "border-blue bg-blue text-white" : "border-line bg-white text-zinc-600 hover:border-zinc-300"}`}
                  type="button"
                  onClick={() => setRecurringOnly((current) => !current)}
                  aria-pressed={recurringOnly}
                >
                  <Repeat2 size={14} />
                  Recurring
                </button>
                {activeFilterCount > 0 && (
                  <button
                    className="ml-auto text-xs font-bold text-blue hover:underline"
                    type="button"
                    onClick={clearFilters}
                  >
                    Clear filters
                  </button>
                )}
              </div>
            </section>
          )}
          {view === "table" && selected.length > 0 && (
            <section className="sticky top-3 z-20 flex flex-wrap items-center gap-2 rounded-xl border border-blue/20 bg-white/95 p-3 shadow-panel backdrop-blur">
              <div className="mr-2 flex items-center gap-2 rounded-lg bg-blue px-3 py-2 text-xs font-bold text-white">
                <CheckCircle2 size={14} />
                {selected.length} selected
              </div>
              <select
                className="rounded-lg border border-line bg-white px-3 py-2 text-xs font-semibold outline-none"
                value={bulkStatus}
                onChange={(event) => setBulkStatus(event.target.value)}
              >
                <option value="">Change status</option>
                {TASK_STATUSES.map((status) => (
                  <option key={status} value={status}>{getStatusLabel(status)}</option>
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
                className="rounded-lg border border-line bg-white px-3 py-2 text-xs font-semibold outline-none"
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
                className="rounded-lg border border-line bg-white px-3 py-2 text-xs font-semibold outline-none"
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
          {view === "board" ? (
            <TaskBoard
              clients={clients}
              tasks={tasks}
              visibleTaskIds={new Set(filtered.map((task) => String(task.id)))}
              onNewTask={onNewTask}
              onEditTask={onEditTask}
              onDeleteTask={onDeleteTask}
              reorderTasks={reorderTasks}
            />
          ) : view === "calendar" ? (
            <TaskCalendarGrid
              tasks={sortedTasks}
              clients={clients}
              onEditTask={onEditTask}
            />
          ) : view === "list" ? (
            <TaskCompactList
              tasks={sortedTasks}
              clients={clients}
              onEditTask={onEditTask}
              updateTask={updateTask}
            />
          ) : (
            <TaskDatabaseTable
              tasks={sortedTasks}
              clients={clients}
              users={users}
              selected={selected}
              allVisibleSelected={allVisibleSelected}
              onToggle={toggleSelected}
              onToggleAll={() =>
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
              onEditTask={onEditTask}
              onDeleteTask={onDeleteTask}
              updateTask={updateTask}
              onNewTask={onNewTask}
              clearFilters={clearFilters}
            />
          )}
        </div>
      )}
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
      label: "Extra billable delivered",
      value: formatMoney(
        completed
          .filter((task) => task.billable)
          .reduce((sum, task) => sum + Number(task.amount), 0),
      ),
      detail: "Completed extra value",
      icon: CircleDollarSign,
      tone: "bg-orange-50 text-orange-700",
    },
  ];
  return (
    <>
      <PageHeader
        eyebrow="Delivery record"
        title="Daily Logs"
        description="A chronological record of completed client work, proof, and package delivery."
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
                              Included in package
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
  const reportText = `${client?.name || "Client"} — ${monthLabel}\n\nWork completed:\n${completed.map((task) => `- ${task.title}`).join("\n") || "- No completed work recorded"}\n\nDesigns/content delivered:\n${deliverables.map((task) => `- ${task.title}`).join("\n") || "- No design or content deliverables recorded"}\n\nPending tasks:\n${pending.map((task) => `- ${task.title} (${getStatusLabel(task.status)})`).join("\n") || "- No pending tasks"}\n\nExtra billable work:\n${billable.map((task) => `- ${task.title}: ${formatMoney(amountFor(task))}`).join("\n") || "- No extra billable work"}\n\nNext month plan:\n- Complete pending deliverables\n- Review campaign performance\n- Confirm next month priorities with the client`;
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

function BillingPage({
  clients,
  tasks,
  billings,
  monthlyInvoices = [],
  updateTask,
  isFallback,
}) {
  const currentMonth = Number(TODAY.slice(5, 7));
  const currentYear = Number(TODAY.slice(0, 4));
  const [month, setMonth] = useState(currentMonth);
  const [year, setYear] = useState(currentYear);
  const [monthlyRows, setMonthlyRows] = useState(monthlyInvoices);
  const [loadingMonthly, setLoadingMonthly] = useState(false);
  const [billingError, setBillingError] = useState("");
  const [manageRow, setManageRow] = useState(null);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [billingForm, setBillingForm] = useState(null);
  const [savingBilling, setSavingBilling] = useState(false);
  const periodPrefix = `${year}-${String(month).padStart(2, "0")}`;
  const months = Array.from({ length: 12 }, (_, index) => ({
    value: index + 1,
    label: new Intl.DateTimeFormat("en-US", {
      month: "long",
      timeZone: "UTC",
    }).format(new Date(`2026-${String(index + 1).padStart(2, "0")}-01T00:00:00Z`)),
  }));
  const years = [currentYear - 1, currentYear, currentYear + 1];
  const paymentStatusOptions = [
    {
      value: "Unpaid",
      label: "Unpaid",
      description: "No payment recorded",
      dotClass: "bg-slate-400",
    },
    {
      value: "Partial",
      label: "Partial",
      description: "Partially paid",
      dotClass: "bg-amber-500",
    },
    {
      value: "Paid",
      label: "Paid",
      description: "Invoice settled",
      dotClass: "bg-emerald-500",
    },
  ];
  const invoiceStatusFor = (paidAmount, totalAmount) => {
    if (Number(paidAmount || 0) <= 0) return "Unpaid";
    if (Number(paidAmount || 0) >= Number(totalAmount || 0)) return "Paid";
    return "Partial";
  };
  const periodKey = (targetMonth, targetYear) =>
    `${targetYear}-${String(targetMonth).padStart(2, "0")}`;
  const taskPeriodDate = (task) =>
    String(task.completedAt || task.deadline || task.createdAt || "").slice(0, 7);
  const activeClients = clients.filter(
    (client) => String(client.status || "active").toLowerCase() === "active",
  );
  const fallbackRowForClient = (
    client,
    targetMonth = month,
    targetYear = year,
  ) => {
    const targetPeriod = periodKey(targetMonth, targetYear);
    const clientTasks = tasks.filter(
      (task) =>
        task.clientId === client.id && taskPeriodDate(task) === targetPeriod,
    );
    const extraTasks = clientTasks.filter((task) => task.billable);
    const extraAmount = extraTasks.reduce(
      (sum, task) => sum + Number(task.amount || 0),
      0,
    );
    const monthlyFee = Number(client.monthlyFee || 0);
    return {
      id: "",
      clientId: client.id,
      clientName: client.name,
      servicePackage: client.servicePackage || "",
      month: targetMonth,
      year: targetYear,
      monthlyFee,
      includedTaskCount: clientTasks.filter((task) => !task.billable).length,
      extraTaskCount: extraTasks.length,
      extraAmount,
      totalAmount: monthlyFee + extraAmount,
      paidAmount: 0,
      outstandingAmount: monthlyFee + extraAmount,
      status: "Unpaid",
      notes: "",
    };
  };
  const fallbackRows = activeClients.map((client) => fallbackRowForClient(client));
  const rowForClientPeriod = (
    clientId,
    targetMonth = month,
    targetYear = year,
  ) => {
    const existing =
      targetMonth === month && targetYear === year
        ? monthlyRows.find(
            (row) => String(row.clientId) === String(clientId),
          )
        : null;
    if (existing) return existing;
    const client = clients.find((item) => String(item.id) === String(clientId));
    return client ? fallbackRowForClient(client, targetMonth, targetYear) : null;
  };
  const invoiceRows = monthlyRows.length ? monthlyRows : fallbackRows;
  const monthlyTotals = invoiceRows.reduce(
    (totals, row) => ({
      recurring: totals.recurring + Number(row.monthlyFee || 0),
      extra: totals.extra + Number(row.extraAmount || 0),
      paid: totals.paid + Number(row.paidAmount || 0),
      outstanding: totals.outstanding + Number(row.outstandingAmount || 0),
    }),
    { recurring: 0, extra: 0, paid: 0, outstanding: 0 },
  );
  const billable = billings.filter(
    (task) => !task.deadline || String(task.deadline).startsWith(periodPrefix),
  );

  const refreshMonthlyBilling = useCallback(async () => {
    if (isFallback) {
      setMonthlyRows([]);
      return;
    }
    setLoadingMonthly(true);
    setBillingError("");
    try {
      const response = await getBillings({ month, year });
      setMonthlyRows((response.monthly_invoices || []).map(monthlyInvoiceFromApi));
    } catch (error) {
      setBillingError(error.message);
      setMonthlyRows([]);
    } finally {
      setLoadingMonthly(false);
    }
  }, [isFallback, month, year]);

  useEffect(() => {
    if (month === currentMonth && year === currentYear) {
      setMonthlyRows(monthlyInvoices);
    }
  }, [currentMonth, currentYear, month, monthlyInvoices, year]);

  useEffect(() => {
    refreshMonthlyBilling();
  }, [refreshMonthlyBilling]);

  const updateInvoice = async (row, patch = {}) => {
    if (isFallback) {
      setBillingError("Monthly invoice updates require the backend API.");
      return false;
    }
    setBillingError("");
    setSavingBilling(true);
    try {
      const payload = {
        client_id: Number(row.clientId),
        month: Number(patch.month ?? row.month ?? month),
        year: Number(patch.year ?? row.year ?? year),
        monthly_fee: Number(patch.monthly_fee ?? row.monthlyFee ?? 0),
        paid_amount: Number(patch.paid_amount ?? row.paidAmount ?? 0),
        status: patch.status || row.status,
        notes: patch.notes ?? row.notes ?? "",
        ...patch,
      };
      await updateMonthlyInvoice(payload);
      await refreshMonthlyBilling();
      toast.success("Monthly invoice updated.");
      return true;
    } catch (error) {
      setBillingError(error.message);
      toast.error(error.message);
      return false;
    } finally {
      setSavingBilling(false);
    }
  };

  const generateInvoice = async (row) => {
    if (isFallback) {
      setBillingError("Monthly invoice generation requires the backend API.");
      return false;
    }
    setBillingError("");
    setSavingBilling(true);
    try {
      await generateMonthlyInvoice({
        client_id: Number(row.clientId),
        month: Number(row.month || month),
        year: Number(row.year || year),
        monthly_fee: Number(row.monthlyFee || 0),
        paid_amount: Number(row.paidAmount || 0),
        status: row.status,
        notes: row.notes || "",
      });
      await refreshMonthlyBilling();
      toast.success("Monthly invoice generated.");
      return true;
    } catch (error) {
      setBillingError(error.message);
      toast.error(error.message);
      return false;
    } finally {
      setSavingBilling(false);
    }
  };

  const formFromRow = (row, mode = "manage") => ({
    mode,
    clientId: row.clientId || "",
    clientName: row.clientName || "",
    month: Number(row.month || month),
    year: Number(row.year || year),
    monthlyFee: String(row.monthlyFee ?? 0),
    extraAmount: Number(row.extraAmount || 0),
    paidAmount: String(row.paidAmount ?? 0),
    status: row.status || invoiceStatusFor(row.paidAmount, row.totalAmount),
    notes: row.notes || "",
  });

  const modalBaseRow = billingForm
    ? rowForClientPeriod(
        billingForm.clientId,
        Number(billingForm.month || month),
        Number(billingForm.year || year),
      )
    : null;
  const modalMonthlyFee = Number(
    billingForm?.monthlyFee ?? modalBaseRow?.monthlyFee ?? 0,
  );
  const modalExtraAmount = Number(modalBaseRow?.extraAmount || 0);
  const modalTotalAmount = modalMonthlyFee + modalExtraAmount;
  const modalPaidAmount = Math.max(
    0,
    Math.min(Number(billingForm?.paidAmount || 0), modalTotalAmount),
  );
  const modalStatus =
    billingForm?.status || invoiceStatusFor(modalPaidAmount, modalTotalAmount);
  const modalOutstanding = Math.max(0, modalTotalAmount - modalPaidAmount);
  const modalRow = billingForm && modalBaseRow
    ? {
        ...modalBaseRow,
        month: Number(billingForm.month || month),
        year: Number(billingForm.year || year),
        monthlyFee: modalMonthlyFee,
        totalAmount: modalTotalAmount,
        paidAmount: modalPaidAmount,
        outstandingAmount: modalOutstanding,
        status: modalStatus,
        notes: billingForm.notes || "",
      }
    : null;

  const openManageBilling = (row) => {
    setManageRow(row);
    setPaymentModalOpen(false);
    setBillingForm(formFromRow(row, "manage"));
  };

  const openAddPayment = () => {
    const row =
      invoiceRows[0] ||
      (activeClients[0] ? fallbackRowForClient(activeClients[0]) : null);
    setManageRow(null);
    setPaymentModalOpen(true);
    setBillingForm(row ? formFromRow(row, "payment") : {
      mode: "payment",
      clientId: "",
      clientName: "",
      month,
      year,
      monthlyFee: "0",
      extraAmount: 0,
      paidAmount: "0",
      status: "Unpaid",
      notes: "",
    });
  };

  const closeBillingModal = useCallback(() => {
    setManageRow(null);
    setPaymentModalOpen(false);
    setBillingForm(null);
  }, []);

  const updateBillingForm = (patch) => {
    setBillingForm((current) => {
      const next = { ...current, ...patch };
      const nextRow = rowForClientPeriod(
        next.clientId,
        Number(next.month || month),
        Number(next.year || year),
      );
      if (
        "clientId" in patch ||
        "month" in patch ||
        "year" in patch
      ) {
        next.clientName = nextRow?.clientName || "";
        next.monthlyFee = String(nextRow?.monthlyFee ?? 0);
        next.extraAmount = Number(nextRow?.extraAmount || 0);
        next.paidAmount = String(nextRow?.paidAmount ?? 0);
        next.status =
          nextRow?.status ||
          invoiceStatusFor(nextRow?.paidAmount, nextRow?.totalAmount);
        next.notes = nextRow?.notes || "";
      }
      return next;
    });
  };

  const syncBillingStatus = (status) => {
    setBillingForm((current) => {
      if (!current) return current;
      const next = { ...current, status };
      if (status === "Paid") next.paidAmount = String(modalTotalAmount);
      if (status === "Unpaid") next.paidAmount = "0";
      return next;
    });
  };

  const saveModalInvoice = async (patch = {}) => {
    if (!modalRow) return;
    const saved = await updateInvoice(modalRow, patch);
    if (saved) closeBillingModal();
  };

  const generateModalInvoice = async () => {
    if (!modalRow) return;
    const generated = await generateInvoice(modalRow);
    if (generated) closeBillingModal();
  };

  const monthFieldOptions = months.map((item) => ({
    value: item.value,
    label: item.label,
  }));
  const yearFieldOptions = years.map((item) => ({
    value: item,
    label: String(item),
  }));

  const metricCards = [
    ["Monthly Recurring Revenue", formatMoney(monthlyTotals.recurring), `${invoiceRows.length} active clients`, CalendarRange, "bg-blue/5 text-blue"],
    ["Extra Billable Work", formatMoney(monthlyTotals.extra), `${invoiceRows.reduce((sum, row) => sum + Number(row.extraTaskCount || 0), 0)} extra tasks`, CircleDollarSign, "bg-violet-50 text-violet-700"],
    ["Paid", formatMoney(monthlyTotals.paid), "Recorded monthly payments", CheckCircle2, "bg-emerald-50 text-emerald-700"],
    ["Outstanding", formatMoney(monthlyTotals.outstanding), "Awaiting collection", Clock3, "bg-orange-50 text-orange-700"],
  ];

  return (
    <>
      <PageHeader
        title="Billing"
        description="Track monthly client packages, extra billable work, invoices and payment collection."
      />
      <section className="mb-4 rounded-xl border border-line bg-white p-4 shadow-soft">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-sm font-semibold text-zinc-900">
              Monthly billing period
            </h2>
            <p className="mt-1 text-xs text-zinc-500">
              Package fees are combined with extra billable tasks for the selected month.
            </p>
          </div>
          <div className="grid gap-2 sm:grid-cols-[160px_120px_auto_auto]">
            <label>
              <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                Month
              </span>
              <select
                className="field"
                value={month}
                onChange={(event) => setMonth(Number(event.target.value))}
              >
                {months.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                Year
              </span>
              <select
                className="field"
                value={year}
                onChange={(event) => setYear(Number(event.target.value))}
              >
                {years.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </label>
            <button
              className="button-secondary self-end"
              onClick={refreshMonthlyBilling}
              disabled={loadingMonthly}
            >
              <Repeat2 size={14} className={loadingMonthly ? "animate-spin" : ""} />
              Refresh
            </button>
            <button
              className="button-primary self-end"
              type="button"
              onClick={openAddPayment}
            >
              <Plus size={14} />
              Add Payment
            </button>
          </div>
        </div>
        {billingError && (
          <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            {billingError}
          </p>
        )}
      </section>

      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {metricCards.map(([label, value, detail, Icon, tone]) => (
          <article
            key={label}
            className="rounded-xl border border-line bg-white p-5 shadow-soft transition hover:-translate-y-0.5 hover:shadow-panel"
          >
            <div className="flex items-start justify-between">
              <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${tone}`}>
                <Icon size={17} />
              </span>
              <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-zinc-300">
                NPR
              </span>
            </div>
            <p className="mt-5 text-2xl font-semibold tracking-tight text-zinc-900">
              {value}
            </p>
            <p className="mt-1 text-xs font-bold text-zinc-700">{label}</p>
            <p className="mt-1 text-[11px] text-zinc-400">{detail}</p>
          </article>
        ))}
      </div>

      <section className="overflow-visible rounded-xl border border-line bg-white shadow-panel">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-100 px-5 py-4">
          <div>
            <h2 className="text-sm font-semibold text-zinc-900">
              Monthly client invoices
            </h2>
            <p className="mt-1 text-xs text-zinc-400">
              Package fee + extra billable work = total invoice amount.
            </p>
          </div>
          <Badge className="border-zinc-200 bg-zinc-50 text-zinc-600">
            {invoiceRows.length} clients
          </Badge>
        </div>
        {invoiceRows.length ? (
          <div className="divide-y divide-zinc-100">
            {invoiceRows.map((row) => (
              <article
                key={`${row.clientId}-${row.month}-${row.year}`}
                className="grid gap-4 px-5 py-4 transition hover:bg-zinc-50/70 2xl:grid-cols-[minmax(220px,1.05fr)_128px_92px_92px_124px_132px_128px_138px_110px] 2xl:items-center"
              >
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-semibold text-zinc-900">
                      {row.clientName}
                    </h3>
                    <BillingBadge value={row.status} />
                  </div>
                  <p className="mt-1.5 text-xs font-medium text-zinc-500">
                    {row.servicePackage || "No package set"}
                  </p>
                  <p className="mt-1 text-[11px] text-zinc-400">
                    {row.id ? `Invoice #${row.id}` : "Not generated yet"}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                    Monthly fee
                  </p>
                  <p className="mt-1 text-sm font-bold text-zinc-900">
                    {formatMoney(row.monthlyFee)}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                    Included
                  </p>
                  <p className="mt-1 text-sm font-semibold text-zinc-700">
                    {row.includedTaskCount} tasks
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                    Extras
                  </p>
                  <p className="mt-1 text-sm font-semibold text-zinc-700">
                    {row.extraTaskCount} tasks
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                    Extra amount
                  </p>
                  <p className="mt-1 text-sm font-bold text-zinc-900">
                    {formatMoney(row.extraAmount)}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                    Total invoice
                  </p>
                  <p className="mt-1 text-sm font-bold text-zinc-900">
                    {formatMoney(row.totalAmount)}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                    Paid amount
                  </p>
                  <p className="mt-1 text-sm font-bold text-emerald-700">
                    {formatMoney(row.paidAmount)}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                    Outstanding
                  </p>
                  <p className="mt-1 text-sm font-bold text-orange-700">
                    {formatMoney(row.outstandingAmount)}
                  </p>
                </div>
                <div className="2xl:text-right">
                  <button
                    className="button-secondary px-3 py-2 text-xs"
                    type="button"
                    onClick={() => openManageBilling(row)}
                  >
                    Manage
                  </button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="p-6">
            <EmptyState
              title="No monthly billing rows"
              description="Active clients with package fees will appear here for the selected month."
            />
          </div>
        )}
      </section>

      <Modal
        open={Boolean(billingForm && (manageRow || paymentModalOpen))}
        onClose={closeBillingModal}
        title={
          paymentModalOpen
            ? "Add Payment"
            : (
              <>
                Manage Billing {"\u2014"}{" "}
                {billingForm?.clientName || modalRow?.clientName || "Client"}
              </>
            )
        }
        description="Update one client invoice for the selected month without changing the billing ledger layout."
        size="max-w-4xl"
      >
        {billingForm && modalRow ? (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              saveModalInvoice();
            }}
          >
            <div className="grid gap-5 p-5 sm:p-6 lg:grid-cols-[1fr_0.8fr]">
              <section className="space-y-4">
                {paymentModalOpen && (
                  <div>
                    <span className="mb-2 block text-sm font-semibold">
                      Client
                    </span>
                    <ClientCombobox
                      clients={activeClients}
                      value={billingForm.clientId}
                      onChange={(clientId) => updateBillingForm({ clientId })}
                    />
                  </div>
                )}

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <span className="mb-2 block text-sm font-semibold">
                      Month
                    </span>
                    <ModernSelect
                      options={monthFieldOptions}
                      value={billingForm.month}
                      onChange={(nextMonth) =>
                        updateBillingForm({ month: Number(nextMonth) })
                      }
                    />
                  </div>
                  <div>
                    <span className="mb-2 block text-sm font-semibold">
                      Year
                    </span>
                    <ModernSelect
                      options={yearFieldOptions}
                      value={billingForm.year}
                      onChange={(nextYear) =>
                        updateBillingForm({ year: Number(nextYear) })
                      }
                    />
                  </div>
                </div>

                {!paymentModalOpen && (
                  <Field label="Monthly fee">
                    <input
                      className="field"
                      type="number"
                      min="0"
                      value={billingForm.monthlyFee}
                      onChange={(event) =>
                        updateBillingForm({
                          monthlyFee: event.target.value,
                          status: invoiceStatusFor(
                            billingForm.paidAmount,
                            Number(event.target.value || 0) + modalExtraAmount,
                          ),
                        })
                      }
                    />
                  </Field>
                )}

                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Paid amount">
                    <input
                      className="field"
                      type="number"
                      min="0"
                      max={modalTotalAmount}
                      value={billingForm.paidAmount}
                      onChange={(event) =>
                        updateBillingForm({
                          paidAmount: event.target.value,
                          status: invoiceStatusFor(
                            event.target.value,
                            modalTotalAmount,
                          ),
                        })
                      }
                    />
                  </Field>
                  <div>
                    <span className="mb-2 block text-sm font-semibold">
                      Payment status
                    </span>
                    <ModernSelect
                      options={paymentStatusOptions}
                      value={modalStatus}
                      onChange={syncBillingStatus}
                    />
                  </div>
                </div>

                <Field label="Payment note">
                  <textarea
                    className="field min-h-24 resize-y"
                    value={billingForm.notes}
                    onChange={(event) =>
                      updateBillingForm({ notes: event.target.value })
                    }
                    placeholder="Advance payment, pending confirmation, or invoice remark"
                  />
                </Field>
              </section>

              <aside className="rounded-xl border border-line bg-zinc-50/70 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-zinc-400">
                      Invoice summary
                    </p>
                    <h3 className="mt-2 text-base font-semibold text-zinc-900">
                      {modalRow.clientName}
                    </h3>
                    <p className="mt-1 text-xs text-zinc-500">
                      {modalRow.servicePackage || "No package set"}
                    </p>
                  </div>
                  <BillingBadge value={modalStatus} />
                </div>

                <div className="mt-5 grid gap-3">
                  {[
                    ["Monthly fee", formatMoney(modalMonthlyFee)],
                    ["Extra billable amount", formatMoney(modalExtraAmount)],
                    ["Total invoice", formatMoney(modalTotalAmount)],
                    ["Paid amount", formatMoney(modalPaidAmount)],
                    ["Outstanding", formatMoney(modalOutstanding)],
                  ].map(([label, value]) => (
                    <div
                      className="flex items-center justify-between gap-4 rounded-lg border border-zinc-200 bg-white px-3 py-2"
                      key={label}
                    >
                      <span className="text-xs font-semibold text-zinc-500">
                        {label}
                      </span>
                      <span className="text-sm font-bold tabular-nums text-zinc-900">
                        {value}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="mt-5 rounded-lg border border-dashed border-zinc-200 bg-white p-3">
                  <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-zinc-400">
                    Included work
                  </p>
                  <p className="mt-2 text-sm font-semibold text-zinc-800">
                    {modalRow.includedTaskCount} included task
                    {modalRow.includedTaskCount === 1 ? "" : "s"}{" "}
                    {"\u00B7"}{" "}
                    {modalRow.extraTaskCount} extra task
                    {modalRow.extraTaskCount === 1 ? "" : "s"}
                  </p>
                </div>
              </aside>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line bg-white px-5 py-4 sm:px-6">
              <button
                className="button-secondary"
                type="button"
                onClick={closeBillingModal}
                disabled={savingBilling}
              >
                Cancel
              </button>
              <div className="flex flex-wrap justify-end gap-2">
                <button
                  className="button-secondary px-3 py-2 text-xs"
                  type="button"
                  onClick={generateModalInvoice}
                  disabled={savingBilling}
                >
                  Generate invoice
                </button>
                <button
                  className="button-secondary px-3 py-2 text-xs"
                  type="button"
                  onClick={() =>
                    saveModalInvoice({ status: "Unpaid", paid_amount: 0 })
                  }
                  disabled={savingBilling}
                >
                  Mark as Unpaid
                </button>
                <button
                  className="button-secondary px-3 py-2 text-xs"
                  type="button"
                  onClick={() =>
                    saveModalInvoice({
                      status: "Partial",
                      paid_amount: modalPaidAmount,
                    })
                  }
                  disabled={savingBilling}
                >
                  Mark as Partial
                </button>
                <button
                  className="button-secondary px-3 py-2 text-xs"
                  type="button"
                  onClick={() =>
                    saveModalInvoice({
                      status: "Paid",
                      paid_amount: modalTotalAmount,
                    })
                  }
                  disabled={savingBilling}
                >
                  Mark as Paid
                </button>
                <button
                  className="button-primary"
                  type="submit"
                  disabled={savingBilling}
                >
                  {savingBilling ? "Saving..." : "Save changes"}
                </button>
              </div>
            </div>
          </form>
        ) : (
          <div className="p-6">
            <EmptyState
              title="No active clients available"
              description="Add an active client before recording monthly payments."
            />
          </div>
        )}
      </Modal>

      <section className="mt-5 overflow-hidden rounded-xl border border-line bg-white shadow-panel">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-100 px-5 py-4">
          <div>
            <h2 className="text-sm font-semibold text-zinc-900">
              Extra billable work ledger
            </h2>
            <p className="mt-1 text-xs text-zinc-400">
              Task-level extras remain available for payment and invoice tracking.
            </p>
          </div>
          <Badge className="border-zinc-200 bg-zinc-50 text-zinc-600">
            {billable.length} items
          </Badge>
        </div>
        {billable.length ? (
          <div className="divide-y divide-zinc-100">
            {billable.map((task) => (
              <article
                key={task.id}
                className="grid gap-4 px-5 py-4 transition hover:bg-zinc-50/70 lg:grid-cols-[minmax(260px,1.4fr)_150px_130px_150px_150px] lg:items-center"
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
                    {task.deadline ? formatDate(task.deadline) : "No date"}
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
                    className={`w-full rounded-lg border px-3 py-2 text-xs font-bold outline-none transition focus:ring-2 focus:ring-blue/10 ${getBillingTone(task.paymentStatus || "Unpaid")}`}
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
                    className={`w-full rounded-lg border px-3 py-2 text-xs font-bold outline-none transition focus:ring-2 focus:ring-blue/10 ${getBillingTone(task.invoiceStatus || "Not invoiced")}`}
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
        ) : (
          <div className="p-6">
            <EmptyState
              title="No extra billable work"
              description="Tasks marked as extra billable work will appear here outside the monthly package."
            />
          </div>
        )}
      </section>
    </>
  );
}

function WorkspaceApp({ user, onLogout, onUserUpdate }) {
  const workspace = useWorkspace();
  const initialRoute = routeStateFromLocation();
  const [activePage, setActivePage] = useState(initialRoute.page);
  const [taskView, setTaskView] = useState(initialRoute.taskView);
  const [selectedClientId, setSelectedClientId] = useState(
    initialRoute.clientId,
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
    const nextPage = page === "Kanban Board" ? "Tasks" : page;
    const nextTaskView = page === "Kanban Board" ? "board" : taskView;
    if (page === "Kanban Board") setTaskView("board");
    setActivePage(nextPage);
    if (nextPage !== "Client Detail") {
      setSelectedClientId("");
    }
    pushAppRoute(nextPage, { taskView: nextTaskView });
  };
  const changeTaskView = (view) => {
    const nextView = ["table", "board", "calendar", "list"].includes(view)
      ? view
      : "table";
    setTaskView(nextView);
    if (activePage === "Tasks") {
      pushAppRoute("Tasks", { taskView: nextView });
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
    pushAppRoute("Client Detail", { clientId: id });
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
      const nextRoute = routeStateFromLocation();
      setActivePage(nextRoute.page);
      setTaskView(nextRoute.taskView);
      setSelectedClientId(nextRoute.clientId);
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
  useEffect(() => {
    if (
      workspace.loading ||
      activePage !== "Client Detail" ||
      !selectedClientId ||
      selectedClient
    ) {
      return;
    }
    setSelectedClientId("");
    setActivePage("Clients");
    pushAppRoute("Clients", {}, true);
  }, [activePage, selectedClient, selectedClientId, workspace.loading]);
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
    reorderTasks: workspace.reorderBoardTasks,
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
        monthlyInvoices={workspace.monthlyInvoices || []}
        activities={(workspace.activities || [])
          .filter((activity) => activity.clientId === selectedClient.id)
          .slice(0, 20)}
        isFallback={workspace.isFallback}
        onBack={() => navigatePage("Clients")}
        onNewTask={newTask}
        onEditTask={setTaskModal}
        onDeleteTask={deleteTask}
        updateTask={workspace.updateTask}
        onEditClient={() => setClientModal(selectedClient)}
        onUpdateClient={workspace.saveClient}
        onUploadLogo={(file) => workspace.saveClientLogo(selectedClient.id, file)}
        onRemoveLogo={() => workspace.clearClientLogo(selectedClient.id)}
      />
    ) : (
      <EmptyState
        title="Client not found"
        description="This client may have been removed or the link is invalid."
        action="Back to clients"
        onAction={() => navigatePage("Clients")}
      />
    ),
    Tasks: (
      <TasksPage
        {...shared}
        view={taskView}
        onViewChange={changeTaskView}
      />
    ),
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
        tasks={workspace.tasks}
        billings={workspace.billings}
        monthlyInvoices={workspace.monthlyInvoices || []}
        updateTask={workspace.updateTask}
        isFallback={workspace.isFallback}
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
  const canvasClass =
    activePage === "Dashboard"
      ? "dashboard-canvas"
      : ["Tasks", "Clients"].includes(activePage)
        ? "wide-canvas"
        : "page-canvas";

  return (
    <div className="min-h-screen bg-canvas">
      <Sidebar
        activePage={activePage}
        setActivePage={navigatePage}
        open={sidebarOpen}
        setOpen={setSidebarOpen}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed((value) => !value)}
        settings={workspace.settings || DEFAULT_SETTINGS}
        user={user}
      />
      <div className={sidebarCollapsed ? "lg:pl-20" : "lg:pl-[300px]"}>
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
        <main className="app-content-shell">
          <div className={canvasClass}>
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
          </div>
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
    const handleUnauthorized = () => {
      toast.error("Your session expired. Please sign in again.");
      setUser(null);
    };
    window.addEventListener("auth:unauthorized", handleUnauthorized);
    return () =>
      window.removeEventListener("auth:unauthorized", handleUnauthorized);
  }, []);

  if (portalMatch) {
    return <ClientPortalPage token={portalMatch[1]} />;
  }

  if (!user) {
    return <LoginPage onLogin={(nextUser) => { setUser(nextUser); toast.success("Signed in successfully."); }} />;
  }

  const handleLogout = async () => {
    await logout();
    setUser(null);
    toast.success("Signed out.");
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
