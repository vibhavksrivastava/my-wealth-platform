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
  welcomeMessage: string;
  suggestedPrompts: string[];
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
    welcomeMessage:
      "Hello! I am your Portfolio Diagnostics AI Agent. I evaluate scheme alpha, detect stock overlap across your mutual funds, and monitor category concentration risks.",
    suggestedPrompts: [
      "Check stock overlap between my equity funds",
      "Are my small-cap holdings at risk of overexposure?",
      "Audit my expense ratio (TER) drag and Regular vs Direct alpha",
      "Which schemes are underperforming their benchmark over 3 years?",
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
    welcomeMessage:
      "Welcome! I am your Rebalancing & Tax-Alpha Agent. I calculate asset allocation drift, design Systematic Transfer Plans (STP), and harvest up to ₹1.25 Lakhs of tax-free LTCG under Section 112A.",
    suggestedPrompts: [
      "How can I harvest ₹1.25 Lakhs LTCG tax-free under Section 112A?",
      "Calculate my current asset allocation drift against 65:25:10 target",
      "Recommend systematic switch/STP shifts from over-weighted equity",
      "How to rebalance without triggering short-term capital gains (STCG)?",
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
    welcomeMessage:
      "Greetings! I am your Smart Retirement Planning Agent. I calculate your inflation-adjusted retirement corpus and structure a resilient 3-Bucket Solution for uninterrupted monthly SWP cashflows.",
    suggestedPrompts: [
      "What is my target retirement corpus and monthly shortfall?",
      "Explain the 3-Bucket Solution for my post-retirement SWP",
      "How much monthly pension can I safely withdraw at 4.5% SWR?",
      "How should I integrate my EPF and NPS corpus into my retirement plan?",
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
    welcomeMessage:
      "Hello! I am your Risk & Insurance Planning Agent. I calculate your pure term insurance need using Human Life Value (HLV) and structure a Base + Super Top-up health setup to save ~65% on premiums.",
    suggestedPrompts: [
      "How much pure term insurance do I need to cover my family and loans?",
      "How does a ₹10L Base + ₹90L Super Top-up save 65% in premium?",
      "Why is the Married Women's Property (MWP) Act mandatory for term cover?",
      "Should I buy a separate health insurance policy for my senior parents?",
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

function AiCopilotContent() {
  const searchParams = useSearchParams();
  const initialAgentParam = (searchParams.get("agent") || "DIAGNOSTICS").toUpperCase() as AgentType;
  const initialClientId = searchParams.get("clientId") || "";

  const [activeAgent, setActiveAgent] = useState<AgentType>(
    AGENTS[initialAgentParam] ? initialAgentParam : "DIAGNOSTICS"
  );
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

  // Initialize welcome messages
  useEffect(() => {
    setMessages((prev) => {
      const updated = { ...prev };
      (Object.keys(AGENTS) as AgentType[]).forEach((type) => {
        if (!updated[type] || updated[type].length === 0) {
          updated[type] = [
            {
              id: `welcome-${type}`,
              sender: "agent",
              text: AGENTS[type].welcomeMessage,
              timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
              isAi: true,
            },
          ];
        }
      });
      return updated;
    });
  }, []);

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
      [currentAgent]: [...prev[currentAgent], userMsg],
    }));

    if (!textToSend) setInputValue("");
    setIsSending(true);

    try {
      const token = localStorage.getItem("auth_token");
      const history = messages[currentAgent].map((m) => ({
        role: m.sender === "user" ? "user" : "assistant",
        content: m.text,
      }));

      const res = await fetch("/api/ai-chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          agentType: currentAgent,
          message: text,
          history,
          clientId: initialClientId || undefined,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to generate AI response.");

      const agentMsg: MessageItem = {
        id: `agent-${Date.now()}`,
        sender: "agent",
        text: json.reply || "I have analyzed your query and updated your records.",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        isAi: Boolean(json.isAiGenerated),
      };

      setMessages((prev) => ({
        ...prev,
        [currentAgent]: [...prev[currentAgent], agentMsg],
      }));
    } catch (err: any) {
      const errMsg: MessageItem = {
        id: `err-${Date.now()}`,
        sender: "agent",
        text: `Error connecting to advisory agent: ${err.message || "Please check network connection."}`,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => ({
        ...prev,
        [currentAgent]: [...prev[currentAgent], errMsg],
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
              Select a specialized autonomous AI agent below to run live portfolio consultations.
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
              <div className={`max-w-[85%] sm:max-w-[78%] space-y-1 ${isAgent ? "" : "text-right"}`}>
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
                  {/* Markdown formatted text rendering */}
                  <div className="whitespace-pre-wrap font-sans space-y-2">
                    {msg.text}
                  </div>

                  {isAgent && (
                    <button
                      onClick={() => handleCopy(msg.id, msg.text)}
                      className="absolute top-2.5 right-2.5 p-1 rounded-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 opacity-0 group-hover:opacity-100 transition"
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
              <span>{currentAgentConfig.name} is computing actuarial numbers...</span>
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
          {currentAgentConfig.suggestedPrompts.map((prompt, idx) => (
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
            placeholder={`Ask ${currentAgentConfig.shortName} AI Agent about your portfolio...`}
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

