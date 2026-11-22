import Link from "next/link";
import {
  ArrowRight,
  BellRing,
  CalendarCheck,
  Camera,
  HandHeart,
  MessagesSquare,
  MousePointerClick,
  QrCode,
  ShoppingBasket,
  Sparkles,
  Users,
  Vote,
} from "lucide-react";
import { LogoMark } from "@/components/brand/logo";
import { EventCover } from "@/components/cover/event-cover";
import { Showcase } from "@/components/landing/showcase";
import { THEMES } from "@/lib/themes";

const PROMISES = [
  {
    emoji: "🚫",
    title: "No ads. On anything.",
    body: "Your invite is about your party. Guests never see a banner, a pop-up or a “sponsored” anything.",
    tint: "bg-accent-2 !text-[#1b1325]",
  },
  {
    emoji: "👆",
    title: "Guests don’t sign up",
    body: "One link, one tap, a name. No app to download, no password, no account. Even your uncle can do it.",
    tint: "bg-card",
  },
  {
    emoji: "💸",
    title: "Free to send and reply",
    body: "Make the invite, share the link, collect the replies. No card to start, and nothing held back behind a paywall.",
    tint: "bg-card",
  },
];

const FEATURES = [
  { icon: MousePointerClick, title: "One-tap replies", body: "Going, maybe or can’t, with plus-ones and a note for the host." },
  { icon: Vote, title: "Date polls", body: "Not sure when? Let guests vote, then lock in the winner." },
  { icon: ShoppingBasket, title: "Bring list", body: "A sign-up sheet so you don’t get nine bags of chips and no ice." },
  { icon: MessagesSquare, title: "Guest wall", body: "Comments and reactions to build the hype (and settle what to wear)." },
  { icon: Camera, title: "Shared album", body: "Everyone adds photos to one place. Location data is stripped on upload." },
  { icon: Sparkles, title: "Invite writer", body: "Describe the party in a sentence and get a draft you can tweak." },
  { icon: BellRing, title: "Reminders & updates", body: "Nudge the non-repliers and message everyone when plans change." },
  { icon: Users, title: "Headcount limits", body: "Cap the numbers. Extras join a waitlist and move up automatically." },
  { icon: CalendarCheck, title: "Calendar-ready", body: "Guests add it to Apple, Google or Outlook in two taps." },
  { icon: QrCode, title: "QR code included", body: "Print it, stick it on the fridge, put it on a flyer." },
];

const STEPS = [
  { n: "1", title: "Make it", body: "Pick a look, add the when and where. Two minutes, no account." },
  { n: "2", title: "Share the link", body: "Group chat, text, email, QR code. Wherever your people are." },
  { n: "3", title: "Watch replies roll in", body: "See who’s coming, what they’re bringing and who needs a nudge." },
];

const OCCASIONS = ["Birthdays", "Housewarmings", "Dinner parties", "Baby showers", "Game nights", "BBQs", "Engagements", "Kids' parties", "Holiday dos", "Pool days", "Book clubs", "Leaving drinks"];

