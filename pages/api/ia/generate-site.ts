import type { NextApiRequest, NextApiResponse } from "next";
import generateSite from "../generate-site";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  return generateSite(req, res);
}
