import { useEffect, useRef, useState } from "react";
import { Star, Sparkles, Gift } from "lucide-react";
import Logo from "../components/branding/Logo";
import BubbleField from "../components/branding/BubbleField";
import AudioGate from "../components/AudioGate";
import AudioControls from "../components/AudioControls";
import SpinWheel from "../components/SpinWheel";
import { useActiveSession } from "../hooks/useActiveSession";
import { useAudio } from "../hooks/useAudio";
import { api } from "../lib/api";
import { DEFAULT_PRIZES } from "../lib/types";

function Bar({ label, pct, color = "#5f9941" }: { label: string; pct: number; color?: string }) {
  return (
    <div className="mb-3">
      <div className="flex justify-between text-sm font-semibold text-matcha-700 mb-1">
        <span>{label}</span>
        <span>{pct}%</span>
      </div>
      <div className="h-4 rounded-full bg-cream-100 overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

export default function DisplayPage() {
  const session = useActiveSession();
  const { playSfx } = useAudio();

  const [nicknames, setNicknames] = useState<string[]>([]);
  const [publicResults, setPublicResults] = useState<any>(null);
  const prevStageRef = useRef<string | null>(null);
  const prevStepRef = useRef<number>(0);

  useEffect(() => {
    if (!session.id) return;
    const poll = () => {
      api.getPublicNicknames(session.id!).then((r) => setNicknames(r.nicknames)).catch(() => {});
      api.getPublicResults(session.id!).then(setPublicResults).catch(() => {});
    };
    poll();
    const interval = setInterval(poll, 3000);
    return () => clearInterval(interval);
  }, [session.id, session.stage, session.revealStep]);

  useEffect(() => {
    if (prevStageRef.current && prevStageRef.current !== session.stage) {
      playSfx("reveal_cue");
    }
    prevStageRef.current = session.stage;
  }, [session.stage, playSfx]);

  useEffect(() => {
    if (session.stage === "ethical_reveal" && session.revealStep > prevStepRef.current) {
      playSfx("reveal_cue");
    }
    prevStepRef.current = session.revealStep;
  }, [session.revealStep, session.stage, playSfx]);

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-cream-50 via-peach-100 to-mint-100 overflow-hidden">
      <BubbleField />
      <AudioGate />
      <AudioControls />

      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-10 py-12 text-center">
        {!session.id && (
          <div>
            <Logo size={96} />
            <p className="mt-6 text-2xl text-matcha-600 font-display">Waiting for the instructor to start…</p>
          </div>
        )}

        {session.id && session.stage === "welcome" && (
          <div className="w-full max-w-4xl">
            <div className="flex justify-center mb-6">
              <Logo size={110} withWordmark />
            </div>
            <h1 className="font-display text-4xl font-extrabold text-matcha-800 mb-4">Welcome!</h1>
            <p className="text-xl text-matcha-600 mb-8">
              Join on your phone at <span className="font-mono font-bold text-caramel-600">/join</span>
            </p>
            <div className="flex flex-wrap justify-center gap-2 max-h-40 overflow-hidden">
              {nicknames.map((n, i) => (
                <span key={i} className="px-4 py-2 rounded-full bg-white/80 shadow-soft text-matcha-700 font-semibold text-sm">
                  {n}
                </span>
              ))}
            </div>
            <p className="mt-6 text-matcha-500">{nicknames.length} joined</p>
          </div>
        )}

        {session.id && session.stage === "reviews_open" && (
          <div className="w-full max-w-3xl">
            <Star className="h-14 w-14 text-gold-500 mx-auto mb-4" />
            <h1 className="font-display text-4xl font-extrabold text-matcha-800 mb-4">Rate Your NEAL TEA</h1>
            <p className="text-xl text-matcha-600">Grab your phone and give us a star rating — be honest!</p>
            <p className="mt-6 text-matcha-500">{nicknames.length} participants in this session</p>
          </div>
        )}

        {session.id && session.stage === "reviews_reveal" && (
          <div className="w-full max-w-xl">
            <h1 className="font-display text-3xl font-extrabold text-matcha-800 mb-6">The Reviews Are In</h1>
            {publicResults?.reviews ? (
              <div className="bg-white/80 rounded-3xl shadow-soft p-8 text-left">
                <p className="text-center text-matcha-700 mb-4">
                  <span className="text-3xl font-extrabold">{publicResults.reviews.average}</span>
                  <span className="text-matcha-400"> / 5 average · {publicResults.reviews.total} ratings</span>
                </p>
                {[5, 4, 3, 2, 1].map((star) => {
                  const count = publicResults.reviews.counts[star] ?? 0;
                  const pct = publicResults.reviews.total ? Math.round((count / publicResults.reviews.total) * 1000) / 10 : 0;
                  return <Bar key={star} label={`${star} ★`} pct={pct} color="#e8c158" />;
                })}
              </div>
            ) : (
              <p className="text-matcha-500">Loading results…</p>
            )}
          </div>
        )}

        {session.id && session.stage === "spin_open" && (
          <div className="w-full max-w-2xl">
            <h1 className="font-display text-3xl font-extrabold text-matcha-800 mb-6">Lucky Spin is Open!</h1>
            <div className="flex justify-center mb-6">
              <SpinWheel prizes={DEFAULT_PRIZES} resultPrizeId={null} spinToken={0} size={320} />
            </div>
            <p className="text-xl text-matcha-600">Spin on your own device — good luck!</p>
          </div>
        )}

        {session.id && session.stage === "spin_reveal" && (
          <div className="w-full max-w-xl">
            <h1 className="font-display text-3xl font-extrabold text-matcha-800 mb-6">Spin Results</h1>
            {publicResults?.purchases ? (
              <div className="bg-white/80 rounded-3xl shadow-soft p-8 text-left">
                <p className="text-center text-matcha-500 mb-4">
                  {publicResults.purchases.offered} participants were offered one more spin
                </p>
                <Bar label="Said yes — bought more" pct={publicResults.purchases.buyMorePct} color="#5f9941" />
                <Bar label="Said no thanks" pct={publicResults.purchases.noThanksPct} color="#c98a4b" />
              </div>
            ) : (
              <p className="text-matcha-500">Loading results…</p>
            )}
          </div>
        )}

        {session.id && session.stage === "ethical_reveal" && (
          <div className="w-full max-w-2xl">
            <Sparkles className="h-14 w-14 text-gold-500 mx-auto mb-4 animate-pop-in" />
            <h1 className="font-display text-4xl font-extrabold text-matcha-800 mb-4">Here's What Was Really Going On</h1>
            <p className="text-lg text-matcha-600 mb-6">
              Every review, every spin, and every "want one more?" prompt was designed — just like in real apps.
            </p>

            {session.revealStep >= 1 && publicResults?.odds && (
              <div className="bg-white/80 rounded-3xl shadow-soft p-6 mb-4 text-left animate-pop-in">
                <h2 className="font-display font-bold text-matcha-800 mb-3">The real odds, the whole time</h2>
                {publicResults.odds.map((o: any) => (
                  <Bar key={o.id} label={o.label} pct={o.pct} color="#b06f33" />
                ))}
              </div>
            )}

            {session.revealStep >= 2 && publicResults?.stagedPurchases && (
              <div className="bg-white/80 rounded-3xl shadow-soft p-6 mb-4 text-left animate-pop-in">
                <h2 className="font-display font-bold text-matcha-800 mb-3 flex items-center gap-2">
                  <Gift className="h-5 w-5 text-caramel-500" /> At scale, it adds up
                </h2>
                <Bar label="Buy more" pct={publicResults.stagedPurchases.buyMorePct} color="#5f9941" />
                <Bar label="No thanks" pct={publicResults.stagedPurchases.noThanksPct} color="#c98a4b" />
              </div>
            )}

            {session.revealStep >= 3 && (
              <div className="bg-matcha-700 text-cream-50 rounded-3xl shadow-lift p-6 animate-pop-in">
                <p className="font-display text-xl font-bold">
                  Incentives aren't neutral. The question isn't whether to use them — it's whether the people on the
                  other end know they're being used.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
