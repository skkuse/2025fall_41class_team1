const router = require("express").Router();
const auth = require("../middleware/auth.middleware");

const {
  createScheduleFromChat,
  getMyCalendars,
  updateCalendar,
  createCalendar,
  deleteCalendar,
  getPrimaryCalendar,

  addScheduleItem,
  updateScheduleItem,
  deleteScheduleItem,
  addPrimaryScheduleItem,
} = require("../controllers/schedule.controller");

// ---- CALENDAR ----
router.get("/primary", auth, getPrimaryCalendar);
router.post("/", auth, createCalendar);
router.get("/", auth, getMyCalendars);
router.put("/:calendarID", auth, updateCalendar);
router.delete("/:calendarID", auth, deleteCalendar);

// ---- SCHEDULE ITEMS ----
router.post("/primary/items", auth, addPrimaryScheduleItem);
router.post("/:calendarID/items", auth, addScheduleItem);
router.put("/items/:itemID", auth, updateScheduleItem);
router.delete("/items/:itemID", auth, deleteScheduleItem);

// ---- SCHEDULE EXTRACTION ----
router.post("/extract", auth, createScheduleFromChat);

module.exports = router;
