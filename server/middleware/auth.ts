import { Request, Response, NextFunction } from "express";
import { supabase } from "../db/supabase";
import * as ResponseHelper from "../utils/responseHelper";

// Extend the Express Request type to include user property
interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    [key: string]: any;
  };
}

export const verifyToken = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    ResponseHelper.notAuthorized(res, "No token provided or token is invalid.");
    return;
  }

  const token = authHeader.split(" ")[1];

  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);

    if (error || !user) {
      ResponseHelper.notAuthorized(res, "Invalid or expired token.");
      return;
    }

    // Attach user to the request object
    (req as AuthenticatedRequest).user = user;
    next();
  } catch (err) {
    ResponseHelper.error(
      res,
      err,
      "An error occurred during token verification."
    );
    return;
  }
};
