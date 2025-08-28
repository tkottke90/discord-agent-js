import { Router, Request, Response } from 'express';

function getChat(req: Request, res: Response) {
  res.send('Hello World!');
}


export default function initialize(): Router {
  const router = Router();

  router.get('/', getChat);

  return router;
}