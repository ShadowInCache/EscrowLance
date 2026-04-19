import express from "express";
import { body } from "express-validator";
import { register, login, profile } from "../controllers/authController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post(
  "/register",
  [
    body("name").notEmpty(),
    body("email").isEmail(),
    body("password").isLength({ min: 8 }),
    body("role").isIn(["client", "freelancer", "admin"]),
    body("walletAddress").notEmpty(),
  ],
  register
);

router.post("/login", login);
router.get("/profile", protect, profile);

export default router;
