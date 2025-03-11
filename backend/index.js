const express = require("express");
const cors = require("cors");
const articleRoutes = require("./routes/articles");

const app = express();

// ... existing code ...

app.use(
  cors({
    origin: process.env.FRONTEND_URL || "*",
    credentials: true,
  })
);

app.use("/api/articles", articleRoutes);

// ... existing code ...

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
