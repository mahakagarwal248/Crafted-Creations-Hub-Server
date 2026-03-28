import express from 'express';
import { sendCheckoutEmail } from '../Controller/Checkout.js';

const router = express.Router();

router.post('/send-email', sendCheckoutEmail);

export default router;
