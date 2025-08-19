# Astryx Backend API Documentation

This document provides a comprehensive guide to all API endpoints available in the Astryx backend system.

## Authentication

All user and admin routes require authentication using a Bearer token.

**Header format:**

```
Authorization: Bearer <your_token>
```

---

## Service Routes

These routes are publicly accessible and don't require authentication.

### Health Check

Check the health status of the API and its connected services.

- **URL**: `/health`
- **Method**: `GET`
- **Auth Required**: No
- **Response**:
  ```json
  {
    "success": true,
    "message": "Health check completed",
    "data": {
      "service": {
        "status": "OK",
        "time": "2023-07-25T12:34:56.789Z"
      },
      "database": {
        "status": "OK"
      },
      "microservice": {
        "status": "OK",
        "details": {
          /* microservice specific details */
        }
      }
    }
  }
  ```

### Welcome Route

Simple welcome message to confirm API is running.

- **URL**: `/`
- **Method**: `GET`
- **Auth Required**: No
- **Response**:
  ```json
  {
    "message": "Welcome to our API"
  }
  ```

---

## User Routes

All user routes are prefixed with `/user` and require authentication.

### User Profile Management

#### Get User Profile

Retrieve the authenticated user's profile information.

- **URL**: `/user/me`
- **Method**: `GET`
- **Auth Required**: Yes
- **Response**:
  ```json
  {
    "success": true,
    "message": "User profile retrieved successfully",
    "data": {
      "id": "user-uuid",
      "email": "user@example.com",
      "phone": "+1234567890",
      "displayName": "John Doe",
      "createdAt": "2023-07-25T10:00:00.789Z",
      "lastSignInAt": "2023-07-25T12:00:00.789Z",
      "userMetadata": {},
      "appMetadata": {}
    }
  }
  ```

#### Update User Profile

Update the authenticated user's profile information.

- **URL**: `/user/me`
- **Method**: `PUT`
- **Auth Required**: Yes
- **Request Body**:
  ```json
  {
    "phone": "+1234567890",
    "displayName": "John Doe Updated",
    "userMetadata": {
      "preferences": {
        "theme": "dark"
      }
    }
  }
  ```
- **Response**:
  ```json
  {
    "success": true,
    "message": "User profile updated successfully",
    "data": {
      "id": "user-uuid",
      "email": "user@example.com",
      "phone": "+1234567890",
      "displayName": "John Doe Updated",
      "createdAt": "2023-07-25T10:00:00.789Z",
      "lastSignInAt": "2023-07-25T12:00:00.789Z",
      "userMetadata": {
        "preferences": {
          "theme": "dark"
        }
      }
    }
  }
  ```

### Phone Verification

#### Send Phone Verification OTP

Send an OTP for phone number verification.

- **URL**: `/user/send-phone-verification`
- **Method**: `POST`
- **Auth Required**: Yes
- **Request Body**:
  ```json
  {
    "phoneNumber": "+1234567890"
  }
  ```
- **Response**:
  ```json
  {
    "success": true,
    "message": "OTP sent successfully",
    "data": {
      "message": "Verification code sent to +1234567890"
    }
  }
  ```

#### Verify Phone Number

Verify the phone number using the OTP.

- **URL**: `/user/verify-phone`
- **Method**: `POST`
- **Auth Required**: Yes
- **Request Body**:
  ```json
  {
    "phoneNumber": "+1234567890",
    "otp": "123456"
  }
  ```
- **Response**:
  ```json
  {
    "success": true,
    "message": "Phone number verified successfully",
    "data": {
      "verified": true,
      "phoneNumber": "+1234567890"
    }
  }
  ```

### Chat Management

#### Get All Chats

Retrieve all chats for the authenticated user.

- **URL**: `/user/chats`
- **Method**: `GET`
- **Auth Required**: Yes
- **Response**:
  ```json
  {
    "success": true,
    "message": "Chats retrieved successfully",
    "data": [
      {
        "id": "chat-uuid-1",
        "userId": "user-uuid",
        "title": "Chat Title 1",
        "isWhatsapp": false,
        "createdAt": "2023-07-25T12:34:56.789Z",
        "updatedAt": "2023-07-25T13:20:00.789Z"
      },
      {
        "id": "chat-uuid-2",
        "userId": "user-uuid",
        "title": "Chat Title 2",
        "isWhatsapp": false,
        "createdAt": "2023-07-25T12:45:56.789Z",
        "updatedAt": "2023-07-25T14:10:00.789Z"
      }
    ]
  }
  ```

#### Get Chat by ID

Retrieve a specific chat by its ID.

- **URL**: `/user/chats/:chatId`
- **Method**: `GET`
- **Auth Required**: Yes
- **URL Parameters**: `chatId=[uuid]`
- **Response**:
  ```json
  {
    "success": true,
    "message": "Chat retrieved successfully",
    "data": {
      "id": "chat-uuid-1",
      "userId": "user-uuid",
      "title": "Chat Title 1",
      "isWhatsapp": false,
      "createdAt": "2023-07-25T12:34:56.789Z",
      "updatedAt": "2023-07-25T13:20:00.789Z"
    }
  }
  ```
