import Link from "next/link";
import { LogoMark } from "@/components/brand/logo";

export default function NotFound() {
  return (
    <main id="main" className="mx-auto flex min-h-dvh w-full max-w-md flex-col items-center justify-center px-4 py-16 text-center">
      <LogoMark size={64} />
      <h1 className="display mt-6 text-[2.75rem]">Nothing here</h1>
      <p className="mt-3 text-muted">
        This page doesn’t exist, or the invite was deleted. If someone sent you a link, ask them to send it again.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-2">
        <Link href="/" className="btn">Home</Link>
        <Link href="/new" className="btn btn-primary">Make an invite</Link>
      </div>
    </main>
  );
}
