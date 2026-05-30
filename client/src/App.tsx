import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { HomePage } from "./pages/HomePage";
import { LoginPage } from "./pages/LoginPage";
import { ProfilePage } from "./pages/ProfilePage";
import { RegisterPage } from "./pages/RegisterPage";
import { RoomPage } from "./pages/RoomPage";
import { RoomTeamPage } from "./pages/RoomTeamPage";
import { SummaryPage } from "./pages/SummaryPage";
import { WelcomePage } from "./pages/WelcomePage";
import { WorkshopPage } from "./pages/WorkshopPage";
import { MessagesPage } from "./pages/MessagesPage";

export default function App() {
  const location = useLocation();

  return (
    <Routes location={location} key={`${location.pathname}${location.search}`}>
      <Route path="/" element={<WelcomePage />} />
      <Route path="/home" element={<HomePage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/profile" element={<ProfilePage />} />
      <Route path="/workshop" element={<WorkshopPage />} />
      <Route path="/messages" element={<MessagesPage />} />
      <Route path="/messages/:chatId" element={<MessagesPage />} />
      <Route path="/r/:slug/summary" element={<SummaryPage />} />
      <Route path="/r/:slug/team" element={<RoomTeamPage />} />
      <Route path="/r/:slug" element={<RoomPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