- **Error Response** (Chat not found):
  ```json
  {
    "success": false,
    "message": "Chat not found",
    "data": "Chat not found"
  }
  ```

#### Create New Chat

Create a new chat for the authenticated user.

- **URL**: `/user/chats`
- **Method**: `POST`
- **Auth Required**: Yes
- **Request Body**:
  ```json
  {
    "title": "New Chat Title"
  }
  ```
- **Response**:
  ```json
  {
    "success": true,
    "message": "Chat created successfully",
    "data": {
      "id": "new-chat-uuid",
      "userId": "user-uuid",
      "title": "New Chat Title",
      "isWhatsapp": false,
      "createdAt": "2023-07-25T13:34:56.789Z",
      "updatedAt": "2023-07-25T13:34:56.789Z"
    }
  }
  ```
- **Error Response** (Validation error):
  ```json
  {
    "success": false,
    "message": "Invalid Credentials",
    "data": [
      {
        "code": "invalid_type",
        "expected": "string",
        "received": "undefined",
        "path": ["title"],
        "message": "Required"
      }
    ]
  }
  ```

#### Update Chat

Update a specific chat's details (e.g., title).

- **URL**: `/user/chats/:chatId`
- **Method**: `PUT`
- **Auth Required**: Yes
- **URL Parameters**: `chatId=[uuid]`
- **Request Body**:
  ```json
  {
    "title": "Updated Chat Title"
  }
  ```
- **Response**:
  ```json
  {
    "success": true,
    "message": "Chat updated successfully",
    "data": {
      "id": "chat-uuid",
      "userId": "user-uuid",
      "title": "Updated Chat Title",
      "createdAt": "2023-07-25T12:34:56.789Z",
      "updatedAt": "2023-07-25T14:00:00.789Z"
    }
  }
  ```
- **Error Response** (Chat not found):
  ```json
  {
    "success": false,
    "message": "Chat not found",
    "data": "Chat not found"
  }
  ```
- **Error Response** (No updates provided):
  ```json
  {
    "success": false,
    "message": "No updates provided",
    "data": "No updates provided"
  }
  ```

#### Delete Chat

Delete a specific chat by its ID.

- **URL**: `/user/chats/:chatId`
- **Method**: `DELETE`
- **Auth Required**: Yes
- **URL Parameters**: `chatId=[uuid]`
- **Response**:
  ```json
  {
    "success": true,
    "message": "Chat deleted successfully",
    "data": {
      "id": "deleted-chat-uuid",
      "userId": "user-uuid",
      "title": "Deleted Chat Title",
      "createdAt": "2023-07-25T12:34:56.789Z",
      "updatedAt": "2023-07-25T13:30:00.789Z"
    }
  }
  ```
- **Error Response** (Chat not found):
  ```json
  {
    "success": false,
    "message": "Chat not found",
    "data": "Chat not found"
  }
  ```

### Message Management

#### Get Chat Messages

Retrieve all messages for a specific chat.

- **URL**: `/user/chats/:chatId/messages`
- **Method**: `GET`
- **Auth Required**: Yes
- **URL Parameters**: `chatId=[uuid]`
- **Response**:
  ```json
  {
    "success": true,
    "message": "Messages retrieved successfully",
    "data": [
      {
        "id": "message-uuid-1",
        "chatId": "chat-uuid-1",
        "userId": "user-uuid",
        "content": "Hello AI assistant!",
        "isAi": false,
        "isWhatsapp": false,
        "createdAt": "2023-07-25T12:34:56.789Z",
        "updatedAt": "2023-07-25T12:34:56.789Z"
      },
      {
        "id": "message-uuid-2",
        "chatId": "chat-uuid-1",
        "userId": "user-uuid",
        "content": "Hello! How can I help you today?",
        "isAi": true,
        "isWhatsapp": false,
        "createdAt": "2023-07-25T12:35:00.789Z",
        "updatedAt": "2023-07-25T12:35:00.789Z",
        "aiAnswer": "Hello! How can I help you today?",
        "aiWhatsappSummary": "Greeting response",
        "aiConversationId": "conv-123",
        "aiTokensUsed": 15,
        "aiCost": "0.000150",
        "aiChartData": null
      }
    ]
  }
  ```
- **Error Response** (Chat not found):
  ```json
  {
    "success": false,
    "message": "Chat not found",
    "data": "Chat not found"
  }
  ```

#### Add Message to Chat

Add a new message to a specific chat.

- **URL**: `/user/chats/:chatId/messages`
- **Method**: `POST`
- **Auth Required**: Yes
- **URL Parameters**: `chatId=[uuid]`
- **Request Body**:
  ```json
  {
    "content": "What can you tell me about quantum computing?",
    "isAi": false
  }
  ```
