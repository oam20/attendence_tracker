import React, { useState, useEffect, useMemo } from "react";
import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Calendar, 
  Users, 
  LogOut, 
  ChevronLeft, 
  ChevronRight, 
  Search, 
  UserCheck, 
  UserX, 
  SlidersHorizontal, 
  Sparkles, 
  Download, 
  UserMinus, 
  ShieldAlert, 
  RefreshCw,
  Plus,
  FileSpreadsheet,
  Printer
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

// Types
interface User {
  id: string;
  firstName: string;
  createdAt: string;
}

interface AttendanceRecord {
  id: string;
  userId: string;
  firstName: string;
  timestamp: string;
  date: string;
}

const DEFAULT_PRESET_STUDENTS = [
  "Jay Khetani",
  "Harshpreet Kaur",
  "Jenil Saliya",
  "Dhruv Chotai",
  "Nemin Mehul Haria",
  "Yash Sunil Baldania",
  "Avinash Bhaveshbhai Savaliya",
  "Prem Jani",
  "Harshvi Maheshbhai Sorathiya",
  "Dikshita Keyur Kothari",
  "Vraj Parmar",
  "Vaishali Solanki",
  "Kirtan Soni",
  "Khushi Magnani",
  "Hemil Patel",
  "Tirth Patel",
  "Hemil Desai",
  "Oam Mistry"
];

const getLocalDateString = (d: Date = new Date()) => {
  const offset = d.getTimezoneOffset();
  const localDate = new Date(d.getTime() - (offset * 60 * 1000));
  return localDate.toISOString().split("T")[0];
};

const formatTime = (isoString: string) => {
  const d = new Date(isoString);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
};

const formatDateFriendly = (dateStr: string) => {
  if (!dateStr) return "";
  const [year, month, day] = dateStr.split("-").map(Number);
  // create date using local timezone to avoid UTC shift
  const d = new Date(year, month - 1, day);
  return d.toLocaleDateString([], { weekday: "long", month: "short", day: "numeric", year: "numeric" });
};

