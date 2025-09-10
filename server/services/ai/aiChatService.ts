import { ENV } from "../../config/env";

interface AIChatRequest {
  query: string;
  user_id: string;
  chat_id: string;
}

interface AIChatResponse {
  success: boolean;
  error?: string;
  data?: {
    response: string;
    chart_data: any;
    tokens_used: number;
    cost: number;
  };
}

export class AIChatService {
  private static readonly AI_MICROSERVICE_URL = ENV.AI_MICROSERVICE_URL;
  private static readonly CHAT_INVOKE_ENDPOINT = "/chat/message";

  /**
   * Send a query to the AI microservice and get response
   */
  static async processUserQuery(
    userId: string,
    query: string,
    chatId: string
  ): Promise<AIChatResponse> {
    try {
      if (!query || query.trim().length === 0 || !chatId) {
        return {
          success: false,
          error: "Empty query",
        };
      }

      const requestBody: AIChatRequest = {
        query: query.trim(),
        user_id: userId,
        chat_id: chatId,
      };

      const response = await fetch(
        `${this.AI_MICROSERVICE_URL}${this.CHAT_INVOKE_ENDPOINT}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestBody),
        }
      );

      if (!response.ok) {
        console.error(
          `AI microservice error: ${response.status} ${response.statusText}`
        );
        return {
          success: false,
          error: `HTTP ${response.status}`,
        };
      }

      const aiResponse: AIChatResponse = await response.json();

      if (!aiResponse.data) {
        console.error("Invalid AI response structure:", aiResponse);
        return {
          success: false,
          error: "Invalid response structure",
        };
      }

      return {
        success: true,
        data: {
          response: aiResponse.data.response,
          chart_data: aiResponse.data.chart_data,
          tokens_used: aiResponse.data.tokens_used,
          cost: aiResponse.data.cost,
        },
      };
    } catch (error: any) {
      console.error("Error calling AI microservice:", error);

      if (error.name === "TypeError" && error.message.includes("fetch")) {
        return {
          success: false,
          error: "Network error",
        };
      }

      return {
        success: false,
        error: error.message || "Unknown error",
      };
    }
  }

  /**
   * Validate if AI microservice is reachable
   */
  static async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.AI_MICROSERVICE_URL}/health`, {
        method: "GET",
      });
      return response.ok;
    } catch (error) {
      console.error("AI microservice health check failed:", error);
      return false;
    }
  }

  /**
   * Get AI microservice URL for debugging
   */
  static getServiceUrl(): string {
    return this.AI_MICROSERVICE_URL;
  }
}
