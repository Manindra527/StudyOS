import "dotenv/config";
import cors from "cors";
import express from "express";
import mongoose from "mongoose";

const PORT = Number(process.env.PORT || 3001);
const mongoUri = process.env.MONGODB_URI;

if (!mongoUri) {
  console.error("MONGODB_URI is required. Add it to the server environment before starting the API.");
  process.exit(1);
}

const topicSchema = new mongoose.Schema({
  id: { type: String, required: true }, name: { type: String, required: true, trim: true, maxlength: 300 },
  done: { type: Boolean, default: false }, favorite: { type: Boolean, default: false },
}, { _id: false });
topicSchema.add({ subtopics: { type: [topicSchema], default: [] } });

const categorySchema = new mongoose.Schema({
  id: { type: String, required: true }, name: { type: String, required: true, trim: true, maxlength: 300 },
  icon: { type: String, required: true }, color: { type: String, required: true }, topics: { type: [topicSchema], default: [] },
}, { _id: false });

const uploadSchema = new mongoose.Schema({
  name: { type: String, required: true }, mimeType: String, size: Number, uploadedAt: { type: Date, default: Date.now },
}, { _id: false });

const workspaceSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, index: true }, section: { type: String, required: true, index: true },
  title: { type: String, required: true, trim: true, maxlength: 300 }, subtitle: { type: String, default: "", maxlength: 1000 },
  createdAt: { type: Number, required: true }, categories: { type: [categorySchema], default: [] }, uploadedFile: uploadSchema,
}, { timestamps: true, versionKey: false });

const profileSchema = new mongoose.Schema({ key: { type: String, unique: true }, activeWorkspaceId: { type: String, default: null } }, { versionKey: false });
const Workspace = mongoose.model("Workspace", workspaceSchema);
const Profile = mongoose.model("Profile", profileSchema);
const Section = mongoose.model("Section", new mongoose.Schema({ name: { type: String, required: true, unique: true, trim: true } }, { timestamps: true, versionKey: false }));

const app = express();
app.use(cors({ origin: process.env.FRONTEND_ORIGIN?.split(",") || true }));
app.use(express.json({ limit: "2mb" }));

