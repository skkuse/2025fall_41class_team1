const express = require("express");
const app = express();
const cors = require("cors");

const timetableRoutes = require("./routes/timetable.route");
const bookmarkRoutes = require("./routes/bookmark.route");
const ragRoutes = require("./routes/rag.route");
const userRoutes = require("./routes/user.route");
const noticeRoutes = require("./routes/notice.route");
const scheduleRoutes = require("./routes/schedule.route");

// ===== CORS MUST COME FIRST =====
app.use(cors({
  origin: "http://localhost:5173",
  credentials: true,
}));

// ===== BODY PARSER =====
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ===== ROUTES =====
app.use("/api/timetable", timetableRoutes);
app.use("/api/bookmarks", bookmarkRoutes);
app.use("/api/rag", ragRoutes);
app.use("/api/users", userRoutes);
app.use("/api/notices", noticeRoutes);
app.use("/api/schedule", scheduleRoutes);

// ===== ERROR HANDLER =====
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: "서버 내부 오류가 발생했습니다.",
  });
});

// ===== SERVER START =====
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;
