import { ChatComposer } from "@/components/ChatComposer";
import { RecentChats } from "@/components/RecentChats";
import type { ChatConversation } from "@/lib/chat";

type ChatLandingViewProps = {
  conversations: ChatConversation[];
  sending: boolean;
  onSend: (content: string) => void;
  now?: number;
};

export function ChatLandingView({
  conversations,
  sending,
  onSend,
  now,
}: ChatLandingViewProps) {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col pb-36 pt-6 lg:pb-10 lg:pt-16">
      <section
        className={`flex flex-col items-center text-center ${
          conversations.length === 0 ? "min-h-[min(32rem,60vh)] justify-center" : ""
        }`}
      >
        <h1 className="text-3xl font-bold tracking-tight text-ink sm:text-[2rem]">
          How can I help today?
        </h1>
        <div className="mt-8 w-full text-left">
          <ChatComposer onSend={onSend} sending={sending} />
        </div>
      </section>
      <div className="mt-12">
        <RecentChats conversations={conversations} now={now} />
      </div>
    </div>
  );
}