export default function App() {
  // Authentication & Session state
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem("attendance_user");
    return saved ? JSON.parse(saved) : null;
  });

  // State
  const [firstNameInput, setFirstNameInput] = useState("");
  const [selectedDate, setSelectedDate] = useState<string>(getLocalDateString());
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [attendanceToday, setAttendanceToday] = useState<AttendanceRecord[]>([]);
  const [allAttendance, setAllAttendance] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // Live clock state
  const [currentTime, setCurrentTime] = useState(new Date());

  // Admin states
  const [adminMode, setAdminMode] = useState(false);
  const [adminPin, setAdminPin] = useState("");
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(() => {
    return localStorage.getItem("attendance_admin_auth") === "true";
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [activeAdminTab, setActiveAdminTab] = useState<"roster" | "logs">("roster");
  const [newStudentName, setNewStudentName] = useState("");
  const [bulkInputText, setBulkInputText] = useState("");
  const [showBulkForm, setShowBulkForm] = useState(false);
  const [adminSuccessMessage, setAdminSuccessMessage] = useState("");
  const [adminErrorMessage, setAdminErrorMessage] = useState("");
  
  // Custom Session States
  const [sessionName, setSessionName] = useState("Enterprise Training Session");
  const [sessionInputName, setSessionInputName] = useState("Enterprise Training Session");

  // Fetch initial data
  useEffect(() => {
    fetchUsers();
    fetchAttendanceToday();
    fetchAttendanceHistory();
    fetchSessionName();
    
    // Live clock interval
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Sync today's attendance when date changes
  useEffect(() => {
    fetchAttendanceToday();
  }, [selectedDate]);

  // API Fetches
  const fetchUsers = async () => {
    try {
      const res = await fetch("/api/users");
      if (res.ok) {
        const data = await res.json();
        setAllUsers(data);
      }
    } catch (err) {
      console.error("Error fetching users", err);
    }
  };

  const fetchAttendanceToday = async () => {
    try {
      const res = await fetch(`/api/attendance/today?date=${selectedDate}`);
      if (res.ok) {
        const data = await res.json();
        setAttendanceToday(data);
      }
    } catch (err) {
      console.error("Error fetching today's attendance", err);
    }
  };

  const fetchAttendanceHistory = async () => {
    try {
      const res = await fetch("/api/attendance/history");
      if (res.ok) {
        const data = await res.json();
        setAllAttendance(data);
      }
    } catch (err) {
      console.error("Error fetching attendance history", err);
    }
  };

  const fetchSessionName = async () => {
    try {
      const res = await fetch("/api/session");
      if (res.ok) {
        const data = await res.json();
        setSessionName(data.sessionName);
        setSessionInputName(data.sessionName);
      }
    } catch (err) {
      console.error("Error fetching session name", err);
    }
  };

  const handleUpdateSessionName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sessionInputName.trim()) return;

    setAdminErrorMessage("");
    setAdminSuccessMessage("");

    try {
      const res = await fetch("/api/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionName: sessionInputName.trim() }),
      });

      const data = await res.json();
      if (res.ok) {
        setSessionName(data.sessionName);
        setAdminSuccessMessage(`Session name updated to "${data.sessionName}" successfully!`);
      } else {
        setAdminErrorMessage(data.error || "Failed to update session name.");
      }
    } catch (err) {
      setAdminErrorMessage("Network error. Could not connect to server.");
    }
  };

  // Student Actions
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstNameInput.trim()) return;

    setLoading(true);
    setErrorMessage("");
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ firstName: firstNameInput.trim() }),
      });

      const data = await res.json();
      if (res.ok) {
        setCurrentUser(data.user);
        localStorage.setItem("attendance_user", JSON.stringify(data.user));
        setFirstNameInput("");
        fetchUsers();
      } else {
        setErrorMessage(data.error || "Failed to join session.");
      }
    } catch (err) {
      setErrorMessage("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem("attendance_user");
  };

  const handleMarkPresent = async () => {
    if (!currentUser) return;
    setLoading(true);
    setErrorMessage("");
    setSuccessMessage("");

    const todayStr = getLocalDateString();
    try {
      const res = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: currentUser.id, date: todayStr }),
      });

      const data = await res.json();
      if (res.ok) {
        setSuccessMessage("Status updated to Present! Keep up the great work.");
        fetchAttendanceToday();
        fetchAttendanceHistory();
      } else {
        setErrorMessage(data.error || "Failed to mark present.");
      }
    } catch (err) {
      setErrorMessage("Network error. Could not connect to server.");
    } finally {
      setLoading(false);
    }
  };

  // Admin Actions
  const handleAdminVerify = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminPin === "1234") {
      setIsAdminAuthenticated(true);
      localStorage.setItem("attendance_admin_auth", "true");
      setAdminPin("");
      setErrorMessage("");
    } else {
      setErrorMessage("Invalid PIN. Please try again (Hint: 1234).");
    }
  };

  const handleAdminLogout = () => {
    setIsAdminAuthenticated(false);
    localStorage.removeItem("attendance_admin_auth");
  };

  const handleToggleAttendance = async (userId: string) => {
    try {
      const res = await fetch("/api/admin/attendance/toggle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, date: selectedDate }),
      });

      if (res.ok) {
        fetchAttendanceToday();
        fetchAttendanceHistory();
      }
    } catch (err) {
      console.error("Error toggling attendance", err);
    }
  };

  const handleSetAttendance = async (userId: string, status: "present" | "absent") => {
    try {
      const res = await fetch("/api/admin/attendance/set", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, date: selectedDate, status }),
      });

      if (res.ok) {
        fetchAttendanceToday();
        fetchAttendanceHistory();
      }
    } catch (err) {
      console.error("Error setting attendance", err);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!window.confirm("Are you sure you want to delete this attendee and their entire history?")) return;

    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        if (currentUser?.id === userId) {
          handleLogout();
        }
        fetchUsers();
        fetchAttendanceToday();
        fetchAttendanceHistory();
      }
    } catch (err) {
      console.error("Error deleting user", err);
    }
  };

  const handleDeleteRecord = async (recordId: string) => {
    try {
      const res = await fetch(`/api/attendance/${recordId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        fetchAttendanceToday();
        fetchAttendanceHistory();
      }
    } catch (err) {
      console.error("Error deleting record", err);
    }
  };

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudentName.trim()) return;

    setAdminErrorMessage("");
    setAdminSuccessMessage("");

    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ firstName: newStudentName.trim() }),
      });

      const data = await res.json();
      if (res.ok) {
        setAdminSuccessMessage(`Student "${newStudentName.trim()}" successfully added!`);
        setNewStudentName("");
        fetchUsers();
      } else {
        setAdminErrorMessage(data.error || "Failed to add student.");
      }
    } catch (err) {
      setAdminErrorMessage("Network error. Could not connect to server.");
    }
  };

  const handleBulkImport = async () => {
    const lines = bulkInputText
      .split("\n")
      .map(line => line.trim())
      .filter(line => line.length > 0);

    if (lines.length === 0) {
      setAdminErrorMessage("Please enter at least one student name to import.");
      return;
    }

    setAdminErrorMessage("");
    setAdminSuccessMessage("");

    try {
      const res = await fetch("/api/admin/users/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ names: lines }),
      });

      const data = await res.json();
      if (res.ok) {
        let msg = `Successfully imported ${data.addedCount} student(s).`;
        if (data.skippedCount > 0) {
          msg += ` (${data.skippedCount} skipped as they already exist)`;
        }
        setAdminSuccessMessage(msg);
        setBulkInputText("");
        setShowBulkForm(false);
        fetchUsers();
      } else {
        setAdminErrorMessage(data.error || "Failed to bulk import students.");
      }
    } catch (err) {
      setAdminErrorMessage("Network error. Could not connect to server.");
    }
  };

  const handleImportPresetList = async () => {
    setAdminErrorMessage("");
    setAdminSuccessMessage("");

    try {
      const res = await fetch("/api/admin/users/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ names: DEFAULT_PRESET_STUDENTS }),
      });

      const data = await res.json();
      if (res.ok) {
        let msg = `Successfully imported ${data.addedCount} preset student(s).`;
        if (data.skippedCount > 0) {
          msg += ` (${data.skippedCount} skipped as duplicates)`;
        }
        setAdminSuccessMessage(msg);
        fetchUsers();
      } else {
        setAdminErrorMessage(data.error || "Failed to import preset list.");
      }
    } catch (err) {
      setAdminErrorMessage("Network error. Could not connect to server.");
    }
  };

  const handleExportExcel = () => {
    if (allUsers.length === 0) {
      alert("No students registered to export.");
      return;
    }

    const headers = ["Student Name", "Attendance Status", "Session Date", "Check-In Time"];
    
    const rows = allUsers.map(user => {
      const isPresent = attendanceToday.some(a => a.userId === user.id);
      const record = attendanceToday.find(a => a.userId === user.id);
      const checkInTime = record ? new Date(record.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : "N/A";
      
      return [
        user.firstName,
        isPresent ? "Present" : "Absent",
        selectedDate,
        checkInTime
      ];
    });

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" 
      + [headers.join(","), ...rows.map(e => e.map(val => `"${val}"`).join(","))].join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${sessionName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_roster_${selectedDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportPDF = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      alert("Please allow popups to export or print PDF.");
      return;
    }

    const presentList = allUsers.filter(u => attendanceToday.some(a => a.userId === u.id));
    const absentList = allUsers.filter(u => !attendanceToday.some(a => a.userId === u.id));

    printWindow.document.write(`
      <html>
        <head>
          <title>Attendance Report - ${selectedDate}</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #1e293b; padding: 40px; }
            h1 { font-size: 28px; margin: 0; font-weight: 800; text-transform: uppercase; letter-spacing: -0.5px; color: #0f172a; }
            .header { border-bottom: 2px solid #e2e8f0; padding-bottom: 20px; margin-bottom: 30px; }
            .meta-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-bottom: 30px; }
            .meta-card { background: #f8fafc; border: 1px solid #f1f5f9; padding: 15px; border-radius: 12px; }
            .meta-label { font-size: 10px; font-weight: 800; text-transform: uppercase; color: #94a3b8; letter-spacing: 0.5px; }
            .meta-value { font-size: 18px; font-weight: 700; color: #0f172a; margin-top: 4px; }
            .section-title { font-size: 16px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 35px; margin-bottom: 12px; color: #4f46e5; border-bottom: 1px solid #f1f5f9; padding-bottom: 6px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            th { background: #f8fafc; text-align: left; padding: 10px 12px; font-size: 11px; font-weight: 800; text-transform: uppercase; color: #64748b; border-bottom: 2px solid #cbd5e1; }
            td { padding: 10px 12px; font-size: 12px; border-bottom: 1px solid #e2e8f0; color: #334155; }
            .status-tag { display: inline-block; padding: 3px 8px; font-size: 10px; font-weight: 700; text-transform: uppercase; border-radius: 6px; }
            .status-present { background: #d1fae5; color: #065f46; }
            .status-absent { background: #fee2e2; color: #991b1b; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Attendance Report</h1>
            <p style="margin: 5px 0 0 0; font-size: 14px; color: #64748b; font-weight: 500;">
              Session: <strong>${sessionName}</strong>
            </p>
          </div>

          <div class="meta-grid">
            <div class="meta-card">
              <div class="meta-label">Selected Date</div>
              <div class="meta-value">${selectedDate}</div>
            </div>
            <div class="meta-card">
              <div class="meta-label">Total Registered</div>
              <div class="meta-value">${allUsers.length} Users</div>
            </div>
            <div class="meta-card">
              <div class="meta-label">Attendance Rate</div>
              <div class="meta-value">${allUsers.length ? Math.round((presentList.length / allUsers.length) * 100) : 0}% (${presentList.length} Present)</div>
            </div>
          </div>

          <div class="section-title">Present Students (${presentList.length})</div>
          <table>
            <thead>
              <tr>
                <th style="width: 40%;">Name</th>
                <th style="width: 25%;">Status</th>
                <th style="width: 35%;">Check-In Time</th>
              </tr>
            </thead>
            <tbody>
              ${presentList.map(u => {
                const record = attendanceToday.find(a => a.userId === u.id);
                const checkInTime = record ? new Date(record.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A';
                return `
                  <tr>
                    <td><strong>${u.firstName}</strong></td>
                    <td><span class="status-tag status-present">Present</span></td>
                    <td>${checkInTime}</td>
                  </tr>
                `;
              }).join("")}
              ${presentList.length === 0 ? '<tr><td colspan="3" style="text-align: center; color: #94a3b8; padding: 20px;">No students present for this session.</td></tr>' : ''}
            </tbody>
          </table>

          <div class="section-title">Absent Students (${absentList.length})</div>
          <table>
            <thead>
              <tr>
                <th style="width: 45%;">Name</th>
                <th style="width: 55%;">Status</th>
              </tr>
            </thead>
            <tbody>
              ${absentList.map(u => `
                <tr>
                  <td><strong>${u.firstName}</strong></td>
                  <td><span class="status-tag status-absent">Absent</span></td>
                </tr>
              `).join("")}
              ${absentList.length === 0 ? '<tr><td colspan="2" style="text-align: center; color: #94a3b8; padding: 20px;">All registered students are present.</td></tr>' : ''}
            </tbody>
          </table>

          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Date controls
  const handlePrevDay = () => {
    const current = new Date(selectedDate);
    current.setDate(current.getDate() - 1);
    setSelectedDate(getLocalDateString(current));
  };

  const handleNextDay = () => {
    const current = new Date(selectedDate);
    current.setDate(current.getDate() + 1);
    setSelectedDate(getLocalDateString(current));
  };

  // Computed states
  const isCurrentUserPresentToday = useMemo(() => {
    if (!currentUser) return false;
    const todayStr = getLocalDateString();
    return allAttendance.some(
      (a) => a.userId === currentUser.id && a.date === todayStr
    );
  }, [currentUser, allAttendance]);

  const currentUserRecordToday = useMemo(() => {
    if (!currentUser) return null;
    const todayStr = getLocalDateString();
    return allAttendance.find(
      (a) => a.userId === currentUser.id && a.date === todayStr
    );
  }, [currentUser, allAttendance]);

  const personalStreakCount = useMemo(() => {
    if (!currentUser) return 0;
    // Count days present
    const userRecords = allAttendance.filter((a) => a.userId === currentUser.id);
    const uniqueDates = new Set(userRecords.map(r => r.date));
    return uniqueDates.size;
  }, [currentUser, allAttendance]);

  const filteredHistoryLogs = useMemo(() => {
    return allAttendance.filter(record => {
      const matchesSearch = record.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        record.date.includes(searchQuery);
      return matchesSearch;
    }).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [allAttendance, searchQuery]);

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 transition-all duration-300">
      
      {/* Top Header Bar */}
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-100 px-6 py-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 text-white p-2.5 rounded-xl shadow-md">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-display text-2xl font-black tracking-tight text-slate-900 leading-none">
                {sessionName}
              </h1>
              <p className="text-xs text-slate-500 mt-1 font-medium tracking-wide uppercase">
                Attendance Tracker
              </p>
            </div>
          </div>

          {/* Clock & Controls */}
          <div className="flex items-center gap-4 self-start md:self-auto">
            <div className="flex items-center gap-2 bg-slate-100 px-3.5 py-1.5 rounded-full border border-slate-200/60">
              <Clock className="w-4 h-4 text-slate-500 animate-pulse" />
              <span className="font-mono text-xs font-semibold text-slate-700">
                {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
            </div>

            {/* Quick Toggle for Admin */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setAdminMode(!adminMode);
                  setErrorMessage("");
                }}
                className={`px-4 py-1.5 rounded-xl text-xs font-bold tracking-wide transition-all duration-200 border cursor-pointer ${
                  adminMode 
                    ? "bg-slate-900 text-white border-slate-950 shadow-sm" 
                    : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                }`}
                id="admin-toggle-btn"
              >
                {adminMode ? "Student Portal" : "Admin Console"}
              </button>

              {currentUser && !adminMode && (
                <button
                  onClick={handleLogout}
                  className="p-1.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-all duration-150 cursor-pointer"
                  title="Logout"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

        </div>
      </header>

      {/* Main Grid Content */}
      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:py-12">
        <AnimatePresence mode="wait">
          
          {/* ================= ADMIN MODE ================= */}
          {adminMode ? (
            <motion.div
              key="admin-view"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.25 }}
              className="space-y-6"
            >
              
              {/* PIN AUTHENTICATION GRID CARD */}
              {!isAdminAuthenticated ? (
                <div className="max-w-md mx-auto bg-white border-2 border-slate-200 rounded-3xl shadow-sm p-8 mt-8">
                  <div className="text-center space-y-3 mb-6">
                    <div className="inline-flex p-3 bg-amber-50 rounded-2xl text-amber-600">
                      <ShieldAlert className="w-8 h-8" />
                    </div>
                    <h2 className="font-display text-2xl font-bold text-slate-900">
                      Admin Gate
                    </h2>
                    <p className="text-sm text-slate-500 leading-relaxed">
                      Enter the admin PIN to access dashboards, rosters, logs, and reporting tools.
                    </p>
                  </div>

                  <form onSubmit={handleAdminVerify} className="space-y-4">
                    <div>
                      <label className="block text-xs font-black uppercase text-slate-400 mb-2 ml-1">
                        PIN CODE
                      </label>
                      <input
                        type="password"
                        placeholder="••••"
                        value={adminPin}
                        onChange={(e) => setAdminPin(e.target.value)}
                        className="w-full text-center tracking-[0.6em] text-2xl font-bold px-4 py-3 bg-slate-100 border-2 border-transparent focus:border-indigo-500 outline-none transition-all rounded-2xl text-slate-800"
                        autoFocus
                      />
                      <p className="text-xs text-amber-600 font-semibold text-center mt-3">
                        * Default administrator PIN is <span className="font-mono bg-amber-100 px-1.5 py-0.5 rounded font-bold text-amber-800">1234</span>
                      </p>
                    </div>

                    {errorMessage && (
                      <div className="flex items-center gap-2 bg-rose-50 border border-rose-100 text-rose-700 p-3 rounded-xl text-xs font-semibold">
                        <XCircle className="w-4 h-4 shrink-0" />
                        <span>{errorMessage}</span>
                      </div>
                    )}

                    <button
                      type="submit"
                      className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold text-lg shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all cursor-pointer"
                    >
                      Authenticate Access
                    </button>
                  </form>
                </div>
              ) : (
                
                // MAIN ADMIN BENTO GRID
                <div className="space-y-6">
                  
                  {/* Title Bar Widget */}
                  <div className="bg-slate-900 text-white p-8 rounded-3xl flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm relative overflow-hidden">
                    <div className="z-10">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
                        <p className="text-xs text-indigo-300 font-bold uppercase tracking-widest">
                          Secured Workspace
                        </p>
                      </div>
                      <h2 className="font-display text-3xl font-black tracking-tight leading-none">
                        Administrator Hub
                      </h2>
                      <p className="text-sm text-slate-400 mt-2">
                        Manage active roster members, view chronological logs, and export reports.
                      </p>
                    </div>
                    
                    <button
                      onClick={handleAdminLogout}
                      className="z-10 self-start md:self-auto flex items-center gap-2 text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-4 py-2.5 rounded-xl font-bold transition-all cursor-pointer"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      Sign Out Admin
                    </button>

                    <div className="w-48 h-48 bg-indigo-500 rounded-full blur-[60px] absolute -right-8 -bottom-8 opacity-20"></div>
                  </div>

                  {/* Session Name Configuration Card (Bento style) */}
                  <div className="bg-white border-2 border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-pulse"></span>
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Current Active Session</span>
                      </div>
                      <h3 className="font-display font-black text-slate-900 text-lg tracking-tight leading-tight">
                        {sessionName}
                      </h3>
                    </div>
                    
                    <form onSubmit={handleUpdateSessionName} className="flex-1 max-w-md w-full flex gap-2">
                      <input
                        type="text"
                        placeholder="Update session name..."
                        value={sessionInputName}
                        onChange={(e) => setSessionInputName(e.target.value)}
                        className="flex-1 px-4 py-2.5 bg-slate-100 border-2 border-transparent focus:border-indigo-500 outline-none rounded-xl text-xs font-semibold text-slate-800 placeholder:text-slate-400"
                        maxLength={100}
                        required
                      />
                      <button
                        type="submit"
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm shadow-indigo-100 shrink-0"
                      >
                        Update
                      </button>
                    </form>
                  </div>

                  {/* Bento Metrics Row */}
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                    
                    {/* Metric 1 */}
                    <div className="md:col-span-4 bg-indigo-900 text-white p-6 rounded-3xl flex flex-col justify-between shadow-sm min-h-[140px]">
                      <span className="text-xs font-bold uppercase opacity-60 tracking-widest">Attendance Rate</span>
                      <div>
                        <div className="text-4xl font-black">
                          {allUsers.length ? Math.round((attendanceToday.length / allUsers.length) * 100) : 0}%
                        </div>
                        <div className="text-xs opacity-80 mt-1 font-medium">
                          {attendanceToday.length} of {allUsers.length} logged present
                        </div>
                      </div>
                    </div>

                    {/* Metric 2 */}
                    <div className="md:col-span-4 bg-emerald-500 text-white p-6 rounded-3xl flex flex-col justify-between shadow-sm min-h-[140px]">
                      <span className="text-xs font-bold uppercase opacity-75 tracking-widest">Present Today</span>
                      <div>
                        <div className="text-4xl font-black">{attendanceToday.length}</div>
                        <div className="text-xs opacity-90 mt-1 font-medium">
                          Checked-in on {formatDateFriendly(selectedDate).split(",")[1]?.trim()}
                        </div>
                      </div>
                    </div>

                    {/* Metric 3 */}
                    <div className="md:col-span-4 bg-slate-900 text-white p-6 rounded-3xl flex flex-col justify-between shadow-sm min-h-[140px]">
                      <span className="text-xs font-bold uppercase opacity-60 tracking-widest">Unmarked / Absent</span>
                      <div>
                        <div className="text-4xl font-black">
                          {Math.max(0, allUsers.length - attendanceToday.length)}
                        </div>
                        <div className="text-xs opacity-80 mt-1 font-medium">
                          Pending confirmation
                        </div>
                      </div>
                    </div>

                  </div>

                  {/* Date Picker Bento Control Box */}
                  <div className="bg-white border-2 border-slate-200 p-6 rounded-3xl flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
                    
                    <div className="flex items-center gap-3">
                      <button 
                        onClick={handlePrevDay}
                        className="p-2.5 rounded-xl bg-slate-100 border border-transparent hover:bg-slate-200 transition text-slate-700 cursor-pointer"
                        title="Previous Day"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      
                      <div className="flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-indigo-600" />
                        <span className="font-bold text-slate-900 text-base">
                          {formatDateFriendly(selectedDate)}
                        </span>
                      </div>

                      <button 
                        onClick={handleNextDay}
                        className="p-2.5 rounded-xl bg-slate-100 border border-transparent hover:bg-slate-200 transition text-slate-700 cursor-pointer"
                        title="Next Day"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="flex items-center gap-3 self-start md:self-auto">
                      <span className="text-xs font-bold uppercase text-slate-400">Select Date:</span>
                      <input
                        type="date"
                        value={selectedDate}
                        onChange={(e) => {
                          if (e.target.value) {
                            setSelectedDate(e.target.value);
                          }
                        }}
                        className="px-3.5 py-1.5 bg-slate-100 border-2 border-transparent focus:border-indigo-500 rounded-xl text-xs font-bold outline-none text-slate-800"
                      />
                      
                      <button
                        onClick={() => setSelectedDate(getLocalDateString())}
                        className="px-3.5 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold transition duration-150 cursor-pointer"
                      >
                        Today
                      </button>
                    </div>

                  </div>

                  {/* Split Workspace Bento Layout */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    
                    {/* Left Column: Active list workspace */}
                    <div className="lg:col-span-8 bg-white border-2 border-slate-200 rounded-3xl p-6 shadow-sm">
                      
                      {/* Nav Tab selectors */}
                      <div className="flex border-b border-slate-100 mb-6">
                        <button
                          onClick={() => setActiveAdminTab("roster")}
                          className={`px-5 py-3 font-display text-sm font-black tracking-tight border-b-3 transition-all cursor-pointer uppercase ${
                            activeAdminTab === "roster"
                              ? "border-indigo-600 text-slate-900"
                              : "border-transparent text-slate-400 hover:text-slate-600"
                          }`}
                        >
                          Roster & Status ({allUsers.length})
                        </button>
                        <button
                          onClick={() => setActiveAdminTab("logs")}
                          className={`px-5 py-3 font-display text-sm font-black tracking-tight border-b-3 transition-all cursor-pointer uppercase ${
                            activeAdminTab === "logs"
                              ? "border-indigo-600 text-slate-900"
                              : "border-transparent text-slate-400 hover:text-slate-600"
                          }`}
                        >
                          Chronological Logs ({allAttendance.length})
                        </button>
                      </div>

                      {/* Content Render */}
                      {activeAdminTab === "roster" ? (
                        
                        // Tab A: Class roster list
                        <div className="space-y-4">
                          {allUsers.length === 0 ? (
                            <div className="p-12 text-center text-slate-400 space-y-2">
                              <Users className="w-12 h-12 mx-auto text-slate-300" />
                              <p className="font-bold text-slate-800 text-sm">Roster is empty</p>
                              <p className="text-xs text-slate-400">Attendees logging in with their name will populate here.</p>
                            </div>
                          ) : (
                            <div className="divide-y divide-slate-100">
                              {allUsers.map((user) => {
                                const attendanceRecord = attendanceToday.find(r => r.userId === user.id);
                                const isPresent = !!attendanceRecord;
                                const totalPresentCount = allAttendance.filter(r => r.userId === user.id).length;
                                
                                return (
                                  <div key={user.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/50 px-2 rounded-xl transition duration-150">
                                    <div className="flex items-center gap-3">
                                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-display font-black text-sm border-2 ${
                                        isPresent 
                                          ? "bg-emerald-50 text-emerald-700 border-emerald-200" 
                                          : "bg-slate-100 text-slate-600 border-slate-200"
                                      }`}>
                                        {user.firstName[0].toUpperCase()}
                                      </div>
                                      <div>
                                        <h4 className="font-bold text-slate-900 text-sm">{user.firstName}</h4>
                                        <p className="text-[11px] text-slate-400 font-medium">
                                          ID: {user.id} • Present in {totalPresentCount} sessions
                                        </p>
                                      </div>
                                    </div>

                                    <div className="flex items-center gap-2 self-end sm:self-auto">
                                      {/* Present Button */}
                                      <button
                                        onClick={() => handleSetAttendance(user.id, "present")}
                                        className={`px-3.5 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center gap-1.5 ${
                                          isPresent
                                            ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                                            : "bg-white text-slate-500 border-slate-200 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200"
                                        }`}
                                      >
                                        <span className={`w-1.5 h-1.5 rounded-full ${isPresent ? "bg-white animate-pulse" : "bg-slate-400"}`}></span>
                                        Present
                                      </button>

                                      {/* Absent Button */}
                                      <button
                                        onClick={() => handleSetAttendance(user.id, "absent")}
                                        className={`px-3.5 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center gap-1.5 ${
                                          !isPresent
                                            ? "bg-rose-600 text-white border-rose-600 shadow-sm"
                                            : "bg-white text-slate-500 border-slate-200 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200"
                                        }`}
                                      >
                                        <span className={`w-1.5 h-1.5 rounded-full ${!isPresent ? "bg-white" : "bg-slate-400"}`}></span>
                                        Absent
                                      </button>

                                      <button
                                        onClick={() => handleDeleteUser(user.id)}
                                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer ml-1"
                                        title="Delete Student"
                                      >
                                        <UserMinus className="w-4 h-4" />
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      ) : (
                        
                        // Tab B: Logs checklist
                        <div className="space-y-4">
                          {filteredHistoryLogs.length === 0 ? (
                            <div className="p-12 text-center text-slate-400 space-y-2">
                              <Clock className="w-12 h-12 mx-auto text-slate-300" />
                              <p className="font-bold text-slate-800 text-sm">No record logs</p>
                              <p className="text-xs text-slate-400">Logs match your filters will show up here.</p>
                            </div>
                          ) : (
                            <div className="overflow-x-auto">
                              <table className="w-full text-left text-xs">
                                <thead>
                                  <tr className="bg-slate-50 text-slate-400 font-bold uppercase tracking-wider border-b border-slate-100">
                                    <th className="p-3">Attendee</th>
                                    <th className="p-3">Date</th>
                                    <th className="p-3">Checked-in Time</th>
                                    <th className="p-3 text-right">Action</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 text-slate-700">
                                  {filteredHistoryLogs.map((record) => (
                                    <tr key={record.id} className="hover:bg-slate-50/50 transition">
                                      <td className="p-3 font-bold text-slate-900">{record.firstName}</td>
                                      <td className="p-3 text-slate-500">{formatDateFriendly(record.date)}</td>
                                      <td className="p-3 font-mono text-slate-400">{formatTime(record.timestamp)}</td>
                                      <td className="p-3 text-right">
                                        <button
                                          onClick={() => handleDeleteRecord(record.id)}
                                          className="text-rose-600 hover:bg-rose-50 px-2 py-1 rounded-lg text-xs font-semibold cursor-pointer"
                                        >
                                          Delete Log
                                        </button>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      )}

                    </div>

                    {/* Right Column: Sidebar Admin Controls */}
                    <div className="lg:col-span-4 space-y-6">
                      
                      {/* Search & Export Tools */}
                      <div className="bg-white border-2 border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
                        <h3 className="font-display font-black text-slate-900 text-lg uppercase tracking-tight italic">
                          Session Control Tools
                        </h3>

                        <div className="space-y-3">
                          <label className="block text-xs font-black uppercase text-slate-400">Search Records</label>
                          <div className="relative">
                            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                            <input
                              type="text"
                              placeholder="Search student or date..."
                              value={searchQuery}
                              onChange={(e) => setSearchQuery(e.target.value)}
                              className="w-full pl-9 pr-4 py-2.5 bg-slate-100 border-2 border-transparent focus:border-indigo-500 outline-none rounded-xl text-xs font-semibold text-slate-800 placeholder:text-slate-400"
                            />
                          </div>
                        </div>

                        <div className="pt-2 space-y-3">
                          <label className="block text-xs font-black uppercase text-slate-400">Export Today's Attendance</label>
                          
                          <button
                            onClick={handleExportExcel}
                            className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-bold text-xs uppercase tracking-wider shadow-lg shadow-emerald-100 flex items-center justify-center gap-2 cursor-pointer transition-colors"
                          >
                            <FileSpreadsheet className="w-4 h-4" />
                            Download Excel (CSV)
                          </button>

                          <button
                            onClick={handleExportPDF}
                            className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold text-xs uppercase tracking-wider shadow-lg shadow-indigo-100 flex items-center justify-center gap-2 cursor-pointer transition-colors"
                          >
                            <Printer className="w-4 h-4" />
                            Save PDF Report
                          </button>
                        </div>
                      </div>

                      {/* Technical Status Bento Info Box */}
                      <div className="bg-slate-900 text-slate-300 p-6 rounded-3xl shadow-sm relative overflow-hidden">
                        <div className="space-y-3 z-10 relative">
                          <span className="px-2.5 py-0.5 bg-slate-800 text-indigo-300 border border-slate-700 rounded-full text-[10px] font-bold uppercase tracking-wider">
                            Active Node Status
                          </span>
                          <h4 className="font-display font-bold text-white text-base">Terminal Active</h4>
                          <p className="text-xs text-slate-400 leading-relaxed">
                            Database persistence on standard Node file system. Backup engine active. All timestamps stored in server local timezone.
                          </p>
                          <div className="pt-2 flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse"></span>
                            <span className="text-[11px] font-mono text-slate-400">Port 3000 Ingress Ready</span>
                          </div>
                        </div>
                        <div className="w-24 h-24 bg-indigo-500 rounded-full blur-[40px] absolute -right-4 -bottom-4 opacity-30"></div>
                      </div>

                    </div>

                  </div>

                </div>
              )}

            </motion.div>
          ) : (
            
            // ================= STUDENT MODE =================
            <motion.div
              key="student-view"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.25 }}
              className="space-y-6"
            >
              
              {!currentUser ? (
                // Step 1: Login / First Name Input Grid
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                  
                  {/* Left Column: Core Input Bento Card */}
                  <div className="md:col-span-7 bg-white rounded-3xl border-2 border-slate-200 p-8 flex flex-col justify-between shadow-sm min-h-[480px]">
                    <div>
                      <div className="mb-6">
                        <span className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-xs font-black uppercase tracking-wider">
                          Student Portal
                        </span>
                      </div>
                      
                      <h2 className="text-3xl font-black text-slate-900 tracking-tight leading-none mb-3">
                        Quick Check-in.
                      </h2>
                      <div className="mb-6 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse"></span>
                        <p className="text-xs font-black uppercase text-indigo-700 tracking-wider">
                          Active Session: {sessionName}
                        </p>
                      </div>
                      <p className="text-slate-500 font-medium mb-8 leading-relaxed text-sm">
                        Welcome! Simply sign in with your first name to track your presence for this session. Easy, fast, and real-time.
                      </p>
                      
                      <form onSubmit={handleLogin} className="space-y-5">
                        <div>
                          <label className="block text-xs font-black uppercase text-slate-400 mb-2 ml-1">
                            First Name
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. Alexander"
                            value={firstNameInput}
                            onChange={(e) => setFirstNameInput(e.target.value)}
                            className="w-full px-5 py-4 bg-slate-100 border-2 border-transparent focus:border-indigo-500 rounded-2xl outline-none transition-all font-medium text-slate-800 placeholder:text-slate-400 text-lg"
                            maxLength={30}
                            required
                            autoFocus
                          />
                        </div>

                        {errorMessage && (
                          <div className="flex items-center gap-2 bg-rose-50 border border-rose-100 text-rose-700 p-3.5 rounded-xl text-xs font-bold">
                            <XCircle className="w-4 h-4 shrink-0" />
                            <span>{errorMessage}</span>
                          </div>
                        )}

                        <button
                          type="submit"
                          disabled={loading}
                          className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-bold text-xl shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-colors cursor-pointer disabled:bg-slate-300 disabled:shadow-none"
                        >
                          {loading ? "Joining Session..." : "Join & Check Present"}
                        </button>
                      </form>
                    </div>

                    {/* Bottom users joining stack */}
                    <div className="mt-8 pt-8 border-t border-slate-100 flex items-center justify-between">
                      <div className="flex -space-x-2">
                        <div className="w-8 h-8 rounded-full bg-indigo-400 border-2 border-white flex items-center justify-center font-bold text-[10px] text-white">A</div>
                        <div className="w-8 h-8 rounded-full bg-emerald-400 border-2 border-white flex items-center justify-center font-bold text-[10px] text-white">S</div>
                        <div className="w-8 h-8 rounded-full bg-amber-400 border-2 border-white flex items-center justify-center font-bold text-[10px] text-white">J</div>
                      </div>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">
                        {allUsers.length > 0 ? `${allUsers.length} total attendees registered` : "Welcome as first participant!"}
                      </p>
                    </div>

                  </div>

                  {/* Right Column: Secondary Bento Boxes Stack */}
                  <div className="md:col-span-5 flex flex-col justify-between gap-6">
                    
                    {/* Live Stats Box */}
                    <div className="bg-indigo-900 rounded-3xl p-6 text-white flex flex-col justify-between shadow-sm flex-1 min-h-[140px]">
                      <div className="text-xs font-bold uppercase opacity-60 tracking-widest">Active Capacity</div>
                      <div>
                        <div className="text-5xl font-black">
                          {allUsers.length ? Math.round((attendanceToday.length / allUsers.length) * 100) : 0}%
                        </div>
                        <div className="text-xs opacity-80 mt-1 italic leading-tight">
                          {attendanceToday.length} of {allUsers.length} logged present today
                        </div>
                      </div>
                    </div>

                    {/* Quality Box */}
                    <div className="bg-emerald-500 rounded-3xl p-6 text-white flex flex-col justify-between shadow-sm flex-1 min-h-[140px]">
                      <div className="text-xs font-bold uppercase opacity-70 tracking-widest">Session Health</div>
                      <div>
                        <div className="text-4xl font-black">Active</div>
                        <div className="text-xs opacity-90 mt-1">
                          Mark your daily attendance with a single click.
                        </div>
                      </div>
                    </div>

                    {/* Clock duration box */}
                    <div className="bg-white rounded-3xl border-2 border-slate-200 p-6 flex flex-col justify-between shadow-sm">
                      <div>
                        <div className="text-xs font-bold uppercase text-slate-400 tracking-widest mb-1">Session Date</div>
                        <div className="text-2xl font-black text-slate-900 font-display">
                          {formatDateFriendly(getLocalDateString()).split(",")[1]?.trim()}
                        </div>
                      </div>
                      <div className="w-full h-1 bg-slate-100 rounded-full mt-4 overflow-hidden">
                        <div className="w-3/4 h-full bg-indigo-600"></div>
                      </div>
                    </div>

                  </div>

                </div>
              ) : (
                
                // Step 2: Student is Logged in, Interactive Bento Board
                <div className="space-y-6">
                  
                  {/* Top Welcome Banner (Bento style) */}
                  <div className="bg-slate-900 text-white p-8 rounded-3xl flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm relative overflow-hidden">
                    <div className="z-10">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-800 text-indigo-300 text-xs font-bold rounded-full border border-slate-700/60 uppercase tracking-wider mb-2">
                        Active Session: {sessionName}
                      </span>
                      <h2 className="font-display text-3xl font-black tracking-tight leading-none">
                        Welcome, {currentUser.firstName}!
                      </h2>
                      <p className="text-slate-400 mt-2 text-sm">
                        You are signed in. Make sure to click the Present button below to log today's attendance.
                      </p>
                    </div>

                    <div className="z-10 flex items-center gap-3 self-start md:self-auto">
                      <button
                        onClick={handleLogout}
                        className="px-4 py-2.5 text-xs font-bold bg-slate-800 hover:bg-rose-950/40 hover:text-rose-400 hover:border-rose-900 border border-slate-700 rounded-xl transition duration-150 flex items-center gap-1.5 cursor-pointer"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        Log Out
                      </button>
                    </div>

                    <div className="w-48 h-48 bg-indigo-500 rounded-full blur-[60px] absolute -right-8 -bottom-8 opacity-20"></div>
                  </div>

                  {/* Dual columns for interaction */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    
                    {/* Left Panel: Primary Check-in Trigger */}
                    <div className="lg:col-span-7 bg-white border-2 border-slate-200 rounded-3xl p-8 flex flex-col justify-between shadow-sm">
                      
                      <div>
                        <div className="flex justify-between items-center pb-4 border-b border-slate-100 mb-6">
                          <div>
                            <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wide">Status Check</h3>
                            <p className="text-xs text-slate-500">{formatDateFriendly(getLocalDateString())}</p>
                          </div>
                          
                          <span className={`px-3 py-1.5 rounded-full text-[10px] font-black tracking-wider uppercase border ${
                            isCurrentUserPresentToday
                              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                              : "bg-amber-50 text-amber-800 border-amber-200"
                          }`}>
                            {isCurrentUserPresentToday ? "Status: Present" : "Status: Absent"}
                          </span>
                        </div>

                        <div className="flex flex-col items-center justify-center text-center py-6">
                          <AnimatePresence mode="wait">
                            {!isCurrentUserPresentToday ? (
                              <motion.div
                                key="btn-trigger"
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className="space-y-6"
                              >
                                <div className="relative inline-block">
                                  <span className="absolute inset-0 bg-indigo-600 rounded-full animate-ping opacity-15"></span>
                                  <button
                                    onClick={handleMarkPresent}
                                    disabled={loading}
                                    className="relative w-36 h-36 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full flex flex-col items-center justify-center shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 active:scale-95 border-4 border-white cursor-pointer"
                                  >
                                    <Users className="w-8 h-8 mb-1.5" />
                                    <span className="font-black text-xs tracking-wider uppercase">
                                      {loading ? "Logging..." : "Present"}
                                    </span>
                                  </button>
                                </div>

                                <div className="space-y-1 max-w-xs mx-auto">
                                  <h4 className="font-bold text-slate-900 text-sm">Mark Session Attendance</h4>
                                  <p className="text-xs text-slate-500">
                                    Click the interactive button above. This secures your session presence log instantly.
                                  </p>
                                </div>

                                {errorMessage && (
                                  <div className="flex items-center gap-2 bg-rose-50 border border-rose-100 text-rose-700 p-3.5 rounded-xl text-xs font-bold max-w-xs mx-auto">
                                    <XCircle className="w-4 h-4 shrink-0" />
                                    <span>{errorMessage}</span>
                                  </div>
                                )}

                              </motion.div>
                            ) : (
                              <motion.div
                                key="btn-success"
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className="space-y-6"
                              >
                                <div className="w-24 h-24 bg-emerald-50 border-2 border-emerald-100 rounded-full flex items-center justify-center mx-auto shadow-inner">
                                  <CheckCircle2 className="w-12 h-12 text-emerald-500" />
                                </div>

                                <div className="space-y-2">
                                  <h3 className="font-display text-xl font-black text-emerald-800 uppercase tracking-tight">
                                    Presence Logged!
                                  </h3>
                                  <p className="text-xs font-bold text-slate-700 bg-slate-100 px-3 py-1.5 rounded-full inline-block">
                                    Recorded at {currentUserRecordToday ? formatTime(currentUserRecordToday.timestamp) : "..."}
                                  </p>
                                  <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
                                    Fantastic! Your attendance has been securely saved for today. You're ready to proceed with the session.
                                  </p>
                                </div>

                                {successMessage && (
                                  <div className="inline-flex items-center gap-2 bg-emerald-50 border border-emerald-100 text-emerald-800 px-4 py-2 rounded-xl text-xs font-semibold">
                                    <Sparkles className="w-3.5 h-3.5 text-emerald-500 animate-bounce" />
                                    <span>{successMessage}</span>
                                  </div>
                                )}

                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </div>

                      <div className="pt-6 border-t border-slate-100 text-center text-xs text-slate-400 font-medium">
                        Device connection verified • Client standard secure sync
                      </div>

                    </div>

                    {/* Right Panel: Personal logs stack */}
                    <div className="lg:col-span-5 space-y-6">
                      
                      {/* Personal Streak Highlights */}
                      <div className="bg-indigo-900 text-white p-6 rounded-3xl flex flex-col justify-between shadow-sm min-h-[140px]">
                        <span className="text-xs font-bold uppercase opacity-60 tracking-widest">Your Statistics</span>
                        <div>
                          <div className="text-4xl font-black">
                            {personalStreakCount} Sessions
                          </div>
                          <p className="text-xs opacity-80 mt-1 italic leading-tight">
                            Total historical present days marked
                          </p>
                        </div>
                      </div>

                      {/* Log checklist scrollable */}
                      <div className="bg-white border-2 border-slate-200 p-6 rounded-3xl shadow-sm space-y-4">
                        <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                          <Calendar className="w-4.5 h-4.5 text-indigo-600" />
                          <h4 className="font-bold text-slate-900 text-sm">Personal Presence Log</h4>
                        </div>

                        {allAttendance.filter(a => a.userId === currentUser.id).length === 0 ? (
                          <p className="text-xs text-slate-400 text-center py-6 italic leading-relaxed">
                            No logs registered on this system yet.<br/>Click "Present" above to record your first entry.
                          </p>
                        ) : (
                          <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1">
                            {allAttendance
                              .filter(a => a.userId === currentUser.id)
                              .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                              .map(record => (
                                <div 
                                  key={record.id}
                                  className="p-3 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-between gap-2.5 hover:bg-slate-100/50 transition"
                                >
                                  <div className="flex items-center gap-2 min-w-0">
                                    <div className="p-1 bg-emerald-100 rounded text-emerald-700">
                                      <CheckCircle2 className="w-3.5 h-3.5" />
                                    </div>
                                    <p className="text-xs font-bold text-slate-800 truncate">
                                      {formatDateFriendly(record.date).split(",")[1]?.trim() || formatDateFriendly(record.date)}
                                    </p>
                                  </div>
                                  <span className="text-[10px] text-slate-400 font-mono">
                                    {formatTime(record.timestamp)}
                                  </span>
                                </div>
                              ))}
                          </div>
                        )}
                      </div>

                    </div>

                  </div>

                </div>
              )}

            </motion.div>
          )}

        </AnimatePresence>
      </main>

      {/* Decorative footer */}
      <footer className="mt-16 border-t border-slate-200 bg-white/50 py-10 text-center text-xs text-slate-400 font-semibold uppercase tracking-widest">
        <p>© 2026 SessionTrack • Premium Bento Attendance Control</p>
      </footer>

    </div>
  );
}

