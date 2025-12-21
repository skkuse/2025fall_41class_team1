require("dotenv").config();
const app = require("./app");
const { initDB } = require("./config/init-db");
const cors = require("cors");

const PORT = process.env.PORT || 4000;

(async () => {
  await initDB();

  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
})();

app.use(cors({
  origin: "http://localhost:5173",   // Vite 기본 포트
  credentials: true,
}));
