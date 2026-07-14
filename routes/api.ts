
import express from "express";
import * as mindMapController from "../controllers/mindMapController";

const router = express.Router();

router.post("/node-details", mindMapController.getNodeDetails);
router.post("/generate", mindMapController.generateMindMap);
router.get("/health", mindMapController.getHealth);

export default router;
