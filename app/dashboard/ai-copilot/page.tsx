"use client";

import { useEffect, useState, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  Sparkles,
  Send,
  RefreshCw,
  Copy,
  Check,
  Stethoscope,
  Scale,
  Target,
  Shield,
  Bot,
  User,
  Zap,
  ArrowRight,
  Info,
  CornerDownLeft,
  ChevronDown,
  Search,
  Briefcase,
  TrendingUp,
  Wallet,
  AlertCircle,
  CheckCircle2,
  Users,
  ShieldCheck,
  Building,
} from "lucide-react";
import { useFirmBranding } from "@/lib/context/FirmBrandingContext";
import { useFeatureAccess } from "@/lib/useFeatureAccess";

type AgentType = "DIAGNOSTICS" | "REBALANCING" | "RETIREMENT" | "RISK_PLANNING";

interface AgentConfig {
  type: AgentType;
  name: string;
  shortName: string;
  title: string;
  icon: any;
  color: string;
  badgeBg: string;
  welcomeMessage: (name: string, aum: number, sip: number) => string;
  getSuggestedPrompts: (name: string, aumLakhs: string, sipText: string, debtLakhs: string) => string[];
}

const AGENTS: Record<AgentType, AgentConfig> = {
  DIAGNOSTICS: {
    type: "DIAGNOSTICS",
    name: "Portfolio Diagnostics Agent",
    shortName: "Diagnostics",
    title: "Scheme Health, Overlap & Concentration Auditor",
    icon: Stethoscope,
    color: "text-emerald-500",
    badgeBg: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    welcomeMessage: (name, aum, sip) =>
      `Hello ${name}! I am your Portfolio Diagnostics AI Agent. I have loaded your live portfolio of ₹${(aum / 100000).toFixed(1)} Lakhs and ₹${sip.toLocaleString("en-IN")}/mo SIP book. I evaluate scheme alpha, detect stock overlap across your mutual funds, and monitor category concentration risks.`,
    getSuggestedPrompts: (name, aumLakhs, sipText, debtLakhs) => [
      `Check stock overlap in my ₹${aumLakhs}L mutual fund portfolio`,
      `Are my small-cap holdings at risk of overexposure?`,
      `Audit expense ratio (TER) drag & Regular vs Direct alpha`,
      `Which schemes are underperforming their benchmark over 3 years?`,
    ],
  },
  REBALANCING: {
    type: "REBALANCING",
    name: "Rebalancing & Tax-Alpha Agent",
    shortName: "Rebalancing & Tax",
    title: "Asset Allocation Drift & Sec 112A Harvesting",
    icon: Scale,
    color: "text-amber-500",
    badgeBg: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
    welcomeMessage: (name, aum, sip) =>
      `Welcome ${name}! I am your Rebalancing & Tax-Alpha Agent. With your current ₹${(aum / 100000).toFixed(1)} Lakhs portfolio, I can calculate asset allocation drift, design Systematic Transfer Plans (STP), and harvest up to ₹1.25 Lakhs of tax-free LTCG under Section 112A.`,
    getSuggestedPrompts: (name, aumLakhs, sipText, debtLakhs) => [
      `How can I harvest ₹1.25 Lakhs LTCG tax-free under Section 112A?`,
      `Rebalance my ₹${aumLakhs}L portfolio against 65:25:10 target`,
      `Recommend systematic switch/STP shifts to minimize STCG tax`,
      `Calculate FIFO exit loads for rebalancing my top holdings`,
    ],
  },
  RETIREMENT: {
    type: "RETIREMENT",
    name: "Smart Retirement Planning Agent",
    shortName: "Retirement",
    title: "Corpus Gap & 3-Bucket SWP Decumulation Specialist",
    icon: Target,
    color: "text-purple-500",
    badgeBg: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
    welcomeMessage: (name, aum, sip) =>
      `Greetings ${name}! I am your Smart Retirement Planning Agent. Using your ₹${(aum / 100000).toFixed(1)} Lakhs current wealth base and ₹${sip.toLocaleString("en-IN")}/mo SIP, I can forecast your inflation-adjusted retirement corpus and structure a resilient 3-Bucket Solution for lifelong SWP pension cashflows.`,
    getSuggestedPrompts: (name, aumLakhs, sipText, debtLakhs) => [
      `What is my target retirement corpus with ₹${sipText}/mo SIP?`,
      `Explain the 3-Bucket Solution for my post-retirement SWP`,
      `How much monthly pension can I safely withdraw at 4.5% SWR?`,
      `How should I integrate my EPF and NPS corpus into my retirement plan?`,
    ],
  },
  RISK_PLANNING: {
    type: "RISK_PLANNING",
    name: "Risk & Insurance Planning Agent",
    shortName: "Risk & Insurance",
    title: "HLV Term Life Sizing & Health Floater Arbitrage",
    icon: Shield,
    color: "text-blue-500",
    badgeBg: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
    welcomeMessage: (name, aum, sip) =>
      `Hello ${name}! I am your Risk & Insurance Planning Agent. I calculate your pure term insurance need using Human Life Value (HLV) covering your family and liabilities, and structure a Base + Super Top-up health setup to save ~65% on annual premiums.`,
    getSuggestedPrompts: (name, aumLakhs, sipText, debtLakhs) => [
      `How much pure term insurance do I need for ₹${debtLakhs}L debt?`,
      `How does a ₹10L Base + ₹90L Super Top-up save 65% in premium?`,
      `Why is the Married Women's Property (MWP) Act mandatory for term cover?`,
      `Should I buy a separate health insurance policy for my senior parents?`,
    ],
  },
};

