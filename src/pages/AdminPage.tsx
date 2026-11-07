import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  LogOut,
  PlayCircle,
  RotateCcw,
  Settings2,
  BarChart3,
  Volume2,
  Users,
  ChevronRight,
  AlertTriangle,
  Save,
  Monitor,
} from "lucide-react";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import Logo from "../components/branding/Logo";
import AudioControls from "../components/AudioControls";
import { supabase, SUPABASE_CONFIGURED } from "../lib/supabaseClient";
import { useActiveSession } from "../hooks/useActiveSession";
import { api, ApiError } from "../lib/api";
import { DEFAULT_PRIZES, type PrizeDef } from "../lib/types";

type Tab = "session" | "control" | "spin" | "results" | "audio" | "reset";

const STAGES: { id: string; label: string }[] = [
  { id: "welcome", label: "Welcome" },
  { id: "reviews_open", label: "Reviews Open" },
  { id: "reviews_reveal", label: "Review Results" },
  { id: "spin_open", label: "Lucky Spin" },
  { id: "spin_reveal", label: "Lucky Spin Results" },
  { id: "ethical_reveal", label: "Ethical Reveal" },
];

export default function AdminPage() {
  const [authLoading, setAuthLoading] = useState(true);
  const [adminToken, setAdminToken] = useState<string | null>(null);
  const [adminEmail, setAdminEmail] = useState<string | null>(null);

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loggingIn, setLoggingIn] = useState(false);

  const [tab, setTab] = useState<Tab>("session");
  const liveSession = useActiveSession();

  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const [results, setResults] = useState<any | null>(null);
  const [resultsLoading, setResultsLoading] = useState(false);

  const [prizes, setPrizes] = useState<PrizeDef[]>(DEFAULT_PRIZES);
  const [freeSpins, setFreeSpins] = useState(2);
  const [purchaseEnabled, setPurchaseEnabled] = useState(true);
  const [configSaving, setConfigSaving] = useState(false);
  const [configSaved, setConfigSaved] = useState(false);

  const [stagedBuyMore, setStagedBuyMore] = useState(0);
  const [stagedNoThanks, setStagedNoThanks] = useState(0);
  const [stagedReview1, setStagedReview1] = useState(0);
  const [stagedReview2, setStagedReview2] = useState(0);
  const [stagedReview3, setStagedReview3] = useState(0);
  const [stagedReview4, setStagedReview4] = useState(0);
  const [stagedReview5, setStagedReview5] = useState(0);
  const [resultsMode, setResultsMode] = useState<"actual" | "staged">("actual");
  const [resultsModeSaving, setResultsModeSaving] = useState(false);

  useEffect(() => {
    if (!SUPABASE_CONFIGURED) {
      setAuthLoading(false);
      return;
    }
    supabase.auth.getSession().then(({ data }) => {
      setAdminToken(data.session?.access_token ?? null);
      setAdminEmail(data.session?.user?.email ?? null);
      setAuthLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, authSession) => {
      setAdminToken(authSession?.access_token ?? null);
      setAdminEmail(authSession?.user?.email ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function handleLogin(e: FormEvent) {
    e.preventDefault();
    setLoggingIn(true);
    setLoginError(null);
    const { error } = await supabase.auth.signInWithPassword({ email: loginEmail, password: loginPassword });
    if (error) setLoginError(error.message);
    setLoggingIn(false);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
  }

  // `syncConfig` controls whether this call is also allowed to overwrite the
  // admin's in-progress settings edits (prize weights, free-spin count, the
  // Actual/Staged toggle and its staged numbers) with whatever is currently
  // saved on the server. The live numbers (`results` itself) are always
  // refreshed. Only the initial load and the moment right after a successful
  // save should sync config — the periodic poll and the manual "Refresh"
  // buttons must NOT, or an admin who clicks "Staged" but hasn't hit Save
  // yet would see their selection silently revert a few seconds later.
  async function refreshResults(syncConfig = false) {
    if (!adminToken || !liveSession.id) return;
    setResultsLoading(true);
    try {
      const r = await api.getPrivateResults({ adminToken, sessionId: liveSession.id });
      setResults(r);
      if (syncConfig) {
        setPrizes(r.config.prizes);
        setFreeSpins(r.config.freeSpins);
        setPurchaseEnabled(r.config.purchaseEnabled);
        setStagedBuyMore(r.staged.buyMore);
        setStagedNoThanks(r.staged.noThanks);
        setStagedReview1(r.staged.review1);
        setStagedReview2(r.staged.review2);
        setStagedReview3(r.staged.review3);
        setStagedReview4(r.staged.review4);
        setStagedReview5(r.staged.review5);
        setResultsMode(r.config.resultsMode ?? "actual");
      }
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Couldn't load results.");
    } finally {
      setResultsLoading(false);
    }
  }

  useEffect(() => {
    if (adminToken && liveSession.id) refreshResults(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adminToken, liveSession.id]);

  useEffect(() => {
    if (!adminToken || !liveSession.id) return;
    // Poll regardless of which tab is open, so live numbers on Presentation
    // Control stay fresh even if you never click into Private Results. Does
    // NOT sync config/toggle state — see refreshResults' syncConfig note.
    const interval = setInterval(() => refreshResults(false), 5000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adminToken, liveSession.id]);

  async function handleCreateSession() {
    if (!adminToken) return;
    setBusy(true);
    setActionError(null);
    try {
      await api.createSession({ adminToken });
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Couldn't create a session.");
    } finally {
      setBusy(false);
    }
  }

  async function handleSetStage(stage: string, revealStep?: number) {
    if (!adminToken || !liveSession.id) return;
    setBusy(true);
    setActionError(null);
    try {
      await api.setStage({ adminToken, sessionId: liveSession.id, stage, revealStep });
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Couldn't change the stage.");
    } finally {
      setBusy(false);
    }
  }

  async function handleSaveConfig() {
    if (!adminToken || !liveSession.id) return;
    setConfigSaving(true);
    setActionError(null);
    setConfigSaved(false);
    try {
      await api.saveConfig({ adminToken, sessionId: liveSession.id, prizes, freeSpins, purchaseEnabled });
      setConfigSaved(true);
      setTimeout(() => setConfigSaved(false), 2500);
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Couldn't save settings.");
    } finally {
      setConfigSaving(false);
    }
  }

  async function handleSaveResultsDisplay() {
    if (!adminToken || !liveSession.id) return;
    setResultsModeSaving(true);
    setActionError(null);
    try {
      await api.setResultsMode({ adminToken, sessionId: liveSession.id, mode: resultsMode });
      if (resultsMode === "staged") {
        await api.setStagedResults({
          adminToken,
          sessionId: liveSession.id,
          buyMore: stagedBuyMore,
          noThanks: stagedNoThanks,
          review1: stagedReview1,
          review2: stagedReview2,
          review3: stagedReview3,
          review4: stagedReview4,
          review5: stagedReview5,
        });
      }
      await refreshResults(true);
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Couldn't save results display setting.");
    } finally {
      setResultsModeSaving(false);
    }
  }

  function openPresenterView() {
    window.open(`${window.location.origin}/display`, "_blank", "noopener,noreferrer");
  }

  async function handleReset() {
    if (!adminToken || !liveSession.id) return;
    if (!window.confirm("Start a brand-new session? Current participants will need to rejoin.")) return;
    setBusy(true);
    setActionError(null);
    try {
      await api.resetSession({ adminToken, sessionId: liveSession.id });
      setResults(null);
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Couldn't reset the session.");
    } finally {
      setBusy(false);
    }
  }

  const weightTotal = useMemo(() => prizes.reduce((s, p) => s + p.weight, 0), [prizes]);

  if (authLoading) {
    return <div className="min-h-screen flex items-center justify-center text-matcha-600">Loading…</div>;
  }

  if (!adminToken) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-cream-50 via-peach-100 to-mint-100 px-6">
        <Card className="max-w-sm w-full animate-pop-in">
          <div className="flex justify-center mb-4">
            <Logo size={56} />
          </div>
          <h1 className="font-display text-xl font-bold text-matcha-800 text-center mb-1">Admin Login</h1>
          <p className="text-sm text-matcha-500 text-center mb-5">Sign in with your Supabase admin account.</p>
          {!SUPABASE_CONFIGURED && (
            <p className="text-sm text-blossom-600 mb-4 text-center">
              Supabase isn't configured yet — set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.
            </p>
          )}
          <form onSubmit={handleLogin} className="space-y-3">
            <input
              type="email"
              required
              placeholder="you@example.com"
              value={loginEmail}
              onChange={(e) => setLoginEmail(e.target.value)}
              className="w-full rounded-xl border-2 border-cream-200 px-4 py-3 focus:outline-none focus:border-matcha-400"
            />
            <input
              type="password"
              required
              placeholder="Password"
              value={loginPassword}
              onChange={(e) => setLoginPassword(e.target.value)}
              className="w-full rounded-xl border-2 border-cream-200 px-4 py-3 focus:outline-none focus:border-matcha-400"
            />
            {loginError && <p className="text-sm text-blossom-600">{loginError}</p>}
            <Button type="submit" loading={loggingIn} className="w-full">
              Sign In
            </Button>
          </form>
        </Card>
      </div>
    );
  }

  const TABS: { id: Tab; label: string; icon: JSX.Element }[] = [
    { id: "session", label: "Session", icon: <Users className="h-4 w-4" /> },
    { id: "control", label: "Presentation Control", icon: <PlayCircle className="h-4 w-4" /> },
    { id: "spin", label: "Lucky Spin Settings", icon: <Settings2 className="h-4 w-4" /> },
    { id: "results", label: "Private Results", icon: <BarChart3 className="h-4 w-4" /> },
    { id: "audio", label: "Audio", icon: <Volume2 className="h-4 w-4" /> },
    { id: "reset", label: "Session Reset", icon: <RotateCcw className="h-4 w-4" /> },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-cream-50 via-peach-100 to-mint-100">
      <AudioControls />
      <header className="flex items-center justify-between px-6 py-4 bg-white/70 backdrop-blur-sm border-b border-cream-200">
        <div className="flex items-center gap-3">
          <Logo size={36} />
          <span className="font-display font-bold text-matcha-800">NEAL TEA Admin</span>
        </div>
        <div className="flex items-center gap-3 text-sm text-matcha-500">
          {liveSession.id && (
            <Button size="sm" variant="secondary" icon={<Monitor className="h-4 w-4" />} onClick={openPresenterView}>
              Open Presenter View
            </Button>
          )}
          <span>{adminEmail}</span>
          <button onClick={handleLogout} className="flex items-center gap-1 text-matcha-600 hover:text-matcha-800">
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </div>
      </header>

      <div className="flex max-w-6xl mx-auto">
        <nav className="w-60 shrink-0 p-4 space-y-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`w-full flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold transition-colors ${
                tab === t.id ? "bg-matcha-600 text-cream-50" : "text-matcha-700 hover:bg-cream-100"
              }`}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </nav>

        <main className="flex-1 p-6">
          {actionError && (
            <div className="mb-4 flex items-center gap-2 rounded-xl bg-blossom-100 text-blossom-700 px-4 py-3 text-sm">
              <AlertTriangle className="h-4 w-4" /> {actionError}
            </div>
          )}

          {tab === "session" && (
            <Card>
              <h2 className="font-display text-lg font-bold text-matcha-800 mb-4">Session</h2>
              {!liveSession.id ? (
                <div className="text-center py-8">
                  <p className="text-matcha-600 mb-4">No session is currently active.</p>
                  <Button onClick={handleCreateSession} loading={busy} icon={<PlayCircle className="h-4 w-4" />}>
                    Start New Session
                  </Button>
                </div>
              ) : (
                <div className="space-y-3 text-sm text-matcha-700">
                  <p>
                    <strong>Session ID:</strong> <span className="font-mono text-xs">{liveSession.id}</span>
                  </p>
                  <p>
                    <strong>Current stage:</strong> {STAGES.find((s) => s.id === liveSession.stage)?.label}
                  </p>
                  <p>
                    <strong>Participants:</strong> {results?.participantCount ?? "—"}
                  </p>
                  <p className="text-xs text-matcha-400">
                    Students join at <span className="font-mono">/join</span> — no code needed, there's only ever one
                    active session.
                  </p>
                </div>
              )}
            </Card>
          )}

          {tab === "control" && (
            <div className="space-y-4">
              {liveSession.id && results && (
                <Card padded={false} className="px-5 py-4 grid grid-cols-3 gap-4 text-center text-sm">
                  <div>
                    <div className="text-xs text-matcha-400 uppercase tracking-wide">Participants</div>
                    <div className="font-display text-xl font-extrabold text-matcha-800">{results.participantCount}</div>
                  </div>
                  <div>
                    <div className="text-xs text-matcha-400 uppercase tracking-wide">Avg rating</div>
                    <div className="font-display text-xl font-extrabold text-matcha-800">
                      {results.reviews.total ? `${results.reviews.average} ★` : "—"}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-matcha-400 uppercase tracking-wide">Spins so far</div>
                    <div className="font-display text-xl font-extrabold text-matcha-800">{results.spins.total}</div>
                  </div>
                </Card>
              )}

              <Card>
                <h2 className="font-display text-lg font-bold text-matcha-800 mb-4">Presentation Control</h2>
                {!liveSession.id ? (
                  <p className="text-matcha-500">Start a session first.</p>
                ) : (
                  <div className="space-y-3">
                    {STAGES.map((s) => (
                      <button
                        key={s.id}
                        onClick={() => handleSetStage(s.id)}
                        disabled={busy}
                        className={`w-full flex items-center justify-between px-5 py-4 rounded-2xl border-2 transition-colors ${
                          liveSession.stage === s.id
                            ? "border-matcha-500 bg-matcha-50"
                            : "border-cream-200 hover:border-matcha-300"
                        }`}
                      >
                        <span className="font-semibold text-matcha-800">{s.label}</span>
                        <ChevronRight className="h-4 w-4 text-matcha-400" />
                      </button>
                    ))}

                    {liveSession.stage === "ethical_reveal" && (
                      <div className="mt-4 pt-4 border-t border-cream-200">
                        <p className="text-sm font-semibold text-matcha-700 mb-2">Reveal step</p>
                        <div className="flex gap-2">
                          {[0, 1, 2].map((step) => (
                            <button
                              key={step}
                              onClick={() => handleSetStage("ethical_reveal", step)}
                              className={`flex-1 py-2 rounded-xl border-2 text-sm font-semibold ${
                                liveSession.revealStep === step
                                  ? "border-matcha-500 bg-matcha-50"
                                  : "border-cream-200"
                              }`}
                            >
                              {step}
                            </button>
                          ))}
                        </div>
                        <p className="text-xs text-matcha-400 mt-2">
                          0 = message only · 1 = + real odds · 2 = final takeaway
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </Card>

              {liveSession.id && (
                <Card>
                  <h3 className="font-semibold text-matcha-800 mb-2">Results shown to class</h3>
                  <p className="text-xs text-matcha-500 mb-3">
                    Controls BOTH the star-rating Reviews and the purchase-decision numbers shown at "Review
                    Results", "Lucky Spin Results", and later in the Ethical Reveal — either your class's real
                    numbers, or a set of numbers you enter yourself. One switch covers both.
                  </p>
                  <div className="flex gap-2 mb-3">
                    <button
                      onClick={() => setResultsMode("actual")}
                      className={`flex-1 py-2 rounded-xl border-2 text-sm font-semibold ${
                        resultsMode === "actual" ? "border-matcha-500 bg-matcha-50 text-matcha-800" : "border-cream-200 text-matcha-600"
                      }`}
                    >
                      Actual
                    </button>
                    <button
                      onClick={() => setResultsMode("staged")}
                      className={`flex-1 py-2 rounded-xl border-2 text-sm font-semibold ${
                        resultsMode === "staged" ? "border-matcha-500 bg-matcha-50 text-matcha-800" : "border-cream-200 text-matcha-600"
                      }`}
                    >
                      Staged
                    </button>
                  </div>

                  {resultsMode === "staged" && (
                    <div className="space-y-3 mb-3">
                      <div>
                        <p className="text-sm font-semibold text-matcha-700 mb-2">Reviews (how many of each rating)</p>
                        <div className="flex items-center gap-3 flex-wrap">
                          {([
                            [1, stagedReview1, setStagedReview1],
                            [2, stagedReview2, setStagedReview2],
                            [3, stagedReview3, setStagedReview3],
                            [4, stagedReview4, setStagedReview4],
                            [5, stagedReview5, setStagedReview5],
                          ] as const).map(([star, value, setValue]) => (
                            <div key={star} className="flex items-center gap-1">
                              <label className="text-sm text-matcha-700">{star}★</label>
                              <input
                                type="number"
                                min={0}
                                value={value}
                                onChange={(e) => setValue(Number(e.target.value))}
                                className="w-16 rounded-lg border-2 border-cream-200 px-2 py-1 text-sm"
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-matcha-700 mb-2">Purchase decisions</p>
                        <div className="flex items-center gap-3 flex-wrap">
                          <label className="text-sm text-matcha-700">Buy more</label>
                          <input
                            type="number"
                            min={0}
                            value={stagedBuyMore}
                            onChange={(e) => setStagedBuyMore(Number(e.target.value))}
                            className="w-20 rounded-lg border-2 border-cream-200 px-2 py-1 text-sm"
                          />
                          <label className="text-sm text-matcha-700">No thanks</label>
                          <input
                            type="number"
                            min={0}
                            value={stagedNoThanks}
                            onChange={(e) => setStagedNoThanks(Number(e.target.value))}
                            className="w-20 rounded-lg border-2 border-cream-200 px-2 py-1 text-sm"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  <Button size="sm" variant="secondary" onClick={handleSaveResultsDisplay} loading={resultsModeSaving}>
                    Save
                  </Button>
                </Card>
              )}

              {liveSession.id && results && (
                <Card>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-matcha-800">Live results</h3>
                    <Button size="sm" variant="ghost" onClick={() => refreshResults(false)} loading={resultsLoading}>
                      Refresh
                    </Button>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-4 text-sm">
                    <div className="rounded-xl bg-cream-50 p-4">
                      <h4 className="font-semibold text-matcha-800 mb-2">Reviews</h4>
                      <p>Total: {results.reviews.total}</p>
                      <p>Average: {results.reviews.average} ★</p>
                      <p>5★: {results.reviews.fiveStarPct}%</p>
                    </div>
                    <div className="rounded-xl bg-cream-50 p-4">
                      <h4 className="font-semibold text-matcha-800 mb-2">Purchase decisions</h4>
                      <p>Offered: {results.purchases.offered}</p>
                      <p>Buy more: {results.purchases.buyMore} ({results.purchases.buyMorePct}%)</p>
                      <p>No thanks: {results.purchases.noThanks} ({results.purchases.noThanksPct}%)</p>
                      <p>Pending: {results.purchases.pending}</p>
                    </div>
                  </div>
                </Card>
              )}
            </div>
          )}

          {tab === "spin" && (
            <Card>
              <h2 className="font-display text-lg font-bold text-matcha-800 mb-1">Lucky Spin Settings</h2>
              {results?.config?.locked && (
                <p className="text-sm text-caramel-600 mb-3">
                  Locked — a real spin has already happened this session. Reset to change odds.
                </p>
              )}
              <div className="space-y-3 my-4">
                {prizes.map((p, i) => (
                  <div key={p.id} className="flex items-center gap-3">
                    <span className="w-36 text-sm text-matcha-700 truncate">{p.label}</span>
                    <input
                      type="number"
                      min={0}
                      max={1000}
                      value={p.weight}
                      disabled={results?.config?.locked}
                      onChange={(e) => {
                        const v = Number(e.target.value);
                        setPrizes((prev) => prev.map((pr, idx) => (idx === i ? { ...pr, weight: v } : pr)));
                      }}
                      className="w-24 rounded-lg border-2 border-cream-200 px-2 py-1 text-sm disabled:opacity-50"
                    />
                    <span className="text-xs text-matcha-400">/ 1000 ({(p.weight / 10).toFixed(1)}%)</span>
                  </div>
                ))}
              </div>
              <p className={`text-sm font-semibold ${weightTotal === 1000 ? "text-matcha-600" : "text-blossom-600"}`}>
                Total: {(weightTotal / 10).toFixed(1)}% {weightTotal !== 1000 && "— must equal 100.0%"}
              </p>

              <div className="flex items-center gap-3 mt-4">
                <label className="text-sm text-matcha-700 font-semibold">Free spins per participant</label>
                <input
                  type="number"
                  min={1}
                  max={5}
                  value={freeSpins}
                  disabled={results?.config?.locked}
                  onChange={(e) => setFreeSpins(Number(e.target.value))}
                  className="w-20 rounded-lg border-2 border-cream-200 px-2 py-1 text-sm disabled:opacity-50"
                />
              </div>

              <label className="flex items-center gap-2 mt-4 text-sm text-matcha-700 font-semibold">
                <input
                  type="checkbox"
                  checked={purchaseEnabled}
                  onChange={(e) => setPurchaseEnabled(e.target.checked)}
                  disabled={results?.config?.locked}
                />
                Offer "one more spin" after free spins run out
              </label>

              <Button
                onClick={handleSaveConfig}
                loading={configSaving}
                disabled={results?.config?.locked || weightTotal !== 1000}
                icon={<Save className="h-4 w-4" />}
                className="mt-5"
              >
                {configSaved ? "Saved!" : "Save Settings"}
              </Button>
            </Card>
          )}

          {tab === "results" && (
            <Card>
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-display text-lg font-bold text-matcha-800">Private Results</h2>
                <Button size="sm" variant="ghost" onClick={() => refreshResults(false)} loading={resultsLoading}>
                  Refresh
                </Button>
              </div>
              <p className="text-xs text-matcha-500 mb-4">
                This same data now also shows live on the Presentation Control tab, so you don't need to switch
                over here while running a session — this tab is here for a closer look if you want it.
              </p>
              {!results ? (
                <p className="text-matcha-500">No data yet.</p>
              ) : (
                <div className="grid sm:grid-cols-2 gap-4 text-sm">
                  <div className="rounded-xl bg-cream-50 p-4">
                    <h3 className="font-semibold text-matcha-800 mb-2">Reviews</h3>
                    <p>Total: {results.reviews.total}</p>
                    <p>Average: {results.reviews.average} ★</p>
                    <p>5★: {results.reviews.fiveStarPct}%</p>
                  </div>
                  <div className="rounded-xl bg-cream-50 p-4">
                    <h3 className="font-semibold text-matcha-800 mb-2">Purchase decisions</h3>
                    <p>Offered: {results.purchases.offered}</p>
                    <p>Buy more: {results.purchases.buyMore} ({results.purchases.buyMorePct}%)</p>
                    <p>No thanks: {results.purchases.noThanks} ({results.purchases.noThanksPct}%)</p>
                    <p>Pending: {results.purchases.pending}</p>
                  </div>
                  <div className="rounded-xl bg-cream-50 p-4 sm:col-span-2">
                    <h3 className="font-semibold text-matcha-800 mb-2">Spins</h3>
                    <p>Total: {results.spins.total} (free: {results.spins.byType.free}, extra: {results.spins.byType.extra})</p>
                    <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {Object.entries(results.spins.prizeDistribution).map(([id, count]) => (
                        <div key={id} className="text-xs">
                          <span className="text-matcha-500">{id}:</span> <strong>{count as number}</strong>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </Card>
          )}

          {tab === "audio" && (
            <Card>
              <h2 className="font-display text-lg font-bold text-matcha-800 mb-4">Audio</h2>
              <p className="text-sm text-matcha-500 mb-4">
                Use the speaker icon in the bottom-right corner on any page (including this one and the projector
                view) to toggle music, sound effects, and volume. Each device controls its own audio locally.
              </p>
            </Card>
          )}

          {tab === "reset" && (
            <Card>
              <h2 className="font-display text-lg font-bold text-matcha-800 mb-2">Session Reset</h2>
              <p className="text-sm text-matcha-500 mb-4">
                Starts a brand-new session. Past participants, reviews, spins and purchase decisions stay recorded
                under the old session id — nothing is deleted, but everyone will need to rejoin and start over.
              </p>
              <Button variant="danger" onClick={handleReset} loading={busy} icon={<RotateCcw className="h-4 w-4" />}>
                Reset Session
              </Button>
            </Card>
          )}
        </main>
      </div>
    </div>
  );
}
