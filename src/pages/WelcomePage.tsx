import { Link } from "react-router-dom";
import { ArrowRight, ShieldCheck } from "lucide-react";
import Logo from "../components/branding/Logo";
import BubbleField from "../components/branding/BubbleField";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";

export default function WelcomePage() {
  return (
    <div className="relative min-h-screen bg-gradient-to-br from-cream-50 via-peach-100 to-mint-100 overflow-hidden">
      <BubbleField />
      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-6 py-16">
        <div className="mb-8 animate-pop-in">
          <Logo size={88} />
        </div>
        <h1 className="font-display text-4xl sm:text-5xl font-extrabold text-matcha-800 text-center mb-3">
          NEAL<span className="text-blossom-500">TEA</span>
        </h1>
        <p className="text-matcha-600 text-center max-w-md mb-10">
          A live, in-classroom experience about reviews, rewards, and the Lucky Spin —
          and why all three deserve a second look.
        </p>

        <div className="grid sm:grid-cols-2 gap-5 w-full max-w-xl">
          <Card className="flex flex-col items-start gap-3">
            <h2 className="font-display text-xl font-bold text-matcha-800">I'm joining the class</h2>
            <p className="text-sm text-matcha-600">
              Enter a nickname and play along from your own device — reviews, Lucky Spin, the works.
            </p>
            <Link to="/join" className="w-full">
              <Button className="w-full mt-2" icon={<ArrowRight className="h-4 w-4" />}>
                Join the Session
              </Button>
            </Link>
          </Card>

          <Card className="flex flex-col items-start gap-3">
            <h2 className="font-display text-xl font-bold text-matcha-800">I'm running the session</h2>
            <p className="text-sm text-matcha-600">
              Instructor controls: start/reset the session, manage the reveal, and watch results live.
            </p>
            <Link to="/admin" className="w-full">
              <Button variant="secondary" className="w-full mt-2" icon={<ShieldCheck className="h-4 w-4" />}>
                Admin Login
              </Button>
            </Link>
          </Card>
        </div>

        <p className="text-xs text-matcha-400 mt-10 text-center max-w-sm">
          Running the projector view? Open <span className="font-mono">/display</span> on the
          classroom screen — it follows the session automatically.
        </p>
      </div>
    </div>
  );
}
