import handler from "../../backend/api/portfolio";
import { NextApiRequest, NextApiResponse } from "next";

export default async function apiRoute(req: NextApiRequest, res: NextApiResponse) {
  // Delegate to the existing backend handler
  return handler(req, res);
}
