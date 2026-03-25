import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  Plus,
  Trash2,
  Check,
  Calendar,
  Clock,
  AlertTriangle,
  Sparkles,
  CheckCircle2,
  Circle,
  ListTodo,
  X,
  Video,
  Users,
} from "lucide-react";

const TASK_TYPES = [
  { value: "follow_up", label: "Follow-up", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  { value: "account_opening", label: "Account Opening", color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
  { value: "document_request", label: "Document Request", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
  { value: "rebalancing", label: "Rebalancing", color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400" },
  { value: "insurance", label: "Insurance", color: "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400" },
  { value: "estate_planning", label: "Estate Planning", color: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400" },
  { value: "tax_planning", label: "Tax Planning", color: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400" },
  { value: "compliance", label: "Compliance", color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
  { value: "general", label: "General", color: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400" },
];

function getTypeConfig(type: string) {
  return TASK_TYPES.find(t => t.value === type) || TASK_TYPES[TASK_TYPES.length - 1];
}

function getPriorityIcon(priority: string) {
  if (priority === "high") return <AlertTriangle className="w-3 h-3 text-red-500" />;
  if (priority === "medium") return <Clock className="w-3 h-3 text-amber-500" />;
  return null;
}

function isOverdue(dueDate: string | null) {
  if (!dueDate) return false;
  return new Date(dueDate) < new Date(new Date().toDateString());
}

interface SuggestedTask {
  title: string;
  type: string;
  description: string;
  suggestedDueDate: string;
  priority: string;
}

interface TaskSidebarProps {
  clientId: string;
  advisorId: string;
  teamMembers: Array<{ id: string; associateId: string; role: string; associate: { id: string; name: string; avatarUrl?: string | null } }>;
  suggestedTasks?: SuggestedTask[];
  onSuggestedTaskAdded?: (task: SuggestedTask) => void;
}

export default function TaskSidebar({ clientId, advisorId, teamMembers, suggestedTasks = [], onSuggestedTaskAdded }: TaskSidebarProps) {
  const [addOpen, setAddOpen] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState("general");
  const [dueDate, setDueDate] = useState("");
  const [priority, setPriority] = useState("medium");
  const [assigneeId, setAssigneeId] = useState("");

  const { data: tasks = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/clients", clientId, "tasks"],
    staleTime: Infinity, // SSE "reminder:created" + mutations invalidate — no polling needed
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/tasks", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients", clientId, "tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      resetForm();
      setAddOpen(false);
    },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      apiRequest("PATCH", `/api/tasks/${id}`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients", clientId, "tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/tasks/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients", clientId, "tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
    },
  });

  function resetForm() {
    setTitle("");
    setDescription("");
    setType("general");
    setDueDate("");
    setPriority("medium");
    setAssigneeId("");
  }

  function handleCreate() {
    if (!title.trim()) return;
    createMutation.mutate({
      clientId,
      advisorId,
      title: title.trim(),
      description: description.trim() || null,
      type,
      dueDate: dueDate || null,
      priority,
      assigneeId: assigneeId && assigneeId !== "none" ? assigneeId : null,
    });
  }

  function handleAddSuggested(st: SuggestedTask) {
    createMutation.mutate({
      clientId,
      advisorId,
      title: st.title,
      description: st.description || null,
      type: st.type,
      dueDate: st.suggestedDueDate || null,
      priority: st.priority || "medium",
    });
    onSuggestedTaskAdded?.(st);
  }

  const activeTasks = tasks.filter((t: any) => t.status !== "completed");
  const completedTasks = tasks.filter((t: any) => t.status === "completed");

  return (
    <div className="space-y-3" data-testid="task-sidebar">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold flex items-center gap-1.5">
          <ListTodo className="w-4 h-4" />
          Tasks
          {activeTasks.length > 0 && (
            <Badge variant="secondary" className="no-default-active-elevate ml-1 text-xs">
              {activeTasks.length}
            </Badge>
          )}
        </h3>
        <Button size="sm" variant="outline" onClick={() => setAddOpen(true)} data-testid="button-add-task">
          <Plus className="w-3.5 h-3.5 mr-1" /> Add
        </Button>
      </div>

      {suggestedTasks.length > 0 && (
        <Card className="border-dashed border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-950/20">
          <CardHeader className="pb-2 pt-3 px-3">
            <CardTitle className="text-xs font-medium flex items-center gap-1.5 text-amber-700 dark:text-amber-400">
              <Sparkles className="w-3.5 h-3.5" />
              AI Suggested Tasks
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-3 space-y-2">
            {suggestedTasks.map((st, i) => {
              const typeConf = getTypeConfig(st.type);
              return (
                <div key={i} className="flex items-start justify-between gap-2 text-xs" data-testid={`suggested-task-${i}`}>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium truncate">{st.title}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <Badge variant="secondary" className={`no-default-active-elevate text-[10px] px-1.5 py-0 ${typeConf.color}`}>
                        {typeConf.label}
                      </Badge>
                      {st.suggestedDueDate && (
                        <span className="text-muted-foreground">{new Date(st.suggestedDueDate).toLocaleDateString()}</span>
                      )}
                    </div>
                  </div>
                  <Button size="sm" variant="outline" className="shrink-0 h-6 text-xs px-2" onClick={() => handleAddSuggested(st)} data-testid={`button-add-suggested-${i}`}>
                    <Plus className="w-3 h-3 mr-0.5" /> Add
                  </Button>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="text-xs text-muted-foreground py-4 text-center">Loading tasks...</div>
      ) : activeTasks.length === 0 && suggestedTasks.length === 0 ? (
        <div className="text-xs text-muted-foreground py-4 text-center border rounded-md">
          No active tasks. Click Add to create one.
        </div>
      ) : (
        <div className="space-y-2.5">
          {activeTasks.map((task: any) => {
            const typeConf = getTypeConfig(task.type || "general");
            const overdue = isOverdue(task.dueDate);
            return (
              <div
                key={task.id}
                className="group flex items-start gap-2 p-2 rounded-md border bg-card text-xs"
                data-testid={`task-item-${task.id}`}
              >
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleMutation.mutate({ id: task.id, status: "completed" })}
                  className="shrink-0 h-6 w-6 p-0 mt-0.5 rounded-full"
                  data-testid={`button-complete-task-${task.id}`}
                >
                  <Circle className="w-4 h-4 text-muted-foreground" />
                </Button>
                <div className="min-w-0 flex-1">
                  <p className="font-medium leading-snug">{task.title}</p>
                  {task.description && (
                    <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2">{task.description}</p>
                  )}
                  <div className="flex flex-wrap items-center gap-1.5 mt-1">
                    <Badge variant="secondary" className={`no-default-active-elevate text-[10px] px-1.5 py-0 ${typeConf.color}`}>
                      {typeConf.label}
                    </Badge>
                    {getPriorityIcon(task.priority)}
                    {task.meetingId && (
                      <span className="text-muted-foreground flex items-center gap-0.5" title="Linked to meeting">
                        <Video className="w-3 h-3" />
                      </span>
                    )}
                    {task.dueDate && (
                      <span className={`flex items-center gap-0.5 ${overdue ? "text-red-500 font-medium" : "text-muted-foreground"}`}>
                        <Calendar className="w-3 h-3" />
                        {new Date(task.dueDate).toLocaleDateString()}
                      </span>
                    )}
                    {task.whoName && (
                      <span className="text-muted-foreground flex items-center gap-0.5">
                        <Users className="w-3 h-3" /> {task.whoName}
                      </span>
                    )}
                    {task.whatName && !task.whoName && (
                      <span className="text-muted-foreground flex items-center gap-0.5">{task.whatName}</span>
                    )}
                  </div>
                  {task.assigneeName && (
                    <div className="flex items-center gap-1 mt-1">
                      <Avatar className="w-4 h-4">
                        {task.assigneeAvatarUrl && <AvatarImage src={task.assigneeAvatarUrl} />}
                        <AvatarFallback className="text-[8px]">{task.assigneeName?.split(' ').map((n: string) => n[0]).join('')}</AvatarFallback>
                      </Avatar>
                      <span className="text-muted-foreground">{task.assigneeName}</span>
                    </div>
                  )}
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="opacity-0 group-hover:opacity-100 shrink-0 h-6 w-6 p-0"
                  onClick={() => deleteMutation.mutate(task.id)}
                  data-testid={`button-delete-task-${task.id}`}
                >
                  <Trash2 className="w-3 h-3 text-muted-foreground" />
                </Button>
              </div>
            );
          })}
        </div>
      )}

      {completedTasks.length > 0 && (
        <div>
          <Button
            variant="ghost"
            size="sm"
            className="text-xs text-muted-foreground w-full justify-start"
            onClick={() => setShowCompleted(!showCompleted)}
            data-testid="button-toggle-completed"
          >
            <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
            {showCompleted ? "Hide" : "Show"} completed ({completedTasks.length})
          </Button>
          {showCompleted && (
            <div className="space-y-1 mt-1">
              {completedTasks.map((task: any) => (
                <div key={task.id} className="group flex items-start gap-2 p-2 rounded-md text-xs opacity-60" data-testid={`task-completed-${task.id}`}>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleMutation.mutate({ id: task.id, status: "pending" })}
                    className="shrink-0 h-6 w-6 p-0 mt-0.5 rounded-full"
                    data-testid={`button-uncomplete-task-${task.id}`}
                  >
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                  </Button>
                  <p className="line-through font-medium leading-snug">{task.title}</p>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="opacity-0 group-hover:opacity-100 shrink-0 h-6 w-6 p-0 ml-auto"
                    onClick={() => deleteMutation.mutate(task.id)}
                    data-testid={`button-delete-completed-${task.id}`}
                  >
                    <Trash2 className="w-3 h-3 text-muted-foreground" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Task</DialogTitle>
            <DialogDescription>Create a new task for this client</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium">Title</label>
              <Input
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Task title"
                data-testid="input-task-title"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Description</label>
              <Textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Optional description"
                rows={2}
                data-testid="textarea-task-description"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">Type</label>
                <Select value={type} onValueChange={setType}>
                  <SelectTrigger data-testid="select-task-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TASK_TYPES.map(t => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Priority</label>
                <Select value={priority} onValueChange={setPriority}>
                  <SelectTrigger data-testid="select-task-priority">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Due Date</label>
              <Input
                type="date"
                value={dueDate}
                onChange={e => setDueDate(e.target.value)}
                data-testid="input-task-due-date"
              />
            </div>
            {teamMembers.length > 0 && (
              <div>
                <label className="text-sm font-medium">Assign To</label>
                <Select value={assigneeId} onValueChange={setAssigneeId}>
                  <SelectTrigger data-testid="select-task-assignee">
                    <SelectValue placeholder="Unassigned" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Unassigned</SelectItem>
                    {teamMembers.map(tm => (
                      <SelectItem key={tm.associateId} value={tm.associateId}>
                        {tm.associate.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <Button
              className="w-full"
              onClick={handleCreate}
              disabled={!title.trim() || createMutation.isPending}
              data-testid="button-create-task"
            >
              {createMutation.isPending ? "Creating..." : "Create Task"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function MeetingTasksPanel({ meetingId, clientId, advisorId }: { meetingId: string; clientId?: string; advisorId?: string }) {
  const { toast } = useToast();
  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState("follow_up");
  const [priority, setPriority] = useState("medium");
  const [dueDate, setDueDate] = useState("");
  const [assigneeId, setAssigneeId] = useState("");
  const [showLinkDialog, setShowLinkDialog] = useState(false);

  const { data: meetingTasks = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/meetings", meetingId, "tasks"],
    queryFn: async () => {
      const res = await fetch(`/api/meetings/${meetingId}/tasks`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
  });

  const { data: clientTasks = [] } = useQuery<any[]>({
    queryKey: ["/api/clients", clientId, "tasks"],
    enabled: !!clientId,
  });

  const { data: teamData } = useQuery<any[]>({
    queryKey: clientId ? ["/api/clients", clientId, "team"] : ["/api/team"],
    enabled: !!clientId,
  });

  const unlinkableClientTasks = clientTasks.filter((t: any) => !t.meetingId && t.status !== "completed");

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/tasks", data);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Task created and linked to meeting" });
      queryClient.invalidateQueries({ queryKey: ["/api/meetings", meetingId, "tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/clients", clientId, "tasks"] });
      setShowCreate(false);
      setTitle("");
      setDescription("");
      setType("follow_up");
      setPriority("medium");
      setDueDate("");
      setAssigneeId("");
    },
    onError: (err: any) => {
      toast({ title: "Failed to create task", description: err.message, variant: "destructive" });
    },
  });

  const linkMutation = useMutation({
    mutationFn: async (taskId: string) => {
      const res = await apiRequest("PATCH", `/api/tasks/${taskId}`, { meetingId });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Task linked to meeting" });
      queryClient.invalidateQueries({ queryKey: ["/api/meetings", meetingId, "tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/clients", clientId, "tasks"] });
      setShowLinkDialog(false);
    },
  });

  const unlinkMutation = useMutation({
    mutationFn: async (taskId: string) => {
      const res = await apiRequest("PATCH", `/api/tasks/${taskId}`, { meetingId: null });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Task unlinked from meeting" });
      queryClient.invalidateQueries({ queryKey: ["/api/meetings", meetingId, "tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/clients", clientId, "tasks"] });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await apiRequest("PATCH", `/api/tasks/${id}`, { status });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/meetings", meetingId, "tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/clients", clientId, "tasks"] });
    },
  });

  const teamMembers = teamData || [];
  const activeTasks = meetingTasks.filter((t: any) => t.status !== "completed");
  const completedTasks = meetingTasks.filter((t: any) => t.status === "completed");

  return (
    <div data-testid="meeting-tasks-panel">
      <div className="flex items-center justify-between mb-2">
        <h4 className="font-semibold text-sm flex items-center gap-1">
          <ListTodo className="h-4 w-4 text-primary" /> Meeting Tasks
          {meetingTasks.length > 0 && (
            <Badge variant="secondary" className="no-default-active-elevate ml-1 text-[10px] px-1.5 py-0">
              {activeTasks.length}
            </Badge>
          )}
        </h4>
        <div className="flex gap-1">
          {clientId && unlinkableClientTasks.length > 0 && (
            <Button size="sm" variant="outline" onClick={() => setShowLinkDialog(true)} data-testid="button-link-task-to-meeting">
              <Plus className="h-3 w-3 mr-1" /> Link
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={() => setShowCreate(true)} data-testid="button-create-meeting-task">
            <Plus className="h-3 w-3 mr-1" /> New
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="text-xs text-muted-foreground py-2">Loading tasks...</div>
      ) : meetingTasks.length === 0 ? (
        <div className="text-center py-3 border rounded-md bg-muted/30">
          <p className="text-xs text-muted-foreground">No tasks linked to this meeting.</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {activeTasks.map((task: any) => {
            const typeConf = getTypeConfig(task.type);
            return (
              <div key={task.id} className="flex items-start gap-2 p-2 rounded-md border bg-card text-xs" data-testid={`meeting-task-${task.id}`}>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleMutation.mutate({ id: task.id, status: "completed" })}
                  className="shrink-0 h-5 w-5 p-0 rounded-full"
                  data-testid={`button-complete-meeting-task-${task.id}`}
                >
                  <Circle className="w-3.5 h-3.5 text-muted-foreground" />
                </Button>
                <div className="min-w-0 flex-1">
                  <p className="font-medium leading-snug">{task.title}</p>
                  <div className="flex flex-wrap items-center gap-1 mt-0.5">
                    <Badge variant="secondary" className={`no-default-active-elevate text-[10px] px-1.5 py-0 ${typeConf.color}`}>
                      {typeConf.label}
                    </Badge>
                    {task.dueDate && (
                      <span className={`text-[10px] flex items-center gap-0.5 ${isOverdue(task.dueDate) ? "text-red-500" : "text-muted-foreground"}`}>
                        <Calendar className="w-2.5 h-2.5" /> {new Date(task.dueDate).toLocaleDateString()}
                      </span>
                    )}
                    {getPriorityIcon(task.priority)}
                    {task.assigneeName && (
                      <span className="text-[10px] text-muted-foreground">{task.assigneeName}</span>
                    )}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="shrink-0 h-5 w-5 p-0"
                  onClick={(e) => { e.stopPropagation(); unlinkMutation.mutate(task.id); }}
                  title="Unlink from meeting"
                  data-testid={`button-unlink-meeting-task-${task.id}`}
                >
                  <X className="w-3 h-3 text-muted-foreground" />
                </Button>
              </div>
            );
          })}
          {completedTasks.length > 0 && (
            <div className="space-y-1 mt-1">
              {completedTasks.map((task: any) => (
                <div key={task.id} className="flex items-center gap-2 p-1.5 text-xs opacity-60" data-testid={`meeting-task-completed-${task.id}`}>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleMutation.mutate({ id: task.id, status: "pending" })}
                    className="shrink-0 h-5 w-5 p-0 rounded-full"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                  </Button>
                  <p className="line-through">{task.title}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Create Meeting Task</DialogTitle>
            <DialogDescription>Create a new task linked to this meeting.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium">Title</label>
              <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Task title..." data-testid="input-meeting-task-title" />
            </div>
            <div>
              <label className="text-sm font-medium">Description</label>
              <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Optional description..." rows={2} data-testid="textarea-meeting-task-desc" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-sm font-medium">Type</label>
                <Select value={type} onValueChange={setType}>
                  <SelectTrigger data-testid="select-meeting-task-type"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TASK_TYPES.map(t => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Priority</label>
                <Select value={priority} onValueChange={setPriority}>
                  <SelectTrigger data-testid="select-meeting-task-priority"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Due Date</label>
              <Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} data-testid="input-meeting-task-due" />
            </div>
            {teamMembers.length > 0 && (
              <div>
                <label className="text-sm font-medium">Assign To</label>
                <Select value={assigneeId} onValueChange={setAssigneeId}>
                  <SelectTrigger data-testid="select-meeting-task-assignee"><SelectValue placeholder="Unassigned" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Unassigned</SelectItem>
                    {teamMembers.map((tm: any) => (
                      <SelectItem key={tm.associateId || tm.id} value={tm.associateId || tm.id}>
                        {tm.associate?.name || tm.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <Button
              className="w-full"
              onClick={() => {
                createMutation.mutate({
                  title: title.trim(),
                  description: description.trim() || undefined,
                  type,
                  priority,
                  dueDate: dueDate || undefined,
                  clientId: clientId || undefined,
                  meetingId,
                  assigneeId: assigneeId && assigneeId !== "none" ? assigneeId : undefined,
                });
              }}
              disabled={!title.trim() || createMutation.isPending}
              data-testid="button-submit-meeting-task"
            >
              {createMutation.isPending ? "Creating..." : "Create Task"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showLinkDialog} onOpenChange={setShowLinkDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Link Existing Task</DialogTitle>
            <DialogDescription>Link an existing client task to this meeting.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2.5 max-h-64 overflow-y-auto">
            {unlinkableClientTasks.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No unlinked tasks available.</p>
            ) : unlinkableClientTasks.map((task: any) => {
              const typeConf = getTypeConfig(task.type);
              return (
                <div
                  key={task.id}
                  className="flex items-center justify-between p-2 rounded-md border text-xs cursor-pointer"
                  onClick={() => linkMutation.mutate(task.id)}
                  data-testid={`button-link-task-${task.id}`}
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{task.title}</p>
                    <Badge variant="secondary" className={`no-default-active-elevate text-[10px] px-1.5 py-0 mt-0.5 ${typeConf.color}`}>
                      {typeConf.label}
                    </Badge>
                  </div>
                  <Plus className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                </div>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
