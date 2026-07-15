import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";

// Interfaces
interface User {
  id: string;
  firstName: string;
  createdAt: string;
}

interface AttendanceRecord {
  id: string;
  userId: string;
  firstName: string;
  timestamp: string; // ISO String
  date: string; // YYYY-MM-DD
}

interface DatabaseSchema {
  users: User[];
  attendance: AttendanceRecord[];
  sessionName?: string;
}

const DB_DIR = path.join(process.cwd(), "data");
const DB_FILE = path.join(DB_DIR, "db.json");

// Helper to ensure database is initialized
function initDb(): DatabaseSchema {
  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }
  if (!fs.existsSync(DB_FILE)) {
    const initialData: DatabaseSchema = {
      users: [],
      attendance: [],
      sessionName: "Enterprise Training Session"
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(initialData, null, 2), "utf-8");
    return initialData;
  }
  try {
    const raw = fs.readFileSync(DB_FILE, "utf-8");
    const data = JSON.parse(raw) as DatabaseSchema;
    if (data.sessionName === undefined) {
      data.sessionName = "Enterprise Training Session";
    }
    return data;
  } catch (err) {
    console.error("Error parsing DB file, resetting to empty", err);
    const initialData: DatabaseSchema = {
      users: [],
      attendance: [],
      sessionName: "Enterprise Training Session"
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(initialData, null, 2), "utf-8");
    return initialData;
  }
}

// Read database
function readDb(): DatabaseSchema {
  return initDb();
}

