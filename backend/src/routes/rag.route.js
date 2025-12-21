const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth.middleware");

const { askRAG, translate } = require("../controllers/rag.controller");

router.post("/ask", auth, askRAG);

router.post("/translate", translate);

module.exports = router;