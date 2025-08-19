import { TelegramBotService } from "../services/telegram/telegramService";

/**
 * Utility script to manage Telegram Bot webhooks
 * Run this script to set up or manage your Telegram bot webhook
 */

async function setTelegramWebhook(webhookUrl: string) {
  try {
    console.log(`Setting Telegram webhook to: ${webhookUrl}`);

    const result = await TelegramBotService.setWebhook(webhookUrl);

    if (result.success) {
      console.log("✅ Webhook set successfully!");
      console.log("Result:", result.data);
    } else {
      console.error("❌ Failed to set webhook");
    }
  } catch (error) {
    console.error("❌ Error setting webhook:", error);
  }
}

async function getWebhookInfo() {
  try {
    console.log("Getting webhook info...");

    const result = await TelegramBotService.getWebhookInfo();

    if (result.success) {
      console.log("✅ Webhook info retrieved:");
      console.log(JSON.stringify(result.data, null, 2));
    } else {
      console.error("❌ Failed to get webhook info");
    }
  } catch (error) {
    console.error("❌ Error getting webhook info:", error);
  }
}

async function deleteWebhook() {
  try {
    console.log("Deleting webhook...");

    const result = await TelegramBotService.deleteWebhook();

    if (result.success) {
      console.log("✅ Webhook deleted successfully!");
      console.log("Result:", result.data);
    } else {
      console.error("❌ Failed to delete webhook");
    }
  } catch (error) {
    console.error("❌ Error deleting webhook:", error);
  }
}

// Main function
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  if (!command) {
    console.log(`
📱 Telegram Bot Webhook Manager

Usage:
  npm run telegram:webhook set <webhook_url>    - Set webhook URL
  npm run telegram:webhook info                 - Get current webhook info  
  npm run telegram:webhook delete               - Delete current webhook

Examples:
  npm run telegram:webhook set https://yourdomain.com/telegram/webhook
  npm run telegram:webhook info
  npm run telegram:webhook delete
    `);
    process.exit(1);
  }

  switch (command) {
    case "set":
      const webhookUrl = args[1];
      if (!webhookUrl) {
        console.error("❌ Please provide a webhook URL");
        console.log("Usage: npm run telegram:webhook set <webhook_url>");
        process.exit(1);
      }
      await setTelegramWebhook(webhookUrl);
      break;

    case "info":
      await getWebhookInfo();
      break;

    case "delete":
      await deleteWebhook();
      break;

    default:
      console.error(`❌ Unknown command: ${command}`);
      console.log("Available commands: set, info, delete");
      process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  main().catch(console.error);
}

export { setTelegramWebhook, getWebhookInfo, deleteWebhook };
