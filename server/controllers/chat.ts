import { RequestHandler, Request } from "express";
import { z } from "zod";
import {
  ControllerHelper,
  ParameterLessControllerHelper,
} from "../utils/controllerHelper";
import { SCOPE } from "../utils/enums";
import { insertChatSchema, updateChatSchema } from "../db/zodSchemaAndTypes";
import * as ChatServices from "../services/user/chatServices";

interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    [key: string]: any;
  };
}

const uuidParamSchema = z.object({
  id: z.string().uuid(),
});

export const getUserChatsController: RequestHandler = async (req, res) => {
  const userId = (req as AuthenticatedRequest).user.id;

  await ParameterLessControllerHelper({
    res,
    logMessage: "Get User Chats",
    serviceMethod: async () => ChatServices.getUserChats(userId),
    scope: SCOPE.USER,
  });
};

export const getChatByIdController: RequestHandler = async (req, res) => {
  const userId = (req as AuthenticatedRequest).user.id;
  const chatId = req.params.chatId;

  await ParameterLessControllerHelper({
    res,
    logMessage: "Get Chat By ID",
    serviceMethod: async () => ChatServices.getSingleChat(chatId, userId),
    scope: SCOPE.USER,
  });
};

export const createChatController: RequestHandler = async (req, res) => {
  const userId = (req as AuthenticatedRequest).user.id;

  await ControllerHelper({
    res,
    logMessage: "Create Chat",
    validationSchema: insertChatSchema,
    validationData: { ...req.body, userId },
    serviceMethod: ChatServices.createNewChat,
    scope: SCOPE.USER,
  });
};

export const updateChatController: RequestHandler = async (req, res) => {
  const userId = (req as AuthenticatedRequest).user.id;
  const chatId = req.params.chatId;

  const chatIdValidation = uuidParamSchema.safeParse({ id: chatId });
  if (!chatIdValidation.success) {
    const { badRequest } = await import("../utils/responseHelper");
    badRequest(res, chatIdValidation.error.errors, "Invalid chat ID");
    return;
  }

  await ControllerHelper({
    res,
    logMessage: "Update Chat",
    validationSchema: updateChatSchema,
    validationData: req.body,
    serviceMethod: async (validatedData: { title?: string }) =>
      ChatServices.updateChatDetails(chatId, userId, validatedData),
    scope: SCOPE.USER,
  });
};

export const deleteChatController: RequestHandler = async (req, res) => {
  const userId = (req as AuthenticatedRequest).user.id;
  const chatId = req.params.chatId;

  await ParameterLessControllerHelper({
    res,
    logMessage: "Delete Chat",
    serviceMethod: async () => ChatServices.deleteUserChat(chatId, userId),
    scope: SCOPE.USER,
  });
};
