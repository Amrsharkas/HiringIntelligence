import { Router } from "express";
import { z } from "zod";
import { db } from "../../db";
import { tutorialSlides, insertTutorialSlideSchema } from "../../../shared/schema";
import { eq, and, asc } from "drizzle-orm";
import { requireSuperAdmin } from "../../middleware/superAdmin.middleware";

const router = Router();

// All admin routes require super admin authentication
router.use(requireSuperAdmin);

// Get all tutorial slides (for super-admin management)
router.get("/slides", async (req, res, next) => {
  try {

    const slides = await db
      .select()
      .from(tutorialSlides)
      .orderBy(asc(tutorialSlides.order));

    res.json(slides);
  } catch (error) {
    next(error);
  }
});

// Get active tutorial slides for specific audience (public endpoint for hiring app)
router.get("/slides/active", async (req, res, next) => {
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

// Create new tutorial slide
router.post("/slides", async (req, res, next) => {
  try {
    // Get the highest order number and increment
    const lastSlide = await db
      .select({ order: tutorialSlides.order })
      .from(tutorialSlides)
      .orderBy(tutorialSlides.order)
      .limit(1);

    const nextOrder = lastSlide.length > 0 ? lastSlide[0].order + 1 : 1;

    const validatedData = insertTutorialSlideSchema.parse({
      ...req.body,
      createdBy: req.user.id,
      order: nextOrder, // Add the order here
    });

    const [newSlide] = await db
      .insert(tutorialSlides)
      .values(validatedData)
      .returning();

    res.status(201).json(newSlide);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Invalid input", errors: error.errors });
    }
    next(error);
  }
});

// Update tutorial slide
router.put("/slides/:id", async (req, res, next) => {
  try {

    const { id } = req.params;
    const validatedData = insertTutorialSlideSchema.partial().parse(req.body);

    const [updatedSlide] = await db
      .update(tutorialSlides)
      .set({
        ...validatedData,
        updatedAt: new Date(),
      })
      .where(eq(tutorialSlides.id, id))
      .returning();

    if (!updatedSlide) {
      return res.status(404).json({ message: "Tutorial slide not found" });
    }

    res.json(updatedSlide);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Invalid input", errors: error.errors });
    }
    next(error);
  }
});

// Delete tutorial slide
router.delete("/slides/:id", async (req, res, next) => {
  try {

    const { id } = req.params;

    const [deletedSlide] = await db
      .delete(tutorialSlides)
      .where(eq(tutorialSlides.id, id))
      .returning();

    if (!deletedSlide) {
      return res.status(404).json({ message: "Tutorial slide not found" });
    }

    res.json({ message: "Tutorial slide deleted successfully" });
  } catch (error) {
    next(error);
  }
});

// Reorder tutorial slides
router.put("/slides/reorder", async (req, res, next) => {
  try {

    const { slideIds } = req.body;

    if (!Array.isArray(slideIds)) {
      return res.status(400).json({ message: "slideIds must be an array" });
    }

    // Update each slide's order
    const updatePromises = slideIds.map((id: string, index: number) =>
      db
        .update(tutorialSlides)
        .set({ order: index + 1, updatedAt: new Date() })
        .where(eq(tutorialSlides.id, id))
    );

    await Promise.all(updatePromises);

    res.json({ message: "Slides reordered successfully" });
  } catch (error) {
    next(error);
  }
});

export default router;