export default function LandingPage() {
  return (
    <>
      <section className="mx-auto grid w-full max-w-6xl items-center gap-12 px-4 pb-16 pt-10 sm:px-6 lg:grid-cols-[1.25fr_0.75fr] lg:gap-8 lg:pb-24 lg:pt-20">
        <div className="animate-fade-up">
          <p className="chip chip-accent">
            <HandHeart size={16} aria-hidden="true" /> Free · No ads · No guest sign-ups
          </p>
          <h1 className="display mt-5 text-[clamp(3rem,2rem+5vw,5.25rem)]">
            Invites people <span className="relative whitespace-nowrap">
              <span className="relative z-10">actually</span>
              <span className="absolute inset-x-[-0.06em] bottom-[0.08em] z-0 h-[0.34em] -rotate-1 rounded-sm bg-accent" aria-hidden="true" />
            </span>{" "}
            answer.
          </h1>
          <p className="mt-5 max-w-xl text-[clamp(1.0625rem,1rem+0.4vw,1.25rem)] text-muted">
            Make a great-looking invite in two minutes and share one link. Guests reply in a tap, with no app and no
            account, and you always know who’s coming.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link href="/new" className="btn btn-primary btn-lg">
              Make an invite <ArrowRight size={20} strokeWidth={3} aria-hidden="true" />
            </Link>
            <a href="#how" className="btn btn-ghost btn-lg">See how it works</a>
          </div>
          <p className="mt-4 text-sm text-muted">No account needed to start. Takes about two minutes.</p>
        </div>
        <div className="animate-fade-up [animation-delay:120ms]">
          <Showcase />
        </div>
      </section>

      <div className="overflow-hidden border-y-2 border-line bg-fg py-3.5 text-bg" aria-hidden="true">
        <div className="flex w-max animate-marquee gap-8 whitespace-nowrap font-display text-xl font-extrabold tracking-tight">
          {[...OCCASIONS, ...OCCASIONS].map((o, i) => (
            <span key={i} className="flex items-center gap-8">
              {o} <span className="text-accent-2">✦</span>
            </span>
          ))}
        </div>
      </div>

      <section className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 lg:py-24" aria-labelledby="promises">
        <h2 id="promises" className="display max-w-2xl text-[clamp(2.25rem,1.5rem+3.6vw,3.75rem)]">
          The invite app that stays out of the way.
        </h2>
        <ul className="mt-10 grid gap-4 md:grid-cols-3">
          {PROMISES.map((p) => (
            <li key={p.title} className={`card p-6 ${p.tint}`}>
              <p className="text-4xl" aria-hidden="true">{p.emoji}</p>
              <h3 className="mt-4 text-xl font-extrabold leading-tight">{p.title}</h3>
              <p className="mt-2 text-[0.9375rem] opacity-80">{p.body}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="border-y-2 border-line bg-card" aria-labelledby="features">
        <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 lg:py-24">
          <p className="eyebrow">Everything a party needs</p>
          <h2 id="features" className="display mt-2 max-w-2xl text-[clamp(2.25rem,1.5rem+3.6vw,3.75rem)]">
            Small tools that do the chasing for you.
          </h2>
          <ul className="mt-10 grid gap-x-8 gap-y-7 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <li key={f.title} className="flex gap-4">
                <span className="grid size-12 shrink-0 place-items-center rounded-2xl border-2 border-line bg-bg shadow-pop-sm">
                  <f.icon size={22} aria-hidden="true" />
                </span>
                <div>
                  <h3 className="font-extrabold leading-tight">{f.title}</h3>
                  <p className="mt-1 text-[0.9375rem] text-muted">{f.body}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section id="how" className="mx-auto w-full max-w-6xl scroll-mt-20 px-4 py-16 sm:px-6 lg:py-24" aria-labelledby="how-title">
        <h2 id="how-title" className="display text-[clamp(2.25rem,1.5rem+3.6vw,3.75rem)]">Three steps. That’s the list.</h2>
        <ol className="mt-10 grid gap-4 md:grid-cols-3">
          {STEPS.map((s) => (
            <li key={s.n} className="card p-6">
              <span className="display grid size-12 place-items-center rounded-full border-2 border-line bg-accent text-2xl text-accent-fg" aria-hidden="true">
                {s.n}
              </span>
              <h3 className="mt-4 text-xl font-extrabold">{s.title}</h3>
              <p className="mt-1.5 text-[0.9375rem] text-muted">{s.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 pb-16 sm:px-6 lg:pb-24" aria-labelledby="themes-title">
        <p className="eyebrow">{THEMES.length} themes, zero clip art</p>
        <h2 id="themes-title" className="display mt-2 max-w-2xl text-[clamp(2.25rem,1.5rem+3.6vw,3.75rem)]">
          A look for every kind of party.
        </h2>
        <ul className="mt-10 grid grid-cols-3 gap-3 sm:grid-cols-5">
          {THEMES.map((t) => (
            <li key={t.id}>
              <EventCover theme={t} emoji="🎉" seed={t.id} animated={false} className="aspect-[4/3] rounded-2xl border-2 border-line" />
              <p className="mt-1.5 truncate text-sm font-bold">{t.name}</p>
            </li>
          ))}
        </ul>
        <p className="mt-6 text-[0.9375rem] text-muted">Or upload your own photo as the cover.</p>
      </section>

      <section className="border-t-2 border-line bg-accent text-accent-fg">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-start gap-6 px-4 py-16 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:py-20">
          <h2 className="display max-w-xl text-[clamp(2.5rem,1.6rem+4.4vw,4.5rem)]">Got a date in mind? Let’s get it out there.</h2>
          <Link href="/new" className="btn btn-ink btn-lg shrink-0">
            Make an invite <ArrowRight size={20} strokeWidth={3} aria-hidden="true" />
          </Link>
        </div>
      </section>

      <footer className="border-t-2 border-line">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-8 text-sm text-muted sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p className="flex items-center gap-2 font-bold text-fg">
            <LogoMark size={24} /> punchface
          </p>
          <p>Invites without the ads, the paywalls or the sign-up forms.</p>
          <nav aria-label="Footer" className="flex gap-5 font-semibold">
            <Link href="/new" className="hover:text-fg">New invite</Link>
            <Link href="/events" className="hover:text-fg">My events</Link>
            <Link href="/login" className="hover:text-fg">Sign in</Link>
          </nav>
        </div>
      </footer>
    </>
  );
}
