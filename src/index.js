import express from "express";
import path from "path";
import morgan from "morgan";
import { fileURLToPath } from "url";
import methodOverride from "method-override";
import mongoose from "mongoose";
import dotenv from "dotenv";
import { Item } from "./models/Item.js";
import { Feedback as FeedbackModel } from "./models/Feedback.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();
const app = express();
const port = process.env.PORT || 3000;

// MongoDB connection with fallback to in-memory storage
const mongodbUri = process.env.MONGODB_URI || "";
let useMongoDB = false;

if (!mongodbUri) {
  // eslint-disable-next-line no-console
  console.warn("MONGODB_URI not set. Using in-memory storage.");
} else {
  mongoose
    .connect(mongodbUri, { 
      autoIndex: true,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      family: 4
    })
    .then(() => {
      console.log("Connected to MongoDB");
      useMongoDB = true;
      // Create collections if they don't exist
      Item.createIndexes().catch(err => console.log("Items collection ready"));
      FeedbackModel.createIndexes().catch(err => console.log("Feedback collection ready"));
    })
    .catch((err) => {
      console.error("MongoDB connection error:", err.message);
      console.log("Falling back to in-memory storage");
    });
}

// Fallback in-memory storage
const memoryItems = [];
const memoryFeedback = [];

// View engine setup
app.set("views", path.join(__dirname, "..", "views"));
app.set("view engine", "ejs");

// Middleware
app.use(morgan("dev"));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, "..", "public")));
app.use(methodOverride("_method"));

// Routes
app.get("/about", (_req, res) => {
  res.render("about", {
    title: "About",
  });
});

// Favicon handler to avoid 404 noise
app.get("/favicon.ico", (_req, res) => res.status(204).end());

app.get("/", (req, res) => {
  const name = req.query.name || "Visitor";
  res.render("index", {
    title: "Welcome",
    name,
    env: process.env.NODE_ENV || "development",
  });
});

app.get("/user/:name", (req, res) => {
  res.render("user", {
    title: "User Page",
    name: req.params.name,
  });
});

// Basic API endpoint
app.get("/api/time", (_req, res) => {
  res.json({
    nowIso: new Date().toISOString(),
    uptimeSeconds: process.uptime(),
  });
});

// Items CRUD
app.get("/items", async (_req, res) => {
  if (useMongoDB) {
    try {
      const list = await Item.find({}).sort({ updatedAt: -1 }).lean();
      res.render("items/index", { title: "Items", items: list.map(it => ({ id: it._id.toString(), title: it.title, updatedAtIso: it.updatedAt.toISOString() })) });
    } catch (err) {
      console.error("MongoDB error:", err.message);
      res.render("items/index", { title: "Items", items: memoryItems });
    }
  } else {
    res.render("items/index", { title: "Items", items: memoryItems });
  }
});

app.get("/items/new", (_req, res) => {
  res.render("items/new", { title: "New Item" });
});

app.post("/items", async (req, res) => {
  const { title, content } = req.body;
  const itemData = { title: (title || "Untitled").toString().trim() || "Untitled", content: (content || "").toString() };
  
  if (useMongoDB) {
    try {
      const created = await Item.create(itemData);
      res.redirect(`/items/${created._id.toString()}`);
    } catch (err) {
      console.error("MongoDB error:", err.message);
      // Fallback to memory
      const item = { id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, ...itemData, createdAtIso: new Date().toISOString(), updatedAtIso: new Date().toISOString() };
      memoryItems.push(item);
      res.redirect(`/items/${item.id}`);
    }
  } else {
    const item = { id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, ...itemData, createdAtIso: new Date().toISOString(), updatedAtIso: new Date().toISOString() };
    memoryItems.push(item);
    res.redirect(`/items/${item.id}`);
  }
});

app.get("/items/:id", async (req, res) => {
  if (useMongoDB) {
    try {
      const it = await Item.findById(req.params.id).lean();
      if (!it) return res.status(404).render("404", { title: "Not Found", url: req.originalUrl });
      res.render("items/show", { title: it.title, item: { id: it._id.toString(), title: it.title, content: it.content, createdAtIso: it.createdAt.toISOString(), updatedAtIso: it.updatedAt.toISOString() } });
    } catch (err) {
      console.error("MongoDB error:", err.message);
      const item = memoryItems.find(i => i.id === req.params.id);
      if (!item) return res.status(404).render("404", { title: "Not Found", url: req.originalUrl });
      res.render("items/show", { title: item.title, item });
    }
  } else {
    const item = memoryItems.find(i => i.id === req.params.id);
    if (!item) return res.status(404).render("404", { title: "Not Found", url: req.originalUrl });
    res.render("items/show", { title: item.title, item });
  }
});

app.get("/items/:id/edit", async (req, res) => {
  const it = await Item.findById(req.params.id).lean();
  if (!it) return res.status(404).render("404", { title: "Not Found", url: req.originalUrl });
  res.render("items/edit", { title: `Edit: ${it.title}`, item: { id: it._id.toString(), title: it.title, content: it.content } });
});

app.put("/items/:id", async (req, res) => {
  const { title, content } = req.body;
  const updated = await Item.findByIdAndUpdate(
    req.params.id,
    { $set: { title: (title || "").toString().trim() || undefined, content: (content || "").toString() } },
    { new: true }
  ).lean();
  if (!updated) return res.status(404).render("404", { title: "Not Found", url: req.originalUrl });
  res.redirect(`/items/${updated._id.toString()}`);
});

app.delete("/items/:id", async (req, res) => {
  const deleted = await Item.findByIdAndDelete(req.params.id).lean();
  if (!deleted) return res.status(404).render("404", { title: "Not Found", url: req.originalUrl });
  res.redirect("/items");
});
// Feedback form and list
app.get("/feedback", async (_req, res) => {
  const all = await FeedbackModel.find({}).sort({ createdAt: -1 }).lean();
  const items = all.map(f => ({ name: f.name || "Anonymous", message: f.message, createdAtIso: f.createdAt.toISOString() }));
  res.render("feedback", { title: "Feedback", items });
});

app.post("/feedback", async (req, res) => {
  const { name, message } = req.body;
  const trimmedMessage = (message || "").toString().trim();
  if (trimmedMessage.length > 0) {
    await FeedbackModel.create({ name: (name || "Anonymous").toString().trim() || "Anonymous", message: trimmedMessage });
  }
  res.redirect("/feedback");
});

// Health check endpoint for load balancers
app.get("/health", (_req, res) => {
  res.status(200).send("OK");
});

// 404 handler
app.use((req, res) => {
  res.status(404).render("404", {
    title: "Not Found",
    url: req.originalUrl,
  });
});

app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`Server running on http://localhost:${port}`);
});


