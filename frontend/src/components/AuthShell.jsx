import React from "react";
import { Sparkles } from "lucide-react";

export default function AuthShell({
  badgeIcon: BadgeIcon,
  badgeText,
  heroTitle,
  heroDescription,
  featureItems = [],
  statusLabel,
  statusTitle,
  statusDescription,
  orbIcon: OrbIcon = Sparkles,
  orbScale = 1,
  orbOpacity = 1,
  cardIcon: CardIcon = Sparkles,
  cardTitle,
  cardDescription,
  children,
  footer,
}) {
  return (
    <div className="login-page relative min-h-screen overflow-hidden bg-slate-950 text-slate-100">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(99,102,241,0.26),_transparent_30%),radial-gradient(circle_at_82%_18%,_rgba(45,212,191,0.12),_transparent_24%),radial-gradient(circle_at_bottom,_rgba(147,51,234,0.16),_transparent_28%),linear-gradient(135deg,_rgba(15,23,42,1),_rgba(2,6,23,1))]" />
      <div className="absolute inset-0 opacity-25 [background-image:linear-gradient(rgba(148,163,184,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.08)_1px,transparent_1px)] [background-size:52px_52px]" />
      <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-white/5 to-transparent blur-3xl" />

      <div className="relative mx-auto grid min-h-screen max-w-7xl items-center gap-10 px-6 py-10 lg:grid-cols-[1.1fr_0.9fr] lg:px-10">
        <section className="flex flex-col justify-center gap-8">
          <div className="max-w-xl space-y-5">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold tracking-wide text-slate-200 backdrop-blur">
              {BadgeIcon ? <BadgeIcon size={14} className="text-indigo-300" /> : null}
              {badgeText}
            </div>

            <div>
              <h1 className="text-4xl font-black tracking-tight text-white sm:text-5xl lg:text-6xl">
                {heroTitle}
              </h1>
              <p className="mt-4 max-w-xl text-base leading-7 text-slate-300 sm:text-lg">
                {heroDescription}
              </p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            {featureItems.map((item) => {
              const ItemIcon = item.icon;
              return (
                <div
                  key={item.title}
                  className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-[0_20px_60px_rgba(15,23,42,0.35)] backdrop-blur-xl transition-all duration-200 hover:-translate-y-1 hover:border-indigo-300/30 hover:bg-white/7"
                >
                  <ItemIcon size={18} className="text-indigo-300" />
                  <p className="mt-3 text-sm font-semibold text-white">{item.title}</p>
                  <p className="mt-1 text-sm leading-6 text-slate-300">{item.text}</p>
                </div>
              );
            })}
          </div>

          <div className="hidden items-end gap-6 rounded-[2rem] border border-white/10 bg-white/5 p-6 shadow-[0_20px_80px_rgba(15,23,42,0.45)] backdrop-blur-xl lg:flex">
            <div className="relative flex h-56 w-56 items-center justify-center rounded-full border border-indigo-400/20 bg-gradient-to-b from-indigo-500/20 via-purple-500/10 to-transparent">
              <div
                className="flex h-40 w-40 items-center justify-center rounded-full border border-white/10 bg-slate-950/80 shadow-[0_0_50px_rgba(99,102,241,0.35)] transition-transform duration-300 ease-out"
                style={{ transform: `scale(${orbScale})`, opacity: orbOpacity }}
              >
                <div className="flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 via-violet-500 to-purple-500 text-white shadow-[0_0_35px_rgba(99,102,241,0.65)]">
                  <OrbIcon size={34} />
                </div>
              </div>
              <div className="absolute bottom-10 h-10 w-1 rounded-full bg-slate-300/40" />
              <div className="absolute bottom-4 h-4 w-4 rounded-full bg-amber-200 shadow-[0_0_24px_rgba(251,191,36,0.8)]" />
            </div>

            <div className="max-w-md">
              <p className="text-sm font-semibold uppercase tracking-[0.35em] text-indigo-200">{statusLabel}</p>
              <h2 className="mt-3 text-2xl font-bold text-white">{statusTitle}</h2>
              <p className="mt-3 text-sm leading-7 text-slate-300">{statusDescription}</p>
            </div>
          </div>
        </section>

        <section className="flex justify-center lg:justify-end">
          <div className="w-full max-w-md rounded-[2rem] border border-white/10 bg-white/8 p-8 shadow-[0_30px_80px_rgba(15,23,42,0.5)] backdrop-blur-2xl sm:p-10">
            <div className="mb-8 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg shadow-indigo-500/30">
                <CardIcon className="text-white" size={30} />
              </div>
              <h1 className="mt-4 text-3xl font-black tracking-tight text-white">{cardTitle}</h1>
              <p className="mt-2 text-sm text-slate-300">{cardDescription}</p>
            </div>

            {children}

            {footer}
          </div>
        </section>
      </div>
    </div>
  );
}
