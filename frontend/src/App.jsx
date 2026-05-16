import { Routes, Route, Navigate } from "react-router-dom";
import ProfilePage from "./pages/ProfilePage.jsx";
import ExplorePage from "./pages/ExplorePage.jsx";

export default function App() {
  return (
    <Routes>
      <Route path="/"                            element={<ExplorePage />} />
      <Route path="/explore"                     element={<ExplorePage />} />
      <Route path="/profile/:githubUsername"     element={<ProfilePage />} />
    </Routes>
  );
}
