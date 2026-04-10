import express from "express";
import {
  createProject,
  listProjects,
  getProject,
  updateStatus,
  fundProject,
  assignFreelancer,
  deployProject,
  cancelProject,
  refundClient,
  deleteProject,
} from "../controllers/projectController.js";
import { protect, requireRole } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/create", protect, requireRole(["client", "admin"]), createProject);
router.get("/", protect, listProjects);
router.get("/:id", protect, getProject);
router.post("/:id/deploy", protect, requireRole(["client", "admin"]), deployProject);
router.put("/:id/status", protect, updateStatus);
router.post("/:id/fund", protect, requireRole(["client", "admin"]), fundProject);
router.post("/:id/assign", protect, requireRole(["client", "admin"]), assignFreelancer);
router.post("/:id/cancel", protect, requireRole(["client", "admin"]), cancelProject);
router.delete("/:id", protect, deleteProject);
router.post("/:id/refund", protect, requireRole(["client", "admin"]), refundClient);

export default router;
