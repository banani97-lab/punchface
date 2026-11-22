import Link from "next/link";
import { Plus } from "lucide-react";
import { Logo } from "@/components/brand/logo";

export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <header className="sticky top-0 z-30 border-b-2 border-line bg-bg/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-2 px-4 sm:px-6">
          <Link href="/" aria-label="punchface home" className="mr-auto rounded-lg">
            <Logo />
          </Link>
          <Link href="/events" className="btn btn-ghost btn-sm" prefetch={true}>
            My events
          </Link>
          <Link href="/new" className="btn btn-primary btn-sm">
            <Plus size={18} strokeWidth={3} aria-hidden="true" />
            <span>
              New<span className="hidden sm:inline"> invite</span>
            </span>
          </Link>
        </div>
      </header>
      <main id="main" className="flex flex-1 flex-col">
        {children}
      </main>
    </>
  );
}