- **Response**:
  ```json
  {
    "success": true,
    "message": "Message created successfully",
    "data": {
      "id": "new-message-uuid",
      "chatId": "chat-uuid-1",
      "userId": "user-uuid",
      "content": "What can you tell me about quantum computing?",
      "isAi": false,
      "isWhatsapp": false,
      "createdAt": "2023-07-25T13:45:56.789Z",
      "updatedAt": "2023-07-25T13:45:56.789Z"
    }
  }
  ```
- **Error Response** (Validation error):
  ```json
  {
    "success": false,
    "message": "Invalid Credentials",
    "data": [
      {
        "code": "invalid_type",
        "expected": "string",
        "received": "undefined",
        "path": ["content"],
        "message": "Required"
      }
    ]
  }
  ```
- **Error Response** (Invalid chat ID):
  ```json
  {
    "success": false,
    "message": "Invalid chat ID",
    "data": [
      {
        "validation": "uuid",
        "code": "invalid_string",
        "message": "Invalid uuid",
        "path": ["chatId"]
      }
    ]
  }
  ```

#### Update Message

Update a specific message's content.

- **URL**: `/user/messages/:messageId`
- **Method**: `PUT`
- **Auth Required**: Yes
- **URL Parameters**: `messageId=[uuid]`
- **Request Body**:
  ```json
  {
    "content": "Updated message content"
  }
  ```
- **Response**:
  ```json
  {
    "success": true,
    "message": "Message updated successfully",
    "data": {
      "id": "message-uuid",
      "chatId": "chat-uuid",
      "userId": "user-uuid",
      "content": "Updated message content",
      "isAi": false,
      "createdAt": "2023-07-25T12:34:56.789Z",
      "updatedAt": "2023-07-25T14:00:00.789Z"
    }
  }
  ```
- **Error Response** (Message not found):
  ```json
  {
    "success": false,
    "message": "Message not found",
    "data": "Message not found"
  }
  ```
- **Error Response** (Cannot update AI messages):
  ```json
  {
    "success": false,
    "message": "Cannot update AI messages",
    "data": "Cannot update AI messages"
  }
  ```
- **Error Response** (Invalid message ID):
  ```json
  {
    "success": false,
    "message": "Invalid message ID",
    "data": [
      {
        "validation": "uuid",
        "code": "invalid_string",
        "message": "Invalid uuid",
        "path": ["id"]
      }
    ]
  }
  ```

---

## Admin Routes

Currently, the admin routes are commented out in the codebase and not active.

---

## Error Responses

### Authentication Errors

- **Status Code**: `401 Unauthorized`
- **Response**:
  ```json
  {
    "success": false,
    "data": {
      "message": "No token provided or token is invalid."
    }
  }
  ```

### Server Errors

- **Status Code**: `500 Internal Server Error`
- **Response**:
  ```json
  {
    "success": false,
    "message": "Something went wrong"
  }
  ```

## Frontend Implementation Guide

### Authentication Flow

1. Authenticate with Supabase to obtain a JWT token
2. Store the token securely (e.g., in localStorage or a secure cookie)
3. Include the token in all API requests that require authentication:
   ```javascript
   const headers = {
     Authorization: `Bearer ${token}`,
     "Content-Type": "application/json",
   };
   ```

### Chat Management Implementation

#### Creating a New Chat

```javascript
async function createNewChat(title) {
  const response = await fetch("/user/chats", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ title }),
  });

  return await response.json();
}
```

#### Loading User's Chats

```javascript
async function loadUserChats() {
  const response = await fetch("/user/chats", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return await response.json();
}
```

### Message Management Implementation

#### Sending a Message

```javascript
async function sendMessage(chatId, content, isAi = false) {
  const response = await fetch(`/user/chats/${chatId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ content, isAi }),
  });

  return await response.json();
}
```

#### Loading Chat Messages

```javascript
async function loadChatMessages(chatId) {
  const response = await fetch(`/user/chats/${chatId}/messages`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return await response.json();
}
```

#### Updating a Chat

```javascript
async function updateChat(chatId, updateData) {
  const response = await fetch(`/user/chats/${chatId}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(updateData),
  });

  return await response.json();
}
```

#### Updating a Message

```javascript
async function updateMessage(messageId, updateData) {
  const response = await fetch(`/user/messages/${messageId}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(updateData),
  });

  return await response.json();
}
```

### Handling Errors

```javascript
async function makeApiRequest(url, options) {
  try {
    const response = await fetch(url, options);
    const data = await response.json();

    if (!data.success) {
      // Handle API error
      console.error("API Error:", data.message);
      // Show error to user
    }

    return data;
  } catch (error) {
    // Handle network error
    console.error("Network Error:", error);
    // Show error to user
  }
}
```

### Typical Chat Flow

1. User logs in → Obtain authentication token
2. Load user's existing chats or create a new one
3. Select a chat to view its messages
4. Send user messages and receive AI responses
5. Optionally delete chats when no longer needed
