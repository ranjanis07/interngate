import { useAuth } from "../context/AuthContext";
import StudentDashboard from "./StudentDashboard";
import AdminDashboard from "./AdminDashboard";
import FacultyDashboard from "./FacultyDashboard";

export default function Dashboard() {
  const { role } = useAuth();
  if (role === "admin") return <AdminDashboard />;
  if (role === "faculty") return <FacultyDashboard />;
  return <StudentDashboard />;
}