const asyncRoute = (handler) => (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
const id = (value) => typeof value === "string" && value.length > 0 && value.length <= 120;
const workspaceValid = (value) => value && id(value.id) && typeof value.title === "string" && typeof value.section === "string" && Number.isFinite(value.createdAt) && Array.isArray(value.categories);
const cleanWorkspace = (value) => ({ ...value, section: value.section.trim().replace(/\s+/g, " ").toUpperCase() || "OTHER" });
const topicById = (topics, topicId) => {
  for (const topic of topics) { if (topic.id === topicId) return topic; const child = topicById(topic.subtopics || [], topicId); if (child) return child; }
  return null;
};
const profile = () => Profile.findOneAndUpdate({ key: "default" }, { $setOnInsert: { key: "default" } }, { new: true, upsert: true });
const snapshot = async () => {
  const [workspaces, user] = await Promise.all([Workspace.find().sort({ createdAt: -1 }).lean(), profile()]);
  return { workspaces, activeWorkspaceId: user.activeWorkspaceId || workspaces[0]?.id || null };
};

app.get("/api/health", asyncRoute(async (_req, res) => { await mongoose.connection.db.admin().ping(); res.json({ ok: true }); }));
app.get("/api/data/export", asyncRoute(async (_req, res) => res.json(await snapshot())));
app.get("/api/workspaces", asyncRoute(async (_req, res) => res.json(await snapshot())));
app.get("/api/sections", asyncRoute(async (_req, res) => res.json(await Section.find().sort({ name: 1 }).lean())));
app.post("/api/sections", asyncRoute(async (req, res) => { if (typeof req.body.name !== "string" || !req.body.name.trim()) return res.status(400).json({ message: "A section name is required." }); const name = req.body.name.trim().replace(/\s+/g, " ").toUpperCase(); const section = await Section.findOneAndUpdate({ name }, { $setOnInsert: { name } }, { upsert: true, new: true }); res.status(201).json(section); }));
app.delete("/api/sections/:section", asyncRoute(async (req, res) => { if (await Workspace.exists({ section: req.params.section })) return res.status(409).json({ message: "Move or delete the section's workspaces first." }); const deleted = await Section.findOneAndDelete({ name: req.params.section }); if (!deleted) return res.status(404).json({ message: "Section not found." }); res.status(204).end(); }));
app.get("/api/workspaces/:id", asyncRoute(async (req, res) => { const workspace = await Workspace.findOne({ id: req.params.id }).lean(); if (!workspace) return res.status(404).json({ message: "Workspace not found." }); res.json(workspace); }));
app.post("/api/workspaces", asyncRoute(async (req, res) => {
  if (!workspaceValid(req.body)) return res.status(400).json({ message: "A valid workspace is required." });
  const workspace = await Workspace.create(cleanWorkspace(req.body));
  await Section.updateOne({ name: workspace.section }, { $setOnInsert: { name: workspace.section } }, { upsert: true });
  await Profile.updateOne({ key: "default" }, { $set: { activeWorkspaceId: workspace.id } }, { upsert: true });
  res.status(201).json(workspace.toObject());
}));
app.put("/api/workspaces/:id", asyncRoute(async (req, res) => {
  if (!workspaceValid(req.body) || req.body.id !== req.params.id) return res.status(400).json({ message: "Workspace id does not match the request." });
  const workspace = await Workspace.findOneAndReplace({ id: req.params.id }, cleanWorkspace(req.body), { new: true, runValidators: true });
  if (!workspace) return res.status(404).json({ message: "Workspace not found." });
  res.json(workspace.toObject());
}));
app.delete("/api/workspaces/:id", asyncRoute(async (req, res) => { const deleted = await Workspace.findOneAndDelete({ id: req.params.id }); if (!deleted) return res.status(404).json({ message: "Workspace not found." }); const state = await snapshot(); res.json(state); }));
app.patch("/api/profile/active-workspace", asyncRoute(async (req, res) => { if (req.body.activeWorkspaceId !== null && !id(req.body.activeWorkspaceId)) return res.status(400).json({ message: "Invalid workspace id." }); await Profile.updateOne({ key: "default" }, { $set: { activeWorkspaceId: req.body.activeWorkspaceId } }, { upsert: true }); res.status(204).end(); }));
app.patch("/api/sections/:section", asyncRoute(async (req, res) => { if (typeof req.body.name !== "string" || !req.body.name.trim()) return res.status(400).json({ message: "A section name is required." }); const section = req.body.name.trim().replace(/\s+/g, " ").toUpperCase(); await Workspace.updateMany({ section: req.params.section }, { $set: { section } }); await Section.updateOne({ name: section }, { $setOnInsert: { name: section } }, { upsert: true }); await Section.deleteOne({ name: req.params.section }); res.json(await snapshot()); }));

app.post("/api/workspaces/:workspaceId/categories", asyncRoute(async (req, res) => { const result = await Workspace.findOneAndUpdate({ id: req.params.workspaceId }, { $push: { categories: req.body } }, { new: true, runValidators: true }); if (!result) return res.status(404).json({ message: "Workspace not found." }); res.status(201).json(result.toObject()); }));
app.put("/api/workspaces/:workspaceId/categories/:categoryId", asyncRoute(async (req, res) => { const result = await Workspace.findOneAndUpdate({ id: req.params.workspaceId, "categories.id": req.params.categoryId }, { $set: { "categories.$": req.body } }, { new: true, runValidators: true }); if (!result) return res.status(404).json({ message: "Category not found." }); res.json(result.toObject()); }));
app.delete("/api/workspaces/:workspaceId/categories/:categoryId", asyncRoute(async (req, res) => { const result = await Workspace.findOneAndUpdate({ id: req.params.workspaceId }, { $pull: { categories: { id: req.params.categoryId } } }, { new: true }); if (!result) return res.status(404).json({ message: "Workspace not found." }); res.json(result.toObject()); }));
app.patch("/api/workspaces/:workspaceId/categories/order", asyncRoute(async (req, res) => { if (!Array.isArray(req.body.categories)) return res.status(400).json({ message: "Categories must be an array." }); const result = await Workspace.findOneAndUpdate({ id: req.params.workspaceId }, { $set: { categories: req.body.categories } }, { new: true, runValidators: true }); if (!result) return res.status(404).json({ message: "Workspace not found." }); res.json(result.toObject()); }));
app.patch("/api/workspaces/:workspaceId/topics/:topicId", asyncRoute(async (req, res) => { const workspace = await Workspace.findOne({ id: req.params.workspaceId }); if (!workspace) return res.status(404).json({ message: "Workspace not found." }); const topic = topicById(workspace.categories.flatMap((category) => category.topics), req.params.topicId); if (!topic) return res.status(404).json({ message: "Topic not found." }); Object.assign(topic, req.body); await workspace.save(); res.json(workspace.toObject()); }));
app.post("/api/workspaces/:workspaceId/categories/:categoryId/topics", asyncRoute(async (req, res) => { const workspace = await Workspace.findOne({ id: req.params.workspaceId }); const category = workspace?.categories.find((item) => item.id === req.params.categoryId); if (!category) return res.status(404).json({ message: "Category not found." }); category.topics.push(req.body); await workspace.save(); res.status(201).json(workspace.toObject()); }));
app.delete("/api/workspaces/:workspaceId/topics/:topicId", asyncRoute(async (req, res) => { const workspace = await Workspace.findOne({ id: req.params.workspaceId }); if (!workspace) return res.status(404).json({ message: "Workspace not found." }); const remove = (topics) => { const index = topics.findIndex((item) => item.id === req.params.topicId); if (index >= 0) { topics.splice(index, 1); return true; } return topics.some((item) => remove(item.subtopics)); }; if (!workspace.categories.some((category) => remove(category.topics))) return res.status(404).json({ message: "Topic not found." }); await workspace.save(); res.status(204).end(); }));
app.patch("/api/workspaces/:workspaceId/topics/:topicId/completion", asyncRoute(async (req, res) => { req.body = { done: req.body.done }; if (typeof req.body.done !== "boolean") return res.status(400).json({ message: "Completion must be true or false." }); const workspace = await Workspace.findOne({ id: req.params.workspaceId }); if (!workspace) return res.status(404).json({ message: "Workspace not found." }); const topic = topicById(workspace.categories.flatMap((category) => category.topics), req.params.topicId); if (!topic) return res.status(404).json({ message: "Topic not found." }); topic.done = req.body.done; await workspace.save(); res.json(workspace.toObject()); }));
app.patch("/api/workspaces/:workspaceId/topics/:topicId/favorite", asyncRoute(async (req, res) => { if (typeof req.body.favorite !== "boolean") return res.status(400).json({ message: "Favorite must be true or false." }); const workspace = await Workspace.findOne({ id: req.params.workspaceId }); if (!workspace) return res.status(404).json({ message: "Workspace not found." }); const topic = topicById(workspace.categories.flatMap((category) => category.topics), req.params.topicId); if (!topic) return res.status(404).json({ message: "Topic not found." }); topic.favorite = req.body.favorite; await workspace.save(); res.json(workspace.toObject()); }));
app.patch("/api/workspaces/:workspaceId/upload", asyncRoute(async (req, res) => { const result = await Workspace.findOneAndUpdate({ id: req.params.workspaceId }, { $set: { uploadedFile: req.body } }, { new: true, runValidators: true }); if (!result) return res.status(404).json({ message: "Workspace not found." }); res.json(result.toObject()); }));

app.post("/api/data/import", asyncRoute(async (req, res) => {
  const { workspaces, activeWorkspaceId, mode } = req.body || {};
  if (!Array.isArray(workspaces) || !workspaces.every(workspaceValid) || !["replace", "merge"].includes(mode)) return res.status(400).json({ message: "Valid import data and mode are required." });
  const cleaned = workspaces.map(cleanWorkspace);
  if (new Set(cleaned.map((workspace) => workspace.id)).size !== cleaned.length) return res.status(400).json({ message: "Import contains duplicate workspace ids." });
  if (mode === "replace") await Workspace.deleteMany({});
  for (const workspace of cleaned) await Workspace.findOneAndUpdate({ id: workspace.id }, workspace, { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true });
  if (activeWorkspaceId === null || id(activeWorkspaceId)) await Profile.updateOne({ key: "default" }, { $set: { activeWorkspaceId } }, { upsert: true });
  res.json(await snapshot());
}));
app.post("/api/migration", asyncRoute(async (req, res) => { req.body.mode = "merge"; const { workspaces, activeWorkspaceId } = req.body; if (!Array.isArray(workspaces) || !workspaces.every(workspaceValid)) return res.status(400).json({ message: "Local data is invalid and was not migrated." }); for (const workspace of workspaces.map(cleanWorkspace)) await Workspace.findOneAndUpdate({ id: workspace.id }, workspace, { upsert: true, runValidators: true }); if (activeWorkspaceId === null || id(activeWorkspaceId)) await Profile.updateOne({ key: "default" }, { $set: { activeWorkspaceId } }, { upsert: true }); res.json(await snapshot()); }));

app.use((_req, res) => res.status(404).json({ message: "API endpoint not found." }));
app.use((error, _req, res, _next) => { console.error("API error:", error.message); if (error?.code === 11000) return res.status(409).json({ message: "That record already exists." }); if (error.name === "ValidationError" || error.name === "CastError") return res.status(400).json({ message: "The submitted data is invalid." }); res.status(500).json({ message: "The server could not complete that request. Please try again." }); });

console.log("Mongo URI exists:", !!process.env.MONGODB_URI);
console.log(
  "Mongo host:",
  process.env.MONGODB_URI?.match(/@([^/]+)/)?.[1]
);

mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 8000 }).then(() => app.listen(PORT, () => console.log(`Study OS API listening on ${PORT}`))).catch((error) => { console.error("MongoDB connection failed:", error.message); process.exit(1); });
