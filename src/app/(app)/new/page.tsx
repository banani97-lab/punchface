import { Suspense } from "react";
import type { Metadata } from "next";
import { NewEventEditor } from "@/components/editor/new-event";
import { aiConfigured } from "@/lib/ai";
import { getViewer } from "@/lib/session";

export const metadata: Metadata = {
  title: "New invite",
  description: "Make a free invite in two minutes. No account needed.",
};

export default function NewEventPage() {
  return (
    <Suspense fallback={<EditorSkeleton />}>
      <Editor />
    </Suspense>
  );
}

async function Editor() {
  const viewer = await getViewer();
  return <NewEventEditor hostName={viewer?.name ?? ""} aiEnabled={aiConfigured()} fallback={<EditorSkeleton />} />;
}

function EditorSkeleton() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 pt-6 sm:px-6" aria-busy="true" aria-label="Loading editor">
      <div className="flex max-w-2xl flex-col gap-4">
        <div className="skeleton h-12 w-3/4" />
        <div className="skeleton h-5 w-2/3" />
        <div className="skeleton mt-4 h-48 !rounded-[20px]" />
        <div className="skeleton h-40 !rounded-[20px]" />
        <div className="skeleton h-14" />
        <div className="skeleton h-14" />
      </div>
    </div>
  );
}
