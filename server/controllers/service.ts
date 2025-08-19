import { Request, Response } from "express";
import { db } from "../db";
import axios from "axios";
import { sql } from "drizzle-orm";
import { AppStatus, ServiceStatus } from "../utils/types";
import * as ResponseHelper from "../utils/responseHelper";
import { ENV } from "../config/env";

// Health check route
export const healthCheck = async (req: Request, res: Response) => {
  try {
    // App status
    const appStatus: AppStatus = {
      status: "OK",
      time: new Date().toISOString(),
    };

    // Database check
    let dbStatus: ServiceStatus = { status: "OK" };
    try {
      // Simple DB query to verify connection
      await db.execute(sql`SELECT 1`);
    } catch (error) {
      dbStatus = { status: "ERROR", message: (error as Error).message };
    }

    // Microservice check
    let microserviceStatus: ServiceStatus = { status: "OK" };
    try {
      const microserviceUrl = ENV.AI_MICROSERVICE_URL;

      const response = await axios.get(`${microserviceUrl}/health`);
      microserviceStatus = { status: "OK" };
    } catch (error) {
      microserviceStatus = {
        status: "ERROR",
        message: error instanceof Error ? error.message : "Unknown error",
      };
    }

    // Return combined health information
    return ResponseHelper.success(
      res,
      {
        service: appStatus,
        database: dbStatus,
        microservice: microserviceStatus,
      },
      "Health check completed"
    );
  } catch (error) {
    return ResponseHelper.error(res, error, "Health check failed");
  }
};
