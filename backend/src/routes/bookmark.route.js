const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth.middleware");

const {
  createBookmark,
  getMyBookmarks,
  getBookmarkDetail,
  deleteBookmark,
} = require("../controllers/bookmark.controller");

router.post("/", auth, createBookmark);

router.get("/", auth, getMyBookmarks);

router.get("/:bookmarkID", auth, getBookmarkDetail);

router.delete("/:bookmarkID", auth, deleteBookmark);

module.exports = router;