import express from 'express';
import { lookupPincode } from '../Controller/Pincode.js';

const router = express.Router();

router.get('/', lookupPincode);

export default router;
