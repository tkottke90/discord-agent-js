import { Router, Request, Response } from 'express';

function getChat(req: Request, res: Response) {
  res.status(200).json({ message: 'Hello Chat!' });
}

export default function initialize(): Router {
  const router = Router();

  router.get('/', getChat);

  return router;
}
