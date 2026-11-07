import { Link } from "react-router-dom";
import Logo from "../components/branding/Logo";
import Button from "../components/ui/Button";

export default function NotFoundPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-cream-50 via-peach-100 to-mint-100 px-6">
      <div className="text-center">
        <div className="flex justify-center mb-6">
          <Logo size={72} />
        </div>
        <h1 className="font-display text-3xl font-extrabold text-matcha-800 mb-2">Page not found</h1>
        <p className="text-matcha-600 mb-6">This cup hasn't been brewed yet.</p>
        <Link to="/">
          <Button>Back to NEAL TEA</Button>
        </Link>
      </div>
    </div>
  );
}
