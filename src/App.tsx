import { Routes, Route } from "react-router-dom";
import WelcomePage from "./pages/WelcomePage";
import JoinPage from "./pages/JoinPage";
import AdminPage from "./pages/AdminPage";
import DisplayPage from "./pages/DisplayPage";
import NotFoundPage from "./pages/NotFoundPage";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<WelcomePage />} />
      <Route path="/join" element={<JoinPage />} />
      <Route path="/admin" element={<AdminPage />} />
      <Route path="/display" element={<DisplayPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
