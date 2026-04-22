import express from 'express';
import { verifyToken } from '../middlewares/verifyToken.js';
import { requireRole } from '../middlewares/requireRole.js';
import {
  setBranchOperatingPeriod,
  getBranchOperatingPeriod,
  setBranchWeeklySchedule,
  getBranchWeeklySchedule,
  addBranchClosure,
  getBranchClosures,
  deleteBranchClosure,
  checkBranchStatus,
  getBranchScheduleInfo
} from '../controllers/branchScheduleController.js';

const router = express.Router();

// Operating period routes
router.post('/operating-period', verifyToken, requireRole(3), setBranchOperatingPeriod);
router.get('/operating-period/:branchId', verifyToken, getBranchOperatingPeriod);

// Weekly schedule routes
router.post('/weekly-schedule', verifyToken, requireRole(3), setBranchWeeklySchedule);
router.get('/weekly-schedule/:branchId', verifyToken, getBranchWeeklySchedule);

// Closure routes
router.post('/closures', verifyToken, requireRole(3), addBranchClosure);
router.get('/closures/:branchId', verifyToken, getBranchClosures);
router.delete('/closures/:closureId', verifyToken, requireRole(3), deleteBranchClosure);

// Status check routes
router.get('/status/:branchId', verifyToken, checkBranchStatus);
router.get('/schedule-info/:branchId', verifyToken, getBranchScheduleInfo);

export default router;
