import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext.jsx";

export default function ProtectedRoute({ children, role }) {
  const { isAuth, user } = useAuth();
  const location = useLocation();

  if (!isAuth) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (role && user?.role !== role) {
    const home = user?.role === "recruiter" ? "/recruiter" : "/dashboard";
    return <Navigate to={home} replace />;
  }

  return children;
}
