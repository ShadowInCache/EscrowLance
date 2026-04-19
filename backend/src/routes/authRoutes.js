import express from "express";
import { body } from "express-validator";
import { register, login, profile } from "../controllers/authController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post(
  "/register",
  [
    body("name").trim().notEmpty(),
    body("email").isEmail().normalizeEmail(),
    body("password").isLength({ min: 8 }),
    body("role").isIn(["client", "freelancer", "admin"]),
    body("walletAddress").matches(/^0x[a-fA-F0-9]{40}$/),
  ],
  register
);

router.post("/login", [body("email").isEmail().normalizeEmail(), body("password").notEmpty()], login);
router.get("/profile", protect, profile);

export default router;
