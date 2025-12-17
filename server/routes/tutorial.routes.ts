import { Router } from "express";
import { db } from "../db";
import { tutorialSlides } from "../../shared/schema";
import { eq, and, asc } from "drizzle-orm";
import { requireAuth } from "../auth";

const router = Router();

// Get active tutorial slides for specific audience (available to any authenticated user)
router.get("/slides/active", requireAuth, async (req, res, next) => {
  try {
    const { audience = "hiring" } = req.query;

    const slides = await db
      .select()
      .from(tutorialSlides)
      .where(
        and(
          eq(tutorialSlides.isActive, true),
          eq(tutorialSlides.targetAudience, audience as string)
        )
      )
      .orderBy(asc(tutorialSlides.order));

    res.json(slides);
  } catch (error) {
    next(error);
  }
});

export default router;
