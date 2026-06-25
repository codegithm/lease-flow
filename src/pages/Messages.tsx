import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import {
  MessageSquare,
  Send,
  Search,
  Plus,
  AlertTriangle,
  Wrench,
  Clock,
  CheckCircle2,
  XCircle,
  User,
  Building2,
  MoreVertical,
  Paperclip,
  Image,
  Filter,
  RefreshCw,
  Megaphone,
  AlertCircle,
  CreditCard,
  ArrowLeft,
} from "lucide-react";
import {
  getConversations,
  getMessages,
  sendMessage,
  createConversation,
  getMaintenanceRequests,
  createMaintenanceRequest,
  getUnits,
  getEstates,
  getMessageTypes,
  Conversation,
  MaintenanceRequest,
  MessageType,
} from "@/lib/api";

type MaintenancePriority = "Low" | "Medium" | "High" | "Urgent";
type MaintenanceStatus =
  | "Open"
  | "InProgress"
  | "OnHold"
  | "Resolved"
  | "Closed"
  | "Cancelled";

interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  senderName?: string;
  senderRole?: string;
  content: string;
  type: string;
  createdAt: string;
  isRead?: boolean;
}

const priorityConfig: Record<
  MaintenancePriority,
  { label: string; color: string; icon: React.ComponentType<any> }
> = {
  Low: { label: "Low", color: "bg-muted text-muted-foreground", icon: Clock },
  Medium: {
    label: "Medium",
    color: "bg-warning/20 text-warning",
    icon: AlertTriangle,
  },
  High: {
    label: "High",
    color: "bg-orange-500/20 text-orange-500",
    icon: AlertTriangle,
  },
  Urgent: {
    label: "Urgent",
    color: "bg-destructive/20 text-destructive",
    icon: AlertTriangle,
  },
};

const statusConfig: Record<
  MaintenanceStatus,
  { label: string; color: string; icon: React.ComponentType<any> }
> = {
  Open: { label: "Open", color: "bg-blue-500/20 text-blue-500", icon: Clock },
  InProgress: {
    label: "In Progress",
    color: "bg-warning/20 text-warning",
    icon: Wrench,
  },
  OnHold: {
    label: "On Hold",
    color: "bg-yellow-500/20 text-yellow-500",
    icon: Clock,
  },
  Resolved: {
    label: "Resolved",
    color: "bg-success/20 text-success",
    icon: CheckCircle2,
  },
  Closed: {
    label: "Closed",
    color: "bg-muted text-muted-foreground",
    icon: XCircle,
  },
  Cancelled: {
    label: "Cancelled",
    color: "bg-gray-500/20 text-gray-500",
    icon: XCircle,
  },
};

const maintenanceCategories = [
  "Plumbing",
  "Electrical",
  "HVAC",
  "Appliance",
  "Structural",
  "Pest Control",
  "Security",
  "Landscaping",
  "Other",
];

const messageTypeConfig: Record<
  string,
  { label: string; icon: React.ComponentType<any>; color: string }
> = {
  Direct: {
    label: "Direct Message",
    icon: MessageSquare,
    color: "bg-accent/20 text-accent",
  },
  Maintenance: {
    label: "Maintenance",
    icon: Wrench,
    color: "bg-warning/20 text-warning",
  },
  Announcement: {
    label: "Announcement",
    icon: Megaphone,
    color: "bg-blue-500/20 text-blue-500",
  },
  PaymentReminder: {
    label: "Payment Reminder",
    icon: CreditCard,
    color: "bg-orange-500/20 text-orange-500",
  },
  Issue: {
    label: "Issue Report",
    icon: AlertCircle,
    color: "bg-destructive/20 text-destructive",
  },
};

// Helper to check if user is admin/manager type
const isAdminRole = (role: string) =>
  ["admin", "owner", "manager", "landlord", "agent"].includes(
    role?.toLowerCase()
  );
const isTenantRole = (role: string) => role?.toLowerCase() === "tenant";