interface MessageItem {
  id: string;
  sender: "user" | "agent";
  text: string;
  timestamp: string;
  isAi?: boolean;
}

interface ClientContext {
  clientId: string;
  clientName: string;
  clientCode: string;
  clientEmail: string;
  age: number;
  totalAum: number;
  monthlySip: number;
  liabilities: number;
  netWorth: number;
  riskProfile: string;
  holdingsCount: number;
  topHoldings: Array<{ scheme: string; value: number; sip: number; category?: string }>;
  assetAllocation: {
    equityPct: number;
    debtPct: number;
    goldPct: number;
    liquidPct: number;
  };
  householdId?: string | null;
  householdName?: string | null;
  householdMembersCount: number;
}

interface ClientSummary {
  clientId: string;
  clientName: string;
  clientCode: string;
  clientEmail: string;
  riskProfile: string;
  totalAum: number;
  monthlySip: number;
}

/**
 * Lightweight formatted markdown renderer
 */
function MarkdownRenderer({ content, isAgent }: { content: string; isAgent: boolean }) {
  const lines = content.split("\n");

  return (
    <div className="space-y-1.5 leading-relaxed text-xs">
      {lines.map((line, idx) => {
        const trimmed = line.trim();

        if (trimmed.startsWith("### ")) {
          return (
            <h3 key={idx} className="text-sm font-black text-slate-900 dark:text-white mt-2 mb-1 flex items-center gap-1.5">
              <span>{trimmed.replace("### ", "")}</span>
            </h3>
          );
        }

        if (trimmed.startsWith("#### ")) {
          return (
            <h4 key={idx} className="text-xs font-bold text-slate-800 dark:text-slate-100 mt-2 mb-0.5">
              {trimmed.replace("#### ", "")}
            </h4>
          );
        }

        if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
          const text = trimmed.substring(2);
          return (
            <div key={idx} className="flex items-start gap-1.5 pl-1 my-0.5">
              <span className="text-blue-500 font-bold shrink-0">•</span>
              <span className="text-slate-700 dark:text-slate-200">
                {renderInlineBold(text)}
              </span>
            </div>
          );
        }

        if (/^\d+\.\s/.test(trimmed)) {
          const match = trimmed.match(/^(\d+)\.\s(.*)$/);
          if (match) {
            return (
              <div key={idx} className="flex items-start gap-1.5 pl-1 my-0.5">
                <span className="text-blue-500 font-bold shrink-0">{match[1]}.</span>
                <span className="text-slate-700 dark:text-slate-200">
                  {renderInlineBold(match[2])}
                </span>
              </div>
            );
          }
        }

        if (trimmed.startsWith("*") && trimmed.endsWith("*") && !trimmed.startsWith("**")) {
          return (
            <p key={idx} className="italic text-slate-500 dark:text-slate-400 my-1 text-[11px]">
              {trimmed.replace(/^\*|\*$/g, "")}
            </p>
          );
        }

        if (!trimmed) {
          return <div key={idx} className="h-1" />;
        }

        return (
          <p key={idx} className={isAgent ? "text-slate-700 dark:text-slate-200" : "text-white"}>
            {renderInlineBold(line)}
          </p>
        );
      })}
    </div>
  );
}

