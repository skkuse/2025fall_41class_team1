const router = require("express").Router();
const auth = require("../middleware/auth.middleware");

const {
  getPrimaryTimetable,
  createTimetable,
  getMyTimetables,
  updateTimetable,
  deleteTimetable,
  addPrimaryTimetableItem,
  addTimetableItem,
  updateTimetableItem,
  deleteTimetableItem,
} = require("../controllers/timetable.controller");

// Get primary timetable (or create default) - FOR FRONTEND EASE-OF-USE
router.get("/primary", auth, getPrimaryTimetable);

// Add item to primary timetable
router.post("/primary/items", auth, addPrimaryTimetableItem);

// Full CRUD for Timetables
router.post("/", auth, createTimetable);
router.get("/", auth, getMyTimetables);
router.put("/:timetableID", auth, updateTimetable);
router.delete("/:timetableID", auth, deleteTimetable);

// Full CRUD for Timetable Items
router.post("/:timetableID/items", auth, addTimetableItem);
router.put("/items/:itemID", auth, updateTimetableItem);
router.delete("/items/:itemID", auth, deleteTimetableItem);

module.exports = router;