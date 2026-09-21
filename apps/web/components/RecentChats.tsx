"use client";

import Link from "next/link";
import { useState } from "react";

import {
  RECENT_CHATS_PAGE_SIZE,
  formatRelativeTime,
  hasMoreRecentChats,
  nextVisibleChatCount,
  sortConversationsByRecent,
  visibleRecentChats,
  type ChatConversation,
} from "@/lib/chat";

type RecentChatsProps = {
  conversations: ChatConversation[];
  now?: number;
};

export function RecentChats({ conversations, now }: RecentChatsProps) {
  const [visibleCount, setVisibleCount] = useState(RECENT_CHATS_PAGE_SIZE);
  const sorted = sortConversationsByRecent(conversations);
  const visible = visibleRecentChats(sorted, visibleCount);
  const more = hasMoreRecentChats(visible.length, sorted.length);

  if (sorted.length === 0) return null;

  return (
    <section className="w-full text-left" aria-label="Recent chats">
      <h2 className="px-4 text-sm font-semibold text-ink">Recent chats</h2>
      <ul className="mt-3 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-line">
        {visible.map((conversation) => (
          <li className="border-b border-line last:border-b-0" key={conversation.id}>
            <Link
              className="flex items-center justify-between gap-4 px-4 py-3 text-sm transition hover:bg-canvas"
              href={`/chat/${conversation.id}`}
            >
              <span className="min-w-0 truncate text-ink">{conversation.title}</span>
              <time className="shrink-0 text-xs text-muted" dateTime={new Date(conversation.updatedAt).toISOString()}>
                {formatRelativeTime(conversation.updatedAt, now)}
              </time>
            </Link>
          </li>
        ))}
      </ul>
      {more ? (
        <div className="mt-4 text-center">
          <button
            className="btn-link text-sm"
            onClick={() => setVisibleCount((count) => nextVisibleChatCount(count, sorted.length))}
            type="button"
          >
            Load more
          </button>
        </div>
      ) : null}
    </section>
  );
}
