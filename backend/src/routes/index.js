// routes/index.js

const express = require("express");
const router = express.Router();

router.get("/", (req, res) => {
  res.json({ message: "API root available" });
});

router.use("/users", require("./user.route"));
router.use("/timetable", require("./timetable.route"));
router.use("/bookmarks", require("./bookmark.route"));
router.use("/rag", require("./rag.route"));
router.use("/notices", require("./notice.route"));
router.use("/schedule", require("./schedule.route"));

module.exports = router;