// Write database
function writeDb(data: DatabaseSchema) {
  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), "utf-8");
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middlewares
  app.use(express.json());

  // Ensure DB is initialized
  initDb();

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", time: new Date().toISOString() });
  });

  // 1. Login/Register User with First Name
  app.post("/api/login", (req, res) => {
    const { firstName } = req.body;
    if (!firstName || typeof firstName !== "string" || !firstName.trim()) {
      return res.status(400).json({ error: "First name is required" });
    }

    const trimmedName = firstName.trim();
    const db = readDb();
    
    // Find if user already exists (case-insensitive check)
    let user = db.users.find(
      (u) => u.firstName.toLowerCase() === trimmedName.toLowerCase()
    );

    if (!user) {
      // Create new user
      user = {
        id: Math.random().toString(36).substring(2, 11),
        firstName: trimmedName,
        createdAt: new Date().toISOString()
      };
      db.users.push(user);
      writeDb(db);
    }

    res.json({ user });
  });

  // 2. Get list of all registered users
  app.get("/api/users", (req, res) => {
    const db = readDb();
    res.json(db.users);
  });

  // 3. Mark Attendance
  app.post("/api/attendance", (req, res) => {
    const { userId, date } = req.body; // Client sends userId and today's date (local format YYYY-MM-DD)
    if (!userId) {
      return res.status(400).json({ error: "User ID is required" });
    }

    const db = readDb();
    const user = db.users.find((u) => u.id === userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Default to server date if not provided
    const targetDate = date || new Date().toISOString().split("T")[0];

    // Check if already present for that day
    const alreadyPresent = db.attendance.find(
      (a) => a.userId === userId && a.date === targetDate
    );

    if (alreadyPresent) {
      return res.status(400).json({ error: "You are already marked present for today!" });
    }

    const record: AttendanceRecord = {
      id: Math.random().toString(36).substring(2, 11),
      userId,
      firstName: user.firstName,
      timestamp: new Date().toISOString(),
      date: targetDate
    };

    db.attendance.push(record);
    writeDb(db);

    res.json({ message: "Attendance marked successfully!", record });
  });

  // 4. Get attendance for a specific date (defaults to today)
  app.get("/api/attendance/today", (req, res) => {
    const dateParam = req.query.date as string;
    const targetDate = dateParam || new Date().toISOString().split("T")[0];

    const db = readDb();
    const records = db.attendance.filter((a) => a.date === targetDate);
    res.json(records);
  });

  // 5. Get complete attendance history
  app.get("/api/attendance/history", (req, res) => {
    const db = readDb();
    res.json(db.attendance);
  });

  // 6. Delete a specific attendance record (Admin option)
  app.delete("/api/attendance/:id", (req, res) => {
    const { id } = req.params;
    const db = readDb();
    const initialLength = db.attendance.length;
    db.attendance = db.attendance.filter((a) => a.id !== id);

    if (db.attendance.length === initialLength) {
      return res.status(404).json({ error: "Record not found" });
    }

    writeDb(db);
    res.json({ message: "Record deleted successfully" });
  });

  // 7. Toggle/Force Attendance for any user (Admin option)
  app.post("/api/admin/attendance/toggle", (req, res) => {
    const { userId, date } = req.body;
    if (!userId || !date) {
      return res.status(400).json({ error: "User ID and Date are required" });
    }

    const db = readDb();
    const user = db.users.find((u) => u.id === userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const existingIndex = db.attendance.findIndex(
      (a) => a.userId === userId && a.date === date
    );

    if (existingIndex > -1) {
      // Remove attendance
      db.attendance.splice(existingIndex, 1);
      writeDb(db);
      return res.json({ message: "Attendance removed successfully", status: "absent" });
    } else {
      // Add attendance
      const record: AttendanceRecord = {
        id: Math.random().toString(36).substring(2, 11),
        userId,
        firstName: user.firstName,
        timestamp: new Date().toISOString(),
        date
      };
      db.attendance.push(record);
      writeDb(db);
      return res.json({ message: "Attendance added successfully", record, status: "present" });
    }
  });

  // 7.1 Set/Force Attendance for any user (Admin option - Direct Set)
  app.post("/api/admin/attendance/set", (req, res) => {
    const { userId, date, status } = req.body; // status: "present" | "absent"
    if (!userId || !date || !status) {
      return res.status(400).json({ error: "User ID, Date, and Status are required" });
    }

    const db = readDb();
    const user = db.users.find((u) => u.id === userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const existingIndex = db.attendance.findIndex(
      (a) => a.userId === userId && a.date === date
    );

    if (status === "absent") {
      if (existingIndex > -1) {
        db.attendance.splice(existingIndex, 1);
        writeDb(db);
      }
      return res.json({ message: "Attendance set to absent", status: "absent" });
    } else if (status === "present") {
      if (existingIndex === -1) {
        const record: AttendanceRecord = {
          id: Math.random().toString(36).substring(2, 11),
          userId,
          firstName: user.firstName,
          timestamp: new Date().toISOString(),
          date
        };
        db.attendance.push(record);
        writeDb(db);
        return res.json({ message: "Attendance set to present", record, status: "present" });
      }
      return res.json({ message: "Attendance already present", status: "present" });
    }

    res.status(400).json({ error: "Invalid status value. Must be 'present' or 'absent'." });
  });

  // 8. Delete a user completely (Admin option)
  app.delete("/api/users/:userId", (req, res) => {
    const { userId } = req.params;
    const db = readDb();
    
    db.users = db.users.filter((u) => u.id !== userId);
    db.attendance = db.attendance.filter((a) => a.userId !== userId); // Cascade delete attendance
    writeDb(db);

    res.json({ message: "User and all their attendance history deleted successfully" });
  });

  // 9. Add a single user manually (Admin option)
  app.post("/api/admin/users", (req, res) => {
    const { firstName } = req.body;
    if (!firstName || typeof firstName !== "string" || !firstName.trim()) {
      return res.status(400).json({ error: "Name is required" });
    }

    const trimmedName = firstName.trim();
    const db = readDb();

    // Check case-insensitive duplication
    const exists = db.users.some(
      (u) => u.firstName.toLowerCase() === trimmedName.toLowerCase()
    );

    if (exists) {
      return res.status(400).json({ error: `Student "${trimmedName}" already exists in the roster.` });
    }

    const user: User = {
      id: Math.random().toString(36).substring(2, 11),
      firstName: trimmedName,
      createdAt: new Date().toISOString()
    };

    db.users.push(user);
    writeDb(db);

    res.json({ message: "Student added to roster successfully", user });
  });

  // 10. Bulk add users (Admin option)
  app.post("/api/admin/users/bulk", (req, res) => {
    const { names } = req.body;
    if (!names || !Array.isArray(names)) {
      return res.status(400).json({ error: "An array of names is required" });
    }

    const db = readDb();
    const addedUsers: User[] = [];
    const skippedNames: string[] = [];

    for (const name of names) {
      if (typeof name !== "string") continue;
      const trimmed = name.trim();
      if (!trimmed) continue;

      const exists = db.users.some(
        (u) => u.firstName.toLowerCase() === trimmed.toLowerCase()
      );

      if (exists) {
        skippedNames.push(trimmed);
        continue;
      }

      const user: User = {
        id: Math.random().toString(36).substring(2, 11),
        firstName: trimmed,
        createdAt: new Date().toISOString()
      };

      db.users.push(user);
      addedUsers.push(user);
    }

    if (addedUsers.length > 0) {
      writeDb(db);
    }

    res.json({
      message: `Successfully imported ${addedUsers.length} student(s).`,
      addedCount: addedUsers.length,
      skippedCount: skippedNames.length,
      skippedNames
    });
  });

  // 11. Get current session name
  app.get("/api/session", (req, res) => {
    const db = readDb();
    res.json({ sessionName: db.sessionName || "Enterprise Training Session" });
  });

  // 12. Update session name (Admin option)
  app.post("/api/session", (req, res) => {
    const { sessionName } = req.body;
    if (!sessionName || typeof sessionName !== "string" || !sessionName.trim()) {
      return res.status(400).json({ error: "Session name is required" });
    }

    const db = readDb();
    db.sessionName = sessionName.trim();
    writeDb(db);

    res.json({ sessionName: db.sessionName });
  });

  // Vite development or static server
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
