import { useEffect, useRef, useState, type FormEvent } from "react";
import { Sparkles, RotateCw, ThumbsUp, ThumbsDown, Gift, Info } from "lucide-react";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import Logo from "../components/branding/Logo";
import BubbleField from "../components/branding/BubbleField";
import StarRating from "../components/StarRating";
import SpinWheel from "../components/SpinWheel";
import AudioGate from "../components/AudioGate";
import AudioControls from "../components/AudioControls";
import { useActiveSession } from "../hooks/useActiveSession";
import { useAudio } from "../hooks/useAudio";
import { api, ApiError } from "../lib/api";
import { loadParticipant, saveParticipant, clearParticipant, type StoredParticipant } from "../lib/participant";
import { DEFAULT_PRIZES, type PrizeId, type PrizeDef } from "../lib/types";

export default function JoinPage() {
  const session = useActiveSession();
  const { playSfx } = useAudio();

  const [participant, setParticipant] = useState<StoredParticipant | null>(null);
  const [nickname, setNickname] = useState("");
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);

  const [rating, setRating] = useState(0);
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewDone, setReviewDone] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);

  const [spinning, setSpinning] = useState(false);
  const [spinResult, setSpinResult] = useState<PrizeId | null>(null);
  const [spinToken, setSpinToken] = useState(0);
  const [spinError, setSpinError] = useState<string | null>(null);
  const [showOffer, setShowOffer] = useState(false);
  const [purchaseDecisionMade, setPurchaseDecisionMade] = useState<"buy_more" | "no_thanks" | null>(null);
  const [odds, setOdds] = useState<{ id: string; label: string; pct: number }[] | null>(null);
  const [showOdds, setShowOdds] = useState(false);

  const lastSpunPrizeRef = useRef<PrizeDef | null>(null);

  // Load (or invalidate) stored identity whenever the active session changes.
  useEffect(() => {
    if (!session.id) return;
    const stored = loadParticipant();
    if (stored && stored.sessionId === session.id) {
      setParticipant(stored);
      setReviewDone(Boolean(stored.reviewSubmitted));
      setPurchaseDecisionMade(stored.purchaseDecisionMade ?? null);
    } else if (stored) {
      clearParticipant();
      setParticipant(null);
    }
  }, [session.id]);

  async function handleJoin(e: FormEvent) {
    e.preventDefault();
    if (!session.id) return;
    const trimmed = nickname.trim();
    if (!trimmed) {
      setJoinError("Please enter a nickname.");
      return;
    }
    setJoining(true);
    setJoinError(null);
    try {
      const res = await api.joinSession({ sessionId: session.id, nickname: trimmed });
      const stored: StoredParticipant = {
        participantId: res.participantId,
        sessionId: session.id,
        sessionToken: res.sessionToken,
        nickname: trimmed,
        freeSpinsRemaining: res.freeSpinsRemaining,
        extraSpinsRemaining: res.extraSpinsRemaining,
      };
      saveParticipant(stored);
      setParticipant(stored);
    } catch (err) {
      setJoinError(err instanceof ApiError ? err.message : "Couldn't join right now. Try again.");
    } finally {
      setJoining(false);
    }
  }

  async function handleSubmitReview() {
    if (!participant || !session.id || rating === 0) return;
    setReviewSubmitting(true);
    setReviewError(null);
    try {
      await api.submitReview({
        sessionId: session.id,
        participantId: participant.participantId,
        sessionToken: participant.sessionToken,
        rating,
      });
      const updated = { ...participant, reviewSubmitted: true };
      saveParticipant(updated);
      setParticipant(updated);
      setReviewDone(true);
      playSfx("buy_confirm");
    } catch (err) {
      if (err instanceof ApiError && err.code === "already_submitted") {
        const updated = { ...participant, reviewSubmitted: true };
        saveParticipant(updated);
        setParticipant(updated);
        setReviewDone(true);
      } else {
        setReviewError(err instanceof ApiError ? err.message : "Couldn't submit your review. Try again.");
      }
    } finally {
      setReviewSubmitting(false);
    }
  }

  async function doSpin(spinType: "free" | "extra") {
    if (!participant || !session.id || spinning) return;
    setSpinning(true);
    setSpinError(null);
    try {
      const requestId = crypto.randomUUID();
      const res = await api.requestSpin({
        sessionId: session.id,
        participantId: participant.participantId,
        sessionToken: participant.sessionToken,
        spinType,
        requestId,
      });
      const updated = {
        ...participant,
        freeSpinsRemaining: res.freeSpinsRemaining,
        extraSpinsRemaining: res.extraSpinsRemaining,
      };
      saveParticipant(updated);
      setParticipant(updated);
      lastSpunPrizeRef.current = DEFAULT_PRIZES.find((p) => p.id === (res.prizeId as PrizeId)) ?? null;
      setSpinResult(res.prizeId as PrizeId);
      setSpinToken((t) => t + 1);
    } catch (err) {
      setSpinning(false);
      if (err instanceof ApiError && (err.code === "no_free_spins" || err.code === "no_extra_spins")) {
        setShowOffer(true);
      } else {
        setSpinError(err instanceof ApiError ? err.message : "Couldn't spin right now. Try again.");
      }
    }
  }

  function handleWheelDone() {
    setSpinning(false);
    const prize = lastSpunPrizeRef.current;
    const stillHasFree = (participant?.freeSpinsRemaining ?? 0) > 0;
    const stillHasExtra = (participant?.extraSpinsRemaining ?? 0) > 0;
    if (!stillHasFree && !stillHasExtra && purchaseDecisionMade === null && prize) {
      setShowOffer(true);
      playSfx("offer_notify");
    }
  }

  async function handlePurchaseDecision(decision: "buy_more" | "no_thanks") {
    if (!participant || !session.id) return;
    try {
      const res = await api.purchaseDecision({
        sessionId: session.id,
        participantId: participant.participantId,
        sessionToken: participant.sessionToken,
        decision,
      });
      const updated = {
        ...participant,
        purchaseDecisionMade: decision,
        extraSpinsRemaining: res.extraSpinGranted
          ? (participant.extraSpinsRemaining ?? 0) + 1
          : participant.extraSpinsRemaining,
      };
      saveParticipant(updated);
      setParticipant(updated);
      setPurchaseDecisionMade(decision);
      setShowOffer(false);
      playSfx(decision === "buy_more" ? "buy_confirm" : "no_thanks");
    } catch {
      setShowOffer(false);
    }
  }

  useEffect(() => {
    if (session.stage === "spin_open" && session.id) {
      api.getPrizeOdds(session.id).then((r) => setOdds(r.odds)).catch(() => {});
    }
  }, [session.stage, session.id]);

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-cream-50 via-peach-100 to-mint-100 overflow-hidden">
      <BubbleField />
      <AudioGate />
      <AudioControls />

      <div className="relative z-10 min-h-screen flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-md">
          <div className="flex justify-center mb-6">
            <Logo size={56} withWordmark />
          </div>

          {!session.id && (
            <Card className="text-center animate-pop-in">
              <p className="text-matcha-700 font-semibold">Waiting for the session to start…</p>
              <p className="text-sm text-matcha-500 mt-2">
                Your instructor will open the session shortly. This page will update automatically.
              </p>
            </Card>
          )}

          {session.id && !participant && (
            <Card className="animate-pop-in">
              <h1 className="font-display text-xl font-bold text-matcha-800 mb-1">Join the session</h1>
              <p className="text-sm text-matcha-500 mb-4">Pick a nickname — nothing else is collected.</p>
              <form onSubmit={handleJoin} className="space-y-3">
                <input
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  maxLength={24}
                  placeholder="Your nickname"
                  className="w-full rounded-xl border-2 border-cream-200 px-4 py-3 text-matcha-800 focus:outline-none focus:border-matcha-400"
                />
                {joinError && <p className="text-sm text-blossom-600">{joinError}</p>}
                <Button type="submit" loading={joining} className="w-full">
                  Join
                </Button>
              </form>
            </Card>
          )}

          {session.id && participant && (
            <div className="space-y-4">
              <Card padded={false} className="px-5 py-3 flex items-center justify-between">
                <span className="text-sm text-matcha-500">Playing as</span>
                <span className="font-display font-bold text-matcha-800">{participant.nickname}</span>
              </Card>

              {session.stage === "welcome" && (
                <Card className="text-center animate-pop-in">
                  <p className="text-matcha-700 font-semibold">You're in, {participant.nickname}!</p>
                  <p className="text-sm text-matcha-500 mt-2">Keep an eye on the big screen — we're starting soon.</p>
                </Card>
              )}

              {session.stage === "reviews_open" && !reviewDone && (
                <Card className="animate-pop-in text-center">
                  <h2 className="font-display text-lg font-bold text-matcha-800 mb-1">Rate your NEAL TEA</h2>
                  <p className="text-sm text-matcha-500 mb-5">Be honest — it's anonymous on screen.</p>
                  <div className="flex justify-center mb-5">
                    <StarRating value={rating} onChange={setRating} />
                  </div>
                  {reviewError && <p className="text-sm text-blossom-600 mb-3">{reviewError}</p>}
                  <Button onClick={handleSubmitReview} loading={reviewSubmitting} disabled={rating === 0} className="w-full">
                    Submit Rating
                  </Button>
                </Card>
              )}

              {session.stage === "reviews_open" && reviewDone && (
                <Card className="text-center animate-pop-in">
                  <p className="text-matcha-700 font-semibold">Thanks for rating!</p>
                  <p className="text-sm text-matcha-500 mt-2">Hang tight while everyone else finishes up.</p>
                </Card>
              )}

              {session.stage === "reviews_reveal" && (
                <Card className="text-center animate-pop-in">
                  <p className="text-matcha-700 font-semibold">The reviews are in!</p>
                  <p className="text-sm text-matcha-500 mt-2">Check the big screen to see how everyone rated.</p>
                </Card>
              )}

              {session.stage === "spin_open" && (
                <Card className="animate-pop-in text-center">
                  <h2 className="font-display text-lg font-bold text-matcha-800 mb-3">Lucky Spin</h2>
                  <div className="flex justify-center mb-4">
                    <SpinWheel
                      prizes={DEFAULT_PRIZES}
                      resultPrizeId={spinResult}
                      spinToken={spinToken}
                      onSpinComplete={handleWheelDone}
                      size={280}
                    />
                  </div>

                  {spinning && <p className="text-sm text-matcha-500 mb-3">Spinning…</p>}

                  {!spinning && spinResult && lastSpunPrizeRef.current && (
                    <div className="mb-4 animate-pop-in">
                      <p className="font-display font-extrabold text-matcha-800">{lastSpunPrizeRef.current.headline}</p>
                      <p className="text-sm text-matcha-500">{lastSpunPrizeRef.current.subline}</p>
                    </div>
                  )}

                  <div className="flex items-center justify-center gap-4 text-sm text-matcha-600 mb-4">
                    <span>Free spins: <strong>{participant.freeSpinsRemaining ?? 0}</strong></span>
                    <span>Extra spins: <strong>{participant.extraSpinsRemaining ?? 0}</strong></span>
                  </div>

                  {spinError && <p className="text-sm text-blossom-600 mb-3">{spinError}</p>}

                  <div className="flex flex-col gap-2">
                    <Button
                      onClick={() => doSpin((participant.freeSpinsRemaining ?? 0) > 0 ? "free" : "extra")}
                      loading={spinning}
                      disabled={(participant.freeSpinsRemaining ?? 0) <= 0 && (participant.extraSpinsRemaining ?? 0) <= 0}
                      icon={<RotateCw className="h-4 w-4" />}
                      className="w-full"
                    >
                      Spin!
                    </Button>
                    <button
                      onClick={() => setShowOdds((s) => !s)}
                      className="text-xs text-matcha-400 flex items-center justify-center gap-1 mt-1"
                    >
                      <Info className="h-3 w-3" /> {showOdds ? "Hide" : "View"} prize odds
                    </button>
                    {showOdds && odds && (
                      <div className="text-xs text-matcha-500 bg-cream-50 rounded-xl p-3 mt-1 space-y-1">
                        {odds.map((o) => (
                          <div key={o.id} className="flex justify-between">
                            <span>{o.label}</span>
                            <span className="font-semibold">{o.pct}%</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </Card>
              )}

              {session.stage === "spin_reveal" && (
                <Card className="text-center animate-pop-in">
                  <p className="text-matcha-700 font-semibold">Spins are done!</p>
                  <p className="text-sm text-matcha-500 mt-2">Check the big screen for the full results.</p>
                </Card>
              )}

              {session.stage === "ethical_reveal" && (
                <Card className="text-center animate-pop-in">
                  <Sparkles className="h-6 w-6 text-gold-500 mx-auto mb-2" />
                  <p className="text-matcha-700 font-semibold">That's the whole trick.</p>
                  <p className="text-sm text-matcha-500 mt-2">Look up at the screen — here's what was really going on.</p>
                </Card>
              )}
            </div>
          )}
        </div>
      </div>

      {showOffer && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-matcha-900/70 px-6">
          <Card className="max-w-sm w-full text-center animate-pop-in">
            <Gift className="h-8 w-8 text-caramel-500 mx-auto mb-3" />
            <h3 className="font-display text-lg font-bold text-matcha-800 mb-2">Out of spins!</h3>
            <p className="text-sm text-matcha-500 mb-5">Want one more spin before we move on?</p>
            <div className="flex gap-3">
              <Button
                variant="secondary"
                className="flex-1"
                icon={<ThumbsDown className="h-4 w-4" />}
                onClick={() => handlePurchaseDecision("no_thanks")}
              >
                No thanks
              </Button>
              <Button
                className="flex-1"
                icon={<ThumbsUp className="h-4 w-4" />}
                onClick={() => handlePurchaseDecision("buy_more")}
              >
                Yes, please!
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
