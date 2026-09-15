"use client";

import { useState, useTransition } from "react";
import type { OrgSubscription, QuotaUsage } from "@/types/subscription";
import type { SupplyChainHealthBreakdown, SupplyChainAlert } from "@/types/supply-chain";
import { askAiManagerAction } from "@/app/actions/ai-manager";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bot, Sparkles, Send, ArrowRight, Zap, CheckCircle2, AlertTriangle, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface ChatMessage {
  id: string;
  sender: "user" | "ai";
  text: string;
  timestamp: string;
  recommendation?: string;
  suggestedAction?: {
    label: string;
    href: string;
  };
}

export function AIManagerView({
  subscription,
  quota,
  health,
  alerts,
}: {
  subscription: OrgSubscription;
  quota: QuotaUsage;
  health: SupplyChainHealthBreakdown;
  alerts: SupplyChainAlert[];
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "m-welcome",
      sender: "ai",
      text: `Hello! I'm your Supply Chain AI Manager. Your network health is currently scored at ${health.overall}/100 with ${alerts.length} open attention items. How can I assist you today?`,
      timestamp: "Just now",
      recommendation: alerts[0]
        ? `Primary priority: ${alerts[0].title}. ${alerts[0].description}`
        : undefined,
      suggestedAction: alerts[0]
        ? { label: "Review Top Alerts", href: "/dashboard/overview" }
        : undefined,
    },
  ]);
  const [input, setInput] = useState("");
  const [remainingQueries, setRemainingQueries] = useState(quota.aiQueries.remaining);
  const [isPending, startTransition] = useTransition();

  const QUICK_PROMPTS = [
    "What are our critical stockout risks?",
    "How is supplier on-time delivery (OTIF)?",
    "How much capital is tied up in overstock?",
    "Summarize inventory health across warehouses",
  ];

  async function handleSend(queryText?: string) {
    const textToSend = queryText || input;
    if (!textToSend.trim() || isPending) return;

    if (remainingQueries <= 0 && quota.aiQueries.limit !== -1) {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          sender: "ai",
          text: `⚠️ You have reached your monthly limit of AI queries for the ${subscription.plan.toUpperCase()} tier (${quota.aiQueries.limit} queries/mo). Please upgrade your plan in Settings to continue querying.`,
          timestamp: "Just now",
          suggestedAction: {
            label: "Upgrade Plan",
            href: "/dashboard/settings?tab=billing",
          },
        },
      ]);
      return;
    }

    const userMsg: ChatMessage = {
      id: `usr-${Date.now()}`,
      sender: "user",
      text: textToSend,
      timestamp: "Just now",
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");

    startTransition(async () => {
      // Answer generation, quota, and rate-limit checks all happen
      // server-side (askAiManagerAction) — the client only renders the result.
      const res = await askAiManagerAction(textToSend);

      if (!res.success) {
        setMessages((prev) => [
          ...prev,
          {
            id: `err-${Date.now()}`,
            sender: "ai",
            text: `⚠️ ${res.error ?? "Something went wrong — please try again."}`,
            timestamp: "Just now",
          },
        ]);
        return;
      }

      setRemainingQueries(res.remaining);
      setMessages((prev) => [
        ...prev,
        {
          id: `ai-${Date.now()}`,
          sender: "ai",
          text: res.reply!,
          timestamp: "Just now",
          recommendation: res.recommendation,
          suggestedAction: res.suggestedAction,
        },
      ]);
    });
  }

  return (
    <div className="space-y-6">
      {/* Top Quota Meter Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-xl border border-(--color-border) bg-(--color-surface) p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-600 text-white shrink-0">
            <Bot size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-body text-(--color-text-primary)">
                AI Supply Chain Copilot
              </h3>
              <span className="rounded-full bg-purple-500/10 px-2 py-0.5 text-caption font-semibold text-purple-600 dark:text-purple-400 capitalize">
                {subscription.plan} Tier
              </span>
            </div>
            <p className="text-small text-(--color-text-muted)">
              Answers generated using deterministic calculation models grounded in your company&apos;s data.
            </p>
          </div>
        </div>

        {/* AI Query Meter Badge */}
        <div className="flex items-center gap-3 bg-(--color-surface-secondary) px-4 py-2 rounded-lg border border-(--color-border)">
          <Sparkles size={16} className="text-purple-500 shrink-0" />
          <div className="text-right">
            <p className="text-small font-semibold text-(--color-text-primary)">
              {quota.aiQueries.limit === -1 ? (
                "Unlimited Queries"
              ) : (
                `${remainingQueries.toLocaleString()} / ${quota.aiQueries.limit.toLocaleString()} remaining`
              )}
            </p>
            <p className="text-caption text-(--color-text-muted)">Monthly Query Allowance</p>
          </div>
        </div>
      </div>

      {/* Main Chat Container */}
      <Card className="flex flex-col h-[560px] p-0 overflow-hidden">
        {/* Messages Scroll Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={cn(
                "flex gap-3 max-w-2xl",
                msg.sender === "user" ? "ml-auto flex-row-reverse" : "mr-auto"
              )}
            >
              <div
                className={cn(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white text-caption font-bold",
                  msg.sender === "user" ? "bg-(--color-brand)" : "bg-purple-600"
                )}
              >
                {msg.sender === "user" ? "You" : <Bot size={16} />}
              </div>

              <div
                className={cn(
                  "rounded-2xl px-4 py-3 text-small space-y-2.5",
                  msg.sender === "user"
                    ? "bg-(--color-brand) text-white rounded-tr-xs"
                    : "bg-(--color-surface-secondary) text-(--color-text-primary) border border-(--color-border) rounded-tl-xs"
                )}
              >
                <p className="leading-relaxed">{msg.text}</p>

                {msg.recommendation && (
                  <div className="rounded-lg bg-(--color-surface) p-3 text-caption text-(--color-text-secondary) border border-(--color-border) space-y-1.5">
                    <p className="font-semibold text-(--color-text-primary) flex items-center gap-1.5">
                      <Sparkles size={13} className="text-purple-500" /> Grounded Recommendation
                    </p>
                    <p>{msg.recommendation}</p>
                  </div>
                )}

                {msg.suggestedAction && (
                  <Link
                    href={msg.suggestedAction.href}
                    className="inline-flex items-center gap-1 font-semibold text-caption text-(--color-brand) hover:underline pt-1"
                  >
                    {msg.suggestedAction.label} <ArrowRight size={12} />
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Quick Suggestions Bar */}
        <div className="border-t border-(--color-border) bg-(--color-surface-secondary) px-6 py-2.5 flex items-center gap-2 overflow-x-auto">
          <span className="text-caption text-(--color-text-muted) shrink-0 font-medium">Quick Prompts:</span>
          {QUICK_PROMPTS.map((prompt, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleSend(prompt)}
              disabled={isPending}
              className="shrink-0 rounded-full border border-(--color-border) bg-(--color-surface) px-3 py-1 text-caption text-(--color-text-secondary) hover:text-(--color-text-primary) hover:border-(--color-brand) transition-colors"
            >
              {prompt}
            </button>
          ))}
        </div>

        {/* Input Form */}
        <div className="p-4 border-t border-(--color-border) bg-(--color-surface)">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center gap-3"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about inventory, supplier performance, stockouts, or spend..."
              disabled={isPending}
              maxLength={300}
              className="flex-1 rounded-lg border border-(--color-border) bg-(--color-surface-secondary) px-4 py-2.5 text-small text-(--color-text-primary) placeholder:text-(--color-text-muted) focus:border-(--color-brand) focus:outline-none"
            />
            <Button type="submit" disabled={!input.trim() || isPending} className="gap-1.5 shrink-0">
              <Send size={14} />
              {isPending ? "Analyzing..." : "Ask Copilot"}
            </Button>
          </form>
        </div>
      </Card>
    </div>
  );
}
