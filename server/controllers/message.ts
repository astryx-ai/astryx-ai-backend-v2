import { RequestHandler, Request } from "express";
import { z } from "zod";
import {
  ControllerHelper,
  ParameterLessControllerHelper,
} from "../utils/controllerHelper";
import { SCOPE } from "../utils/enums";
import {
  insertMessageSchema,
  updateMessageSchema,
} from "../db/zodSchemaAndTypes";
import * as MessageServices from "../services/user/messageServices";

export { addMessageAndStreamResponse } from "./streamMessage";

interface AuthenticatedRequest extends Request {
  user?: { id: string };
}

const chatIdParamSchema = z.object({
  chatId: z.string().uuid(),
});

const uuidParamSchema = z.object({
  id: z.string().uuid(),
});

export const getChatMessagesController: RequestHandler = async (req, res) => {
  const userId = (req as AuthenticatedRequest).user?.id as string;
  const chatId = req.params.chatId;

  await ParameterLessControllerHelper({
    res,
    logMessage: "Get Chat Messages",
    serviceMethod: async () => MessageServices.getChatMessages(chatId, userId),
    scope: SCOPE.USER,
  });
};

export const addMessageController: RequestHandler = async (req, res, next) => {
  try {
    const userId = (req as AuthenticatedRequest).user?.id as string;
    const chatId = req.params.chatId;

    const chatIdValidation = chatIdParamSchema.safeParse({ chatId });
    if (!chatIdValidation.success) {
      const { badRequest } = await import("../utils/responseHelper");
      badRequest(res, chatIdValidation.error.errors, "Invalid chat ID");
      return;
    }

    await ControllerHelper({
      res,
      logMessage: "Add Message to Chat",
      validationSchema: insertMessageSchema,
      validationData: { ...req.body, userId, chatId },
      serviceMethod: MessageServices.addMessageToChat,
      scope: SCOPE.USER,
    });
  } catch (error) {
    next(error);
  }
};

export const updateMessageController: RequestHandler = async (req, res) => {
  const userId = (req as AuthenticatedRequest).user?.id as string;
  const messageId = req.params.messageId;

  const messageIdValidation = uuidParamSchema.safeParse({ id: messageId });
  if (!messageIdValidation.success) {
    const { badRequest } = await import("../utils/responseHelper");
    badRequest(res, messageIdValidation.error.errors, "Invalid message ID");
    return;
  }

  await ControllerHelper({
    res,
    logMessage: "Update Message",
    validationSchema: updateMessageSchema,
    validationData: req.body,
    serviceMethod: async (validatedData: { content?: string }) =>
      MessageServices.updateChatMessage(messageId, userId, validatedData),
    scope: SCOPE.USER,
  });
};