function renderInlineBold(text: string) {
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={i} className="font-bold text-slate-900 dark:text-white">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return part;
  });
}

function AiCopilotContent() {
  const searchParams = useSearchParams();
  const initialAgentParam = (searchParams.get("agent") || "DIAGNOSTICS").toUpperCase() as AgentType;
  const initialClientId = searchParams.get("clientId") || "";

  const [activeAgent, setActiveAgent] = useState<AgentType>(
    AGENTS[initialAgentParam] ? initialAgentParam : "DIAGNOSTICS"
  );

  const [clientContext, setClientContext] = useState<ClientContext | null>(null);
  const [clientList, setClientList] = useState<ClientSummary[]>([]);
  const [isAdvisor, setIsAdvisor] = useState(false);
  const [isLoadingContext, setIsLoadingContext] = useState(true);

  // Advisor Client Picker State
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [clientSearchQuery, setClientSearchQuery] = useState("");

  const [messages, setMessages] = useState<Record<AgentType, MessageItem[]>>({
    DIAGNOSTICS: [],
    REBALANCING: [],
    RETIREMENT: [],
    RISK_PLANNING: [],
  });

  const [inputValue, setInputValue] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Load Client Context from API
  const loadContext = async (targetId?: string, queryStr?: string) => {
    setIsLoadingContext(true);
    try {
      const token = localStorage.getItem("auth_token");
      if (!token) return;

      const params = new URLSearchParams();
      if (targetId) params.set("clientId", targetId);
      if (queryStr) params.set("search", queryStr);

      const res = await fetch(`/api/ai-chat?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const json = await res.json();
        setIsAdvisor(Boolean(json.isAdvisor));
        if (json.client) {
          setClientContext(json.client);
        }
        if (json.clientList) {
          setClientList(json.clientList);
        }
      }
    } catch (err) {
      console.error("Failed to load client context:", err);
    } finally {
      setIsLoadingContext(false);
    }
  };

  // Initial Context Load
  useEffect(() => {
    loadContext(initialClientId);
  }, [initialClientId]);

  // Click outside to close client dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsPickerOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const getWelcomeMessage = (type: AgentType, ctx: ClientContext | null): MessageItem => {
    const name = ctx?.clientName || "Investor";
    const aum = ctx?.totalAum || 0;
    const sip = ctx?.monthlySip || 0;
    return {
      id: `welcome-${type}-${ctx?.clientId || "init"}`,
      sender: "agent",
      text: AGENTS[type].welcomeMessage(name, aum, sip),
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      isAi: true,
    };
  };

  // Sync welcome messages when clientContext is loaded or activeAgent changes
  useEffect(() => {
    setMessages((prev) => {
      const updated = { ...prev };
      let changed = false;

      (Object.keys(AGENTS) as AgentType[]).forEach((type) => {
        const thread = updated[type] || [];
        // Only set/update if thread is empty OR has only 1 message which is a welcome message
        if (thread.length === 0) {
          updated[type] = [getWelcomeMessage(type, clientContext)];
          changed = true;
        } else if (thread.length === 1 && thread[0].id.startsWith("welcome-")) {
          updated[type] = [getWelcomeMessage(type, clientContext)];
          changed = true;
        }
        // If thread has user messages (length > 1), NEVER wipe it!
      });

      return changed ? updated : prev;
    });
  }, [clientContext]);

  // Update active agent if URL param changes
  useEffect(() => {
    const p = searchParams.get("agent")?.toUpperCase() as AgentType;
    if (p && AGENTS[p]) {
      setActiveAgent(p);
    }
  }, [searchParams]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, activeAgent, isSending]);

  const handleSelectClient = (c: ClientSummary) => {
    setIsPickerOpen(false);
    setClientSearchQuery("");
    // Clear threads so new client starts with fresh welcome messages
    setMessages({
      DIAGNOSTICS: [],
      REBALANCING: [],
      RETIREMENT: [],
      RISK_PLANNING: [],
    });
    loadContext(c.clientId);
  };

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputValue).trim();
    if (!text || isSending) return;

    const currentAgent = activeAgent;
    const userMsg: MessageItem = {
      id: `user-${Date.now()}`,
      sender: "user",
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => ({
      ...prev,
      [currentAgent]: [...(prev[currentAgent] || []), userMsg],
    }));

    if (!textToSend) setInputValue("");
    setIsSending(true);

    try {
      const token = typeof window !== "undefined"
        ? localStorage.getItem("auth_token") || localStorage.getItem("token")
        : null;

      const history = (messages[currentAgent] || []).map((m) => ({
        role: m.sender === "user" ? "user" : "assistant",
        content: m.text,
      }));

      const res = await fetch("/api/ai-chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token || ""}`,
        },
        body: JSON.stringify({
          agentType: currentAgent,
          message: text,
          history,
          clientId: clientContext?.clientId || undefined,
          clientEmail: clientContext?.clientEmail || undefined,
          clientCode: clientContext?.clientCode || undefined,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to generate AI response.");

      const agentMsg: MessageItem = {
        id: `agent-${Date.now()}`,
        sender: "agent",
        text: json.reply || "I have analyzed your portfolio records.",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        isAi: Boolean(json.isAiGenerated),
      };

      setMessages((prev) => ({
        ...prev,
        [currentAgent]: [...(prev[currentAgent] || []), agentMsg],
      }));
    } catch (err: any) {
      const errMsg: MessageItem = {
        id: `err-${Date.now()}`,
        sender: "agent",
        text: `⚠️ **Advisory Agent Notice**: ${err.message || "Please check network connection."}`,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => ({
        ...prev,
        [currentAgent]: [...(prev[currentAgent] || []), errMsg],
      }));
    } finally {
      setIsSending(false);
    }
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const currentAgentConfig = AGENTS[activeAgent];
  const currentMessages = messages[activeAgent] || [];

  const aum = clientContext?.totalAum || 0;
  const aumLakhs = (aum / 100000).toFixed(1);
  const sip = clientContext?.monthlySip || 0;
  const sipText = sip >= 100000 ? `${(sip / 100000).toFixed(2)} L` : `${(sip / 1000).toFixed(0)}k`;
  const liabilities = clientContext?.liabilities || 0;
  const debtLakhs = (liabilities / 100000).toFixed(1);

  const suggestedPrompts = currentAgentConfig.getSuggestedPrompts(
    clientContext?.clientName || "Investor",
    aumLakhs,
    sipText,
    debtLakhs
  );

  const filteredClients = clientList.filter((c) => {
    const q = clientSearchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      c.clientName.toLowerCase().includes(q) ||
      c.clientCode.toLowerCase().includes(q) ||
      c.clientEmail.toLowerCase().includes(q)
    );
  });

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] max-h-[920px] bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
      {/* Top Multi-Agent Switcher Bar */}
      <div className="p-3 sm:p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight">
                AI Advisory Multi-Agent Copilot
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                Gemini 2.5
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Autonomous multi-agent intelligence analyzing live Indian portfolios.
            </p>
          </div>
        </div>

        {/* Agent Switcher Pills */}
        <div className="grid grid-cols-2 sm:flex sm:items-center gap-1.5 p-1 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
          {(Object.keys(AGENTS) as AgentType[]).map((type) => {
            const agent = AGENTS[type];
            const Icon = agent.icon;
            const isActive = activeAgent === type;
            return (
              <button
                key={type}
                onClick={() => setActiveAgent(type)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  isActive
                    ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
                }`}
              >
                <Icon className={`h-3.5 w-3.5 ${isActive ? "" : agent.color}`} />
                <span>{agent.shortName}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Live Client Portfolio Context Bar */}
      <div className="px-4 py-2.5 bg-indigo-50/50 dark:bg-indigo-950/20 border-b border-indigo-100 dark:border-indigo-900/30 flex flex-col md:flex-row md:items-center justify-between gap-2.5 text-xs">
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Active Synced Badge */}
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 font-bold text-[11px]">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>Live Portfolio Synced</span>
          </div>

          {/* Client Details */}
          {isLoadingContext ? (
            <div className="flex items-center gap-2 text-slate-400 animate-pulse">
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              <span>Connecting portfolio database...</span>
            </div>
          ) : clientContext ? (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-extrabold text-slate-900 dark:text-white">
                {clientContext.clientName}
              </span>
              <span className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-[10px] font-mono text-slate-600 dark:text-slate-400">
                {clientContext.clientCode}
              </span>
              {clientContext.clientEmail && (
                <span className="text-[11px] text-slate-500 dark:text-slate-400 hidden lg:inline">
                  ({clientContext.clientEmail})
                </span>
              )}
              <span className="text-slate-300 dark:text-slate-700">|</span>
              <div className="flex items-center gap-1 text-slate-700 dark:text-slate-300">
                <span className="text-slate-400">AUM:</span>
                <strong className="text-emerald-600 dark:text-emerald-400 font-black">
                  ₹{aumLakhs} L
                </strong>
              </div>
              <span className="text-slate-300 dark:text-slate-700">|</span>
              <div className="flex items-center gap-1 text-slate-700 dark:text-slate-300">
                <span className="text-slate-400">SIP:</span>
                <strong className="text-blue-600 dark:text-blue-400 font-black">
                  ₹{sip.toLocaleString("en-IN")}/mo
                </strong>
              </div>
              <span className="text-slate-300 dark:text-slate-700">|</span>
              <span className="text-slate-600 dark:text-slate-400">
                {clientContext.holdingsCount} Schemes
              </span>
              <span className="text-slate-300 dark:text-slate-700">|</span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
                {clientContext.riskProfile}
              </span>
            </div>
          ) : (
            <span className="text-slate-500">No active client selected</span>
          )}
        </div>

        {/* Advisor Client Selector / Search Switcher */}
        {isAdvisor && (
          <div className="relative shrink-0" ref={dropdownRef}>
            <button
              onClick={() => setIsPickerOpen(!isPickerOpen)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400 transition cursor-pointer shadow-2xs"
            >
              <Users className="h-3.5 w-3.5 text-blue-500" />
              <span>Switch Client</span>
              <ChevronDown className="h-3 w-3 text-slate-400" />
            </button>

            {/* Client Picker Dropdown */}
            {isPickerOpen && (
              <div className="absolute right-0 mt-1.5 w-80 sm:w-96 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl z-50 overflow-hidden">
                <div className="p-2.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
                  <div className="relative">
                    <Search className="h-3.5 w-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                    <input
                      type="text"
                      value={clientSearchQuery}
                      onChange={(e) => setClientSearchQuery(e.target.value)}
                      placeholder="Search by name, email (e.g. vibhav@gmail.com), or code..."
                      className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      autoFocus
                    />
                  </div>
                </div>

                <div className="max-h-64 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredClients.length === 0 ? (
                    <div className="p-4 text-center text-xs text-slate-400">
                      No matching clients found
                    </div>
                  ) : (
                    filteredClients.map((c) => {
                      const isSelected = clientContext?.clientId === c.clientId;
                      return (
                        <button
                          key={c.clientId}
                          onClick={() => handleSelectClient(c)}
                          className={`w-full p-2.5 text-left flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/60 transition cursor-pointer ${
                            isSelected ? "bg-blue-50/70 dark:bg-blue-950/30" : ""
                          }`}
                        >
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-xs text-slate-900 dark:text-white">
                                {c.clientName}
                              </span>
                              <span className="px-1 py-0.2 rounded text-[9px] font-mono bg-slate-100 dark:bg-slate-800 text-slate-500">
                                {c.clientCode}
                              </span>
                            </div>
                            {c.clientEmail && (
                              <p className="text-[10px] text-slate-400">{c.clientEmail}</p>
                            )}
                          </div>

                          <div className="text-right shrink-0">
                            <span className="text-xs font-black text-emerald-600 dark:text-emerald-400">
                              ₹{(c.totalAum / 100000).toFixed(1)} L
                            </span>
                            {c.monthlySip > 0 && (
                              <p className="text-[10px] text-slate-400">
                                ₹{c.monthlySip.toLocaleString("en-IN")}/mo
                              </p>
                            )}
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Active Agent Banner */}
      <div className="px-4 py-2 bg-slate-100/70 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <currentAgentConfig.icon className={`h-4 w-4 ${currentAgentConfig.color}`} />
          <strong className="text-slate-800 dark:text-slate-200">{currentAgentConfig.name}</strong>
          <span className="hidden sm:inline text-slate-400 dark:text-slate-500">|</span>
          <span className="hidden sm:inline text-slate-500 dark:text-slate-400">{currentAgentConfig.title}</span>
        </div>
        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${currentAgentConfig.badgeBg}`}>
          Active Agent
        </span>
      </div>

      {/* Messages Thread */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
        {currentMessages.map((msg) => {
          const isAgent = msg.sender === "agent";
          return (
            <div
              key={msg.id}
              className={`flex items-start gap-3 ${isAgent ? "" : "flex-row-reverse"}`}
            >
              {/* Avatar */}
              <div
                className={`h-8 w-8 rounded-xl flex items-center justify-center shrink-0 text-xs font-bold shadow-xs ${
                  isAgent
                    ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900"
                    : "bg-blue-600 text-white"
                }`}
              >
                {isAgent ? <currentAgentConfig.icon className="h-4 w-4" /> : <User className="h-4 w-4" />}
              </div>

              {/* Message Bubble */}
              <div className={`max-w-[88%] sm:max-w-[80%] space-y-1 ${isAgent ? "" : "text-right"}`}>
                <div className="flex items-center gap-2 text-[10px] text-slate-400 px-1">
                  <span className="font-semibold">{isAgent ? currentAgentConfig.name : "You"}</span>
                  <span>{msg.timestamp}</span>
                </div>

                <div
                  className={`p-4 rounded-2xl text-xs leading-relaxed relative group text-left ${
                    isAgent
                      ? "bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 shadow-xs"
                      : "bg-blue-600 text-white shadow-xs"
                  }`}
                >
                  {/* Formatted Markdown Rendering */}
                  <MarkdownRenderer content={msg.text} isAgent={isAgent} />

                  {isAgent && (
                    <button
                      onClick={() => handleCopy(msg.id, msg.text)}
                      className="absolute top-2.5 right-2.5 p-1 rounded-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 opacity-0 group-hover:opacity-100 transition cursor-pointer"
                      title="Copy message"
                    >
                      {copiedId === msg.id ? (
                        <Check className="h-3 w-3 text-emerald-500" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {isSending && (
          <div className="flex items-start gap-3">
            <div className="h-8 w-8 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 flex items-center justify-center shrink-0">
              <RefreshCw className="h-4 w-4 animate-spin text-blue-500" />
            </div>
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-500 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-blue-500 animate-ping" />
              <span>{currentAgentConfig.name} is computing actuarial numbers for {clientContext?.clientName || "Investor"}...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Quick Prompt Chips */}
      <div className="px-4 py-2 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 overflow-x-auto">
        <div className="flex items-center gap-1.5 whitespace-nowrap">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-1">
            Prompt Chips:
          </span>
          {suggestedPrompts.map((prompt, idx) => (
            <button
              key={idx}
              onClick={() => handleSendMessage(prompt)}
              disabled={isSending}
              className="text-[11px] px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400 transition cursor-pointer shadow-2xs disabled:opacity-50"
            >
              {prompt}
            </button>
          ))}
        </div>
      </div>

      {/* Message Input Bar */}
      <div className="p-3 sm:p-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={`Ask ${currentAgentConfig.shortName} about ${clientContext?.clientName ? `${clientContext.clientName}'s` : "your"} portfolio...`}
            disabled={isSending}
            className="flex-1 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
          />

          <button
            type="submit"
            disabled={!inputValue.trim() || isSending}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition shadow-md shadow-blue-500/20 disabled:opacity-50 cursor-pointer"
          >
            {isSending ? (
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Send className="h-3.5 w-3.5" />
            )}
            <span className="hidden sm:inline">Send</span>
          </button>
        </form>
      </div>
    </div>
  );
}

export default function AiCopilotPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[500px]">
          <RefreshCw className="h-8 w-8 text-blue-500 animate-spin" />
        </div>
      }
    >
      <AiCopilotContent />
    </Suspense>
  );
}
