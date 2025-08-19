import { updateChatSchema, updateMessageSchema } from "../db/zodSchemaAndTypes";
import { RequestHandler, Request } from "express";
import {
  ControllerHelper,
  ParameterLessControllerHelper,
} from "../utils/controllerHelper";
import { SCOPE } from "../utils/enums";
import * as UserService from "../services/user";
import {
  insertChatSchema,
  insertMessageSchema,
  updateUserDataSchema,
  sendOTPSchema,
  verifyOTPSchema,
} from "../db/zodSchemaAndTypes";
import { z } from "zod";
import * as ResponseHelper from "../utils/responseHelper";

// Extend the Express Request type to include user property
interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    [key: string]: any;
  };
}

// Define a schema for validating UUID parameters
const uuidParamSchema = z.object({
  id: z.string().uuid(),
});

// Chat controllers
export const getUserChatsController: RequestHandler = async (req, res) => {
  const userId = (req as AuthenticatedRequest).user.id;

  await ParameterLessControllerHelper({
    res,
    logMessage: "Get User Chats",
    serviceMethod: async () => UserService.getUserChats(userId),
    scope: SCOPE.USER,
  });
};

export const getChatByIdController: RequestHandler = async (req, res) => {
  const userId = (req as AuthenticatedRequest).user.id;
  const chatId = req.params.chatId;

  await ParameterLessControllerHelper({
    res,
    logMessage: "Get Chat By ID",
    serviceMethod: async () => UserService.getSingleChat(chatId, userId),
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
    serviceMethod: UserService.createNewChat,
    scope: SCOPE.USER,
  });
};

export const deleteChatController: RequestHandler = async (req, res) => {
  const userId = (req as AuthenticatedRequest).user.id;
  const chatId = req.params.chatId;

  await ParameterLessControllerHelper({
    res,
    logMessage: "Delete Chat",
    serviceMethod: async () => UserService.deleteUserChat(chatId, userId),
    scope: SCOPE.USER,
  });
};

// Message controllers
export const getChatMessagesController: RequestHandler = async (req, res) => {
  const userId = (req as AuthenticatedRequest).user.id;
  const chatId = req.params.chatId;

  await ParameterLessControllerHelper({
    res,
    logMessage: "Get Chat Messages",
    serviceMethod: async () => UserService.getChatMessages(chatId, userId),
    scope: SCOPE.USER,
  });
};

// Define a schema for validating the chat ID parameter
const chatIdParamSchema = z.object({
  chatId: z.string().uuid(),
});

export const addMessageController: RequestHandler = async (req, res, next) => {
  try {
    const userId = (req as AuthenticatedRequest).user.id;
    const chatId = req.params.chatId;

    // Validate chatId
    const chatIdValidation = chatIdParamSchema.safeParse({ chatId });
    if (!chatIdValidation.success) {
      ResponseHelper.badRequest(
        res,
        chatIdValidation.error.errors,
        "Invalid chat ID"
      );
      return;
    }

    await ControllerHelper({
      res,
      logMessage: "Add Message to Chat",
      validationSchema: insertMessageSchema,
      validationData: { ...req.body, userId, chatId },
      serviceMethod: UserService.addMessageToChat,
      scope: SCOPE.USER,
    });
  } catch (error) {
    next(error);
  }
};

// User profile controllers
export const getUserProfileController: RequestHandler = async (req, res) => {
  const userId = (req as AuthenticatedRequest).user.id;

  await ParameterLessControllerHelper({
    res,
    logMessage: "Get User Profile",
    serviceMethod: async () => UserService.getUserProfile(userId),
    scope: SCOPE.USER,
  });
};

export const updateUserDataController: RequestHandler = async (req, res) => {
  const userId = (req as AuthenticatedRequest).user.id;

  await ControllerHelper({
    res,
    logMessage: "Update User Data",
    validationSchema: updateUserDataSchema,
    validationData: req.body,
    serviceMethod: async (validatedData: {
      phone?: string;
      displayName?: string;
      userMetadata?: any;
    }) => UserService.updateUserOnboardingData(userId, validatedData),
    scope: SCOPE.USER,
  });
};

// Phone verification controllers
export const sendPhoneVerificationController: RequestHandler = async (
  req,
  res
) => {
  const userId = (req as AuthenticatedRequest).user.id;

  await ControllerHelper({
    res,
    logMessage: "Send Phone Verification OTP",
    validationSchema: sendOTPSchema,
    validationData: req.body,
    serviceMethod: async (validatedData: { phoneNumber: string }) =>
      UserService.sendPhoneVerificationOTP(validatedData.phoneNumber, userId),
    scope: SCOPE.USER,
  });
};

export const verifyPhoneController: RequestHandler = async (req, res) => {
  const userId = (req as AuthenticatedRequest).user.id;

  await ControllerHelper({
    res,
    logMessage: "Verify Phone Number",
    validationSchema: verifyOTPSchema,
    validationData: req.body,
    serviceMethod: async (validatedData: {
      phoneNumber: string;
      otp: string;
    }) =>
      UserService.verifyPhoneAndUpdate(
        userId,
        validatedData.phoneNumber,
        validatedData.otp
      ),
    scope: SCOPE.USER,
  });
};

export const updateChatController: RequestHandler = async (req, res) => {
  const userId = (req as AuthenticatedRequest).user.id;
  const chatId = req.params.chatId;

  // Validate chatId
  const chatIdValidation = uuidParamSchema.safeParse({ id: chatId });
  if (!chatIdValidation.success) {
    ResponseHelper.badRequest(
      res,
      chatIdValidation.error.errors,
      "Invalid chat ID"
    );
    return;
  }

  await ControllerHelper({
    res,
    logMessage: "Update Chat",
    validationSchema: updateChatSchema,
    validationData: req.body,
    serviceMethod: async (validatedData: { title?: string }) =>
      UserService.updateChatDetails(chatId, userId, validatedData),
    scope: SCOPE.USER,
  });
};

export const updateMessageController: RequestHandler = async (req, res) => {
  const userId = (req as AuthenticatedRequest).user.id;
  const messageId = req.params.messageId;

  // Validate messageId
  const messageIdValidation = uuidParamSchema.safeParse({ id: messageId });
  if (!messageIdValidation.success) {
    ResponseHelper.badRequest(
      res,
      messageIdValidation.error.errors,
      "Invalid message ID"
    );
    return;
  }

  await ControllerHelper({
    res,
    logMessage: "Update Message",
    validationSchema: updateMessageSchema,
    validationData: req.body,
    serviceMethod: async (validatedData: { content?: string }) =>
      UserService.updateChatMessage(messageId, userId, validatedData),
    scope: SCOPE.USER,
  });
};
