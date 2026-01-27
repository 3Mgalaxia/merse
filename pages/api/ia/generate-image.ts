import type { NextApiRequest, NextApiResponse } from "next";
import generateImage from "../generate-image";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  return generateImage(req, res);
}