export default function Messages() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"messages" | "maintenance">(
    "messages"
  );
  const [selectedConversation, setSelectedConversation] =
    useState<Conversation | null>(null);
  const [messageInput, setMessageInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [conversationFilter, setConversationFilter] = useState<string>("all");
  const [newConversationOpen, setNewConversationOpen] = useState(false);
  const [newMaintenanceOpen, setNewMaintenanceOpen] = useState(false);
  const [broadcastOpen, setBroadcastOpen] = useState(false);
  const [raiseIssueOpen, setRaiseIssueOpen] = useState(false);
  const [maintenanceFilter, setMaintenanceFilter] = useState<
    MaintenanceStatus | "all"
  >("all");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Get current user info
  const [currentUser, setCurrentUser] = useState<any>(null);
  useEffect(() => {
    const raw = localStorage.getItem("user");
    if (raw) setCurrentUser(JSON.parse(raw));
  }, []);

  const userRole = currentUser?.role?.toLowerCase() || "tenant";
  const isAdmin = isAdminRole(userRole);
  const isTenant = isTenantRole(userRole);

  // Fetch conversations
  const {
    data: conversationsData,
    isLoading: isLoadingConversations,
    refetch: refetchConversations,
  } = useQuery({
    queryKey: ["conversations", conversationFilter],
    queryFn: () =>
      getConversations({
        type: conversationFilter === "all" ? undefined : conversationFilter,
      }),
    staleTime: 30000,
  });

  const conversations = conversationsData?.data || [];
  const totalUnread = conversations.reduce(
    (sum, c) => sum + (c.unreadCount || 0),
    0
  );

  // Fetch messages for selected conversation
  const { data: messagesData, isLoading: isLoadingMessages } = useQuery({
    queryKey: ["messages", selectedConversation?.id],
    queryFn: () =>
      selectedConversation ? getMessages(selectedConversation.id) : null,
    enabled: !!selectedConversation?.id,
    staleTime: 10000,
  });

  const messages = messagesData?.data || [];

  // Fetch maintenance requests
  const { data: maintenanceData, isLoading: isLoadingMaintenance } = useQuery({
    queryKey: ["maintenance-requests", maintenanceFilter],
    queryFn: () =>
      getMaintenanceRequests({
        status: maintenanceFilter === "all" ? undefined : maintenanceFilter,
      }),
    staleTime: 30000,
  });

  const maintenanceRequests = maintenanceData?.data || [];
  const openMaintenanceCount = maintenanceRequests.filter(
    (m) => m.status === "Open"
  ).length;

  // Fetch units for selection dialogs
  const { data: unitsData } = useQuery({
    queryKey: ["units-for-messages"],
    queryFn: () => getUnits(),
    staleTime: 60000,
  });
  const units = unitsData || [];

  // Fetch estates for broadcast
  const { data: estatesData } = useQuery({
    queryKey: ["estates-for-messages"],
    queryFn: () => getEstates(),
    staleTime: 60000,
    enabled: isAdmin,
  });
  const estates = estatesData || [];

  // Fetch message types based on user role
  const { data: messageTypesData } = useQuery({
    queryKey: ["message-types", userRole],
    queryFn: () => getMessageTypes(userRole),
    staleTime: 60000,
  });
  const messageTypes = messageTypesData || [];

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: ({
      conversationId,
      content,
    }: {
      conversationId: string;
      content: string;
    }) => sendMessage(conversationId, content),
    onSuccess: () => {
      setMessageInput("");
      queryClient.invalidateQueries({
        queryKey: ["messages", selectedConversation?.id],
      });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
    onError: () => toast.error("Failed to send message"),
  });

  const handleSendMessage = async () => {
    if (!messageInput.trim() || !selectedConversation) return;
    sendMessageMutation.mutate({
      conversationId: selectedConversation.id,
      content: messageInput,
    });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const filteredConversations = conversations.filter(
    (c) =>
      c.subject?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c as any).participantName
        ?.toLowerCase()
        .includes(searchQuery.toLowerCase())
  );

  const filteredMaintenance = maintenanceRequests.filter(
    (m) => maintenanceFilter === "all" || m.status === maintenanceFilter
  );

  const formatTimestamp = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24)
    );
    if (diffDays === 0)
      return date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return date.toLocaleDateString([], { weekday: "short" });
    return date.toLocaleDateString([], { month: "short", day: "numeric" });
  };

  const getInitials = (name: string) =>
    name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "??";

  const getTypeConfig = (type: string) =>
    messageTypeConfig[type] || messageTypeConfig.Direct;

  // ========================================
  // Render Functions
  // ========================================

  const renderConversationList = () => (
    <div className="h-full flex flex-col">
      {/* Search and Filter */}
      <div className="p-4 border-b border-border space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select
          value={conversationFilter}
          onValueChange={setConversationFilter}
        >
          <SelectTrigger className="w-full">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Messages</SelectItem>
            <SelectItem value="Direct">Direct Messages</SelectItem>
            <SelectItem value="Announcement">Announcements</SelectItem>
            <SelectItem value="Maintenance">Maintenance</SelectItem>
            <SelectItem value="PaymentReminder">Payment Reminders</SelectItem>
            {isTenant && <SelectItem value="Issue">My Issues</SelectItem>}
          </SelectContent>
        </Select>
      </div>

      {/* Conversation list */}
      <ScrollArea className="flex-1">
        {isLoadingConversations ? (
          <div className="p-4 space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex gap-3">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No conversations yet</p>
            <p className="text-sm mt-2">
              {isAdmin
                ? "Send a message or broadcast to get started"
                : "Send a message to get started"}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filteredConversations.map((conversation) => {
              const typeConfig = getTypeConfig(conversation.type);
              const TypeIcon = typeConfig.icon;
              return (
                <div
                  key={conversation.id}
                  className={`p-4 cursor-pointer hover:bg-muted/50 transition-colors ${
                    selectedConversation?.id === conversation.id
                      ? "bg-muted"
                      : ""
                  } ${conversation.unreadCount > 0 ? "bg-accent/5" : ""}`}
                  onClick={() => setSelectedConversation(conversation)}
                >
                  <div className="flex gap-3">
                    <Avatar className="h-12 w-12">
                      <AvatarFallback className={typeConfig.color}>
                        <TypeIcon className="h-5 w-5" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-medium truncate">
                          {conversation.subject}
                        </p>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {conversation.lastMessage?.createdAt &&
                            formatTimestamp(conversation.lastMessage.createdAt)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Badge variant="outline" className="text-xs py-0 h-5">
                          {typeConfig.label}
                        </Badge>
                        {conversation.unitName && (
                          <span className="text-xs text-muted-foreground">
                            {conversation.unitName}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground truncate mt-1">
                        {conversation.lastMessage?.content || "No messages yet"}
                      </p>
                    </div>
                    {conversation.unreadCount > 0 && (
                      <Badge
                        variant="default"
                        className="h-5 min-w-5 justify-center bg-accent"
                      >
                        {conversation.unreadCount}
                      </Badge>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </ScrollArea>

      {/* Action buttons based on role */}
      <div className="p-4 border-t border-border space-y-2">
        {isAdmin ? (
          <>
            <Button
              className="w-full"
              variant="accent"
              onClick={() => setBroadcastOpen(true)}
            >
              <Megaphone className="h-4 w-4 mr-2" />
              Broadcast Message
            </Button>
            <Button
              className="w-full"
              variant="outline"
              onClick={() => setNewConversationOpen(true)}
            >
              <MessageSquare className="h-4 w-4 mr-2" />
              Direct Message
            </Button>
          </>
        ) : (
          <>
            <Button
              className="w-full"
              variant="accent"
              onClick={() => setRaiseIssueOpen(true)}
            >
              <AlertCircle className="h-4 w-4 mr-2" />
              Report Issue
            </Button>
            <Button
              className="w-full"
              variant="outline"
              onClick={() => setNewConversationOpen(true)}
            >
              <MessageSquare className="h-4 w-4 mr-2" />
              Send Message
            </Button>
          </>
        )}
      </div>
    </div>
  );

  const renderMessageThread = () => {
    if (!selectedConversation) {
      return (
        <div className="h-full flex items-center justify-center text-muted-foreground">
          <div className="text-center">
            <MessageSquare className="h-16 w-16 mx-auto mb-4 opacity-50" />
            <h3 className="font-medium text-lg mb-2">Select a conversation</h3>
            <p className="text-sm">
              Choose a conversation from the list to view messages
            </p>
          </div>
        </div>
      );
    }

    const typeConfig = getTypeConfig(selectedConversation.type);
    const TypeIcon = typeConfig.icon;

    return (
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setSelectedConversation(null)}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <Avatar className="h-10 w-10">
              <AvatarFallback className={typeConfig.color}>
                <TypeIcon className="h-4 w-4" />
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium">{selectedConversation.subject}</p>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Badge variant="outline" className="text-xs">
                  {typeConfig.label}
                </Badge>
                {selectedConversation.unitName && (
                  <span>• {selectedConversation.unitName}</span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => refetchConversations()}
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Messages */}
        <ScrollArea className="flex-1 p-4">
          {isLoadingMessages ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className={`flex gap-3 ${i % 2 === 0 ? "justify-end" : ""}`}
                >
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <Skeleton className="h-20 w-64 rounded-xl" />
                </div>
              ))}
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              <p>No messages yet. Start the conversation!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((message: Message, index: number) => {
                const isOwnMessage = message.senderId === currentUser?.id;
                return (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.02 }}
                    className={`flex gap-3 ${
                      isOwnMessage ? "flex-row-reverse" : ""
                    }`}
                  >
                    <Avatar className="h-8 w-8 shrink-0">
                      <AvatarFallback
                        className={
                          isOwnMessage ? "bg-accent/20 text-accent" : "bg-muted"
                        }
                      >
                        {getInitials(message.senderName || "User")}
                      </AvatarFallback>
                    </Avatar>
                    <div
                      className={`max-w-[70%] ${
                        isOwnMessage ? "items-end" : "items-start"
                      }`}
                    >
                      {!isOwnMessage && (
                        <p className="text-xs text-muted-foreground mb-1 px-1">
                          {message.senderName}{" "}
                          {message.senderRole && `• ${message.senderRole}`}
                        </p>
                      )}
                      <div
                        className={`rounded-2xl px-4 py-2 ${
                          isOwnMessage
                            ? "bg-accent text-accent-foreground rounded-br-md"
                            : "bg-muted rounded-bl-md"
                        }`}
                      >
                        <p className="text-sm whitespace-pre-wrap">
                          {message.content}
                        </p>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 px-1">
                        {formatTimestamp(message.createdAt)}
                      </p>
                    </div>
                  </motion.div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
          )}
        </ScrollArea>

        {/* Input */}
        <div className="p-4 border-t border-border">
          <div className="flex gap-2">
            <Button variant="ghost" size="icon" className="shrink-0">
              <Paperclip className="h-4 w-4" />
            </Button>
            <Input
              placeholder="Type a message..."
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              onKeyPress={handleKeyPress}
              className="flex-1"
            />
            <Button
              variant="accent"
              size="icon"
              onClick={handleSendMessage}
              disabled={!messageInput.trim() || sendMessageMutation.isPending}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    );
  };

  const renderMaintenanceList = () => (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Select
            value={maintenanceFilter}
            onValueChange={(v) =>
              setMaintenanceFilter(v as MaintenanceStatus | "all")
            }
          >
            <SelectTrigger className="w-40">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Filter" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Requests</SelectItem>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button variant="accent" onClick={() => setNewMaintenanceOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          {isTenant ? "Report Issue" : "New Request"}
        </Button>
      </div>

      {/* Request list */}
      {isLoadingMaintenance ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <Skeleton className="h-6 w-1/3" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-2/3" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredMaintenance.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Wrench className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="font-medium text-lg mb-2">
              No maintenance requests
            </h3>
            <p className="text-muted-foreground">
              {isTenant
                ? "Report an issue if something needs attention"
                : "All caught up! No maintenance issues to address."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredMaintenance.map((request, index) => {
            const priority =
              priorityConfig[request.priority] || priorityConfig.Medium;
            const status = statusConfig[request.status] || statusConfig.Open;
            const PriorityIcon = priority.icon;
            const StatusIcon = status.icon;

            return (
              <motion.div
                key={request.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardContent className="p-6">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-lg">
                            {request.title}
                          </h3>
                          <Badge className={priority.color}>
                            <PriorityIcon className="h-3 w-3 mr-1" />
                            {priority.label}
                          </Badge>
                        </div>
                        <p className="text-muted-foreground">
                          {request.description}
                        </p>
                        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                          {request.tenantName && (
                            <span className="flex items-center gap-1">
                              <User className="h-4 w-4" />
                              {request.tenantName}
                            </span>
                          )}
                          {request.unitName && (
                            <span className="flex items-center gap-1">
                              <Building2 className="h-4 w-4" />
                              {request.unitName}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Wrench className="h-4 w-4" />
                            {request.category}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            {formatTimestamp(request.createdAt)}
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <Badge className={status.color}>
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {status.label}
                        </Badge>
                        {request.assignedTo && (
                          <span className="text-sm text-muted-foreground">
                            Assigned: {request.assignedTo}
                          </span>
                        )}
                        {isAdmin && (
                          <Select
                            value={request.status}
                            onValueChange={(v) => {
                              toast.success(
                                `Status updated to ${
                                  statusConfig[v as MaintenanceStatus].label
                                }`
                              );
                            }}
                          >
                            <SelectTrigger className="w-32 h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="open">Open</SelectItem>
                              <SelectItem value="in_progress">
                                In Progress
                              </SelectItem>
                              <SelectItem value="resolved">Resolved</SelectItem>
                              <SelectItem value="closed">Closed</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold">
              {isTenant ? "Messages & Support" : "Communications"}
            </h1>
            <p className="text-muted-foreground">
              {isTenant
                ? "Contact property management and report issues"
                : "Communicate with tenants and manage maintenance requests"}
            </p>
          </div>
          {totalUnread > 0 && (
            <Badge
              variant="default"
              className="bg-accent text-accent-foreground"
            >
              {totalUnread} unread message{totalUnread !== 1 ? "s" : ""}
            </Badge>
          )}
        </div>

        {/* Tabs */}
        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as "messages" | "maintenance")}
          className="space-y-4"
        >
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="messages" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              {isTenant ? "Messages" : "Conversations"}
              {totalUnread > 0 && (
                <Badge
                  variant="default"
                  className="h-5 min-w-5 justify-center bg-accent"
                >
                  {totalUnread}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger
              value="maintenance"
              className="flex items-center gap-2"
            >
              <Wrench className="h-4 w-4" />
              {isTenant ? "My Issues" : "Maintenance"}
              {openMaintenanceCount > 0 && (
                <Badge
                  variant="default"
                  className="h-5 min-w-5 justify-center bg-warning text-warning-foreground"
                >
                  {openMaintenanceCount}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="messages" className="space-y-0">
            <Card className="overflow-hidden">
              <div className="grid lg:grid-cols-[350px_1fr] h-[calc(100vh-280px)] min-h-[500px]">
                {/* Conversation list */}
                <div className="border-r border-border hidden lg:block">
                  {renderConversationList()}
                </div>
                {/* Mobile conversation list or message thread */}
                <div className="lg:hidden h-full">
                  {selectedConversation
                    ? renderMessageThread()
                    : renderConversationList()}
                </div>
                {/* Message thread (desktop) */}
                <div className="hidden lg:block">{renderMessageThread()}</div>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="maintenance">
            {renderMaintenanceList()}
          </TabsContent>
        </Tabs>
      </div>

      {/* ========================================
          DIALOGS
          ======================================== */}

      {/* Broadcast Dialog - Admin Only */}
      <Dialog open={broadcastOpen} onOpenChange={setBroadcastOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Megaphone className="h-5 w-5 text-accent" />
              Broadcast Message
            </DialogTitle>
            <DialogDescription>
              Send an announcement to all tenants in an estate or specific units
            </DialogDescription>
          </DialogHeader>
          <BroadcastForm
            estates={estates}
            units={units}
            onSuccess={() => {
              setBroadcastOpen(false);
              queryClient.invalidateQueries({ queryKey: ["conversations"] });
            }}
            onCancel={() => setBroadcastOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* New Conversation Dialog */}
      <Dialog open={newConversationOpen} onOpenChange={setNewConversationOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {isAdmin ? "Send Direct Message" : "Contact Property Management"}
            </DialogTitle>
            <DialogDescription>
              {isAdmin
                ? "Send a message to a specific tenant"
                : "Send a message to your property manager"}
            </DialogDescription>
          </DialogHeader>
          <NewConversationForm
            isAdmin={isAdmin}
            units={units}
            messageTypes={messageTypes}
            onSuccess={() => {
              setNewConversationOpen(false);
              queryClient.invalidateQueries({ queryKey: ["conversations"] });
            }}
            onCancel={() => setNewConversationOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Raise Issue Dialog - Tenant */}
      <Dialog open={raiseIssueOpen} onOpenChange={setRaiseIssueOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              Report an Issue
            </DialogTitle>
            <DialogDescription>
              Report a problem with your unit or the estate
            </DialogDescription>
          </DialogHeader>
          <IssueForm
            categories={maintenanceCategories}
            onSuccess={() => {
              setRaiseIssueOpen(false);
              queryClient.invalidateQueries({ queryKey: ["conversations"] });
              queryClient.invalidateQueries({
                queryKey: ["maintenance-requests"],
              });
            }}
            onCancel={() => setRaiseIssueOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* New Maintenance Request Dialog */}
      <Dialog open={newMaintenanceOpen} onOpenChange={setNewMaintenanceOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {isTenant
                ? "Report Maintenance Issue"
                : "Create Maintenance Request"}
            </DialogTitle>
            <DialogDescription>
              {isTenant
                ? "Report a problem that needs fixing"
                : "Log a new maintenance issue for a property"}
            </DialogDescription>
          </DialogHeader>
          <MaintenanceForm
            units={units}
            categories={maintenanceCategories}
            isTenant={isTenant}
            onSuccess={() => {
              setNewMaintenanceOpen(false);
              queryClient.invalidateQueries({
                queryKey: ["maintenance-requests"],
              });
            }}
            onCancel={() => setNewMaintenanceOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}

// ========================================
// Sub-Components for Forms
// ========================================

function BroadcastForm({
  estates,
  units,
  onSuccess,
  onCancel,
}: {
  estates: any[];
  units: any[];
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const [broadcastType, setBroadcastType] = useState<"estate" | "units">(
    "estate"
  );
  const [selectedEstate, setSelectedEstate] = useState("");
  const [selectedUnits, setSelectedUnits] = useState<string[]>([]);
  const [messageType, setMessageType] = useState("Announcement");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!subject || !message) {
      toast.error("Please fill in all fields");
      return;
    }

    if (broadcastType === "estate" && !selectedEstate) {
      toast.error("Please select an estate");
      return;
    }

    if (broadcastType === "units" && selectedUnits.length === 0) {
      toast.error("Please select at least one unit");
      return;
    }

    setIsSubmitting(true);
    try {
      // For multiple units, create separate conversations for each
      if (broadcastType === "units" && selectedUnits.length > 1) {
        // Create a conversation for each selected unit
        for (const unitId of selectedUnits) {
          await createConversation({
            type: messageType,
            subject,
            participantUserIds: [],
            unitId,
            initialMessage: message,
          });
        }
      } else {
        // Single estate or single unit
        await createConversation({
          type: messageType,
          subject,
          participantUserIds: [],
          estateId: broadcastType === "estate" ? selectedEstate : undefined,
          unitId: broadcastType === "units" ? selectedUnits[0] : undefined,
          initialMessage: message,
        });
      }
      toast.success("Broadcast sent successfully");
      onSuccess();
    } catch (err) {
      toast.error("Failed to send broadcast");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Broadcast To</Label>
        <Select
          value={broadcastType}
          onValueChange={(v) => setBroadcastType(v as "estate" | "units")}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="estate">Entire Estate</SelectItem>
            <SelectItem value="units">Specific Units</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {broadcastType === "estate" ? (
        <div className="space-y-2">
          <Label>Select Estate</Label>
          <Select value={selectedEstate} onValueChange={setSelectedEstate}>
            <SelectTrigger>
              <SelectValue placeholder="Choose an estate..." />
            </SelectTrigger>
            <SelectContent>
              {estates.map((estate: any) => (
                <SelectItem key={estate.id} value={estate.id}>
                  {estate.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : (
        <div className="space-y-2">
          <Label>Select Units</Label>
          <ScrollArea className="h-40 border rounded-md p-3">
            <div className="space-y-2">
              {units.map((unit: any) => (
                <div key={unit.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={unit.id}
                    checked={selectedUnits.includes(unit.id)}
                    onCheckedChange={(checked) => {
                      setSelectedUnits((prev) =>
                        checked
                          ? [...prev, unit.id]
                          : prev.filter((id) => id !== unit.id)
                      );
                    }}
                  />
                  <label htmlFor={unit.id} className="text-sm cursor-pointer">
                    {unit.name} {unit.estateName && `- ${unit.estateName}`}
                  </label>
                </div>
              ))}
            </div>
          </ScrollArea>
          {selectedUnits.length > 0 && (
            <p className="text-xs text-muted-foreground">
              {selectedUnits.length} unit(s) selected
            </p>
          )}
        </div>
      )}

      <div className="space-y-2">
        <Label>Message Type</Label>
        <Select value={messageType} onValueChange={setMessageType}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Announcement">General Announcement</SelectItem>
            <SelectItem value="Maintenance">Planned Maintenance</SelectItem>
            <SelectItem value="PaymentReminder">Payment Reminder</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Subject</Label>
        <Input
          placeholder="e.g., Water Maintenance Scheduled"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label>Message</Label>
        <Textarea
          placeholder="Write your announcement message..."
          rows={4}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button variant="accent" onClick={handleSubmit} disabled={isSubmitting}>
          {isSubmitting ? "Sending..." : "Send Broadcast"}
        </Button>
      </DialogFooter>
    </div>
  );
}

function NewConversationForm({
  isAdmin,
  units,
  messageTypes,
  onSuccess,
  onCancel,
}: {
  isAdmin: boolean;
  units: any[];
  messageTypes: MessageType[];
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const [selectedUnit, setSelectedUnit] = useState("");
  const [messageType, setMessageType] = useState("Direct");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filter out System types from user selection
  const availableTypes = messageTypes.filter(
    (mt) => !mt.isSystemType && mt.code !== "System"
  );

  const handleSubmit = async () => {
    if (!subject || !message) {
      toast.error("Please fill in all fields");
      return;
    }

    setIsSubmitting(true);
    try {
      await createConversation({
        type: messageType,
        subject,
        participantUserIds: [],
        unitId:
          selectedUnit && selectedUnit !== "__general__"
            ? selectedUnit
            : undefined,
        initialMessage: message,
      });
      toast.success("Message sent");
      onSuccess();
    } catch (err) {
      toast.error("Failed to send message");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Message Type</Label>
        <Select value={messageType} onValueChange={setMessageType}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {availableTypes.length > 0 ? (
              availableTypes.map((mt) => (
                <SelectItem key={mt.code} value={mt.code}>
                  {mt.name}
                </SelectItem>
              ))
            ) : (
              // Fallback if API call hasn't returned yet
              <>
                <SelectItem value="Direct">Direct Message</SelectItem>
                {isAdmin ? (
                  <>
                    <SelectItem value="Announcement">Announcement</SelectItem>
                    <SelectItem value="PaymentReminder">
                      Payment Reminder
                    </SelectItem>
                    <SelectItem value="Maintenance">
                      Maintenance Notice
                    </SelectItem>
                  </>
                ) : (
                  <>
                    <SelectItem value="Issue">Report Issue</SelectItem>
                    <SelectItem value="Maintenance">
                      Maintenance Request
                    </SelectItem>
                  </>
                )}
              </>
            )}
          </SelectContent>
        </Select>
      </div>

      {isAdmin && (
        <div className="space-y-2">
          <Label>Regarding Unit (Optional)</Label>
          <Select value={selectedUnit} onValueChange={setSelectedUnit}>
            <SelectTrigger>
              <SelectValue placeholder="Select a unit..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__general__">General Inquiry</SelectItem>
              {units
                .filter((unit: any) => unit.id)
                .map((unit: any) => (
                  <SelectItem key={unit.id} value={unit.id}>
                    {unit.name}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="space-y-2">
        <Label>Subject</Label>
        <Input
          placeholder="What is this about?"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label>Message</Label>
        <Textarea
          placeholder="Type your message..."
          rows={4}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button variant="accent" onClick={handleSubmit} disabled={isSubmitting}>
          {isSubmitting ? "Sending..." : "Send Message"}
        </Button>
      </DialogFooter>
    </div>
  );
}

function IssueForm({
  categories,
  onSuccess,
  onCancel,
}: {
  categories: string[];
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const [issueType, setIssueType] = useState<"unit" | "estate">("unit");
  const [category, setCategory] = useState("");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("medium");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!category || !subject || !description) {
      toast.error("Please fill in all required fields");
      return;
    }

    setIsSubmitting(true);
    try {
      await createConversation({
        type: "Issue",
        subject: `[${category}] ${subject}`,
        participantUserIds: [],
        initialMessage: `Priority: ${priority.toUpperCase()}\nScope: ${
          issueType === "unit" ? "Unit" : "Estate"
        }\n\n${description}`,
      });
      toast.success("Issue reported successfully");
      onSuccess();
    } catch (err) {
      toast.error("Failed to report issue");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Issue Location</Label>
        <Select
          value={issueType}
          onValueChange={(v) => setIssueType(v as "unit" | "estate")}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="unit">My Unit</SelectItem>
            <SelectItem value="estate">Common Area / Estate</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Category</Label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger>
              <SelectValue placeholder="Select..." />
            </SelectTrigger>
            <SelectContent>
              {categories.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Priority</Label>
          <Select value={priority} onValueChange={setPriority}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="urgent">Urgent</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Subject</Label>
        <Input
          placeholder="Brief description of the issue"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label>Description</Label>
        <Textarea
          placeholder="Please provide detailed information about the issue..."
          rows={4}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button variant="accent" onClick={handleSubmit} disabled={isSubmitting}>
          {isSubmitting ? "Submitting..." : "Report Issue"}
        </Button>
      </DialogFooter>
    </div>
  );
}

function MaintenanceForm({
  units,
  categories,
  isTenant,
  onSuccess,
  onCancel,
}: {
  units: any[];
  categories: string[];
  isTenant: boolean;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const [unitId, setUnitId] = useState("");
  const [category, setCategory] = useState("");
  const [priority, setPriority] = useState("medium");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!category || !title || !description) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (!isTenant && !unitId) {
      toast.error("Please select a unit");
      return;
    }

    setIsSubmitting(true);
    try {
      await createMaintenanceRequest({
        unitId: unitId || undefined,
        category,
        title,
        description,
        priority,
      });
      toast.success("Maintenance request created");
      onSuccess();
    } catch (err) {
      toast.error("Failed to create request");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      {!isTenant && (
        <div className="space-y-2">
          <Label>Unit</Label>
          <Select value={unitId} onValueChange={setUnitId}>
            <SelectTrigger>
              <SelectValue placeholder="Select unit..." />
            </SelectTrigger>
            <SelectContent>
              {units.map((unit: any) => (
                <SelectItem key={unit.id} value={unit.id}>
                  {unit.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Category</Label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger>
              <SelectValue placeholder="Select..." />
            </SelectTrigger>
            <SelectContent>
              {categories.map((cat) => (
                <SelectItem key={cat} value={cat.toLowerCase()}>
                  {cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Priority</Label>
          <Select value={priority} onValueChange={setPriority}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="urgent">Urgent</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Title</Label>
        <Input
          placeholder="Brief description of the issue..."
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label>Description</Label>
        <Textarea
          placeholder="Provide detailed information about the issue..."
          rows={4}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label>Attachments (Optional)</Label>
        <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
          <Image className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Drag and drop images, or click to browse
          </p>
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button variant="accent" onClick={handleSubmit} disabled={isSubmitting}>
          {isSubmitting ? "Creating..." : "Create Request"}
        </Button>
      </DialogFooter>
    </div>
  );
}
