import ably from "../utils/ablyConfig.js";

// Service for handling real-time notifications via Ably
class AblyService {
	// Send a notification to a specific house channel
	static async sendToHouse(houseCode, eventName, data) {
		if (!ably) {
			return;
		}
		
		try {
			const channel = ably.channels.get(`house:${houseCode}`);
			await channel.publish(eventName, data);
		} catch (error) {
			console.error(`[Ably] Error sending ${eventName} to house:${houseCode}:`, error.message);
		}
	}

	// Send a fetch update to refresh data for all house members
	static async sendFetchUpdate(houseCode) {
		return this.sendToHouse(houseCode, "fetchUpdate", {
			timestamp: Date.now(),
		});
	}

	// Send a resolution request
	static async sendResolutionRequest(houseCode, requestData) {
		return this.sendToHouse(houseCode, "resolutionRequest", requestData);
	}

	// Send a resolution response
	static async sendResolutionResponse(houseCode, responseData) {
		return this.sendToHouse(houseCode, "resolutionResponse", responseData);
	}

	// Send a payment notification
	static async sendPaymentNotification(houseCode, paymentData) {
		return this.sendToHouse(houseCode, "paymentNotification", paymentData);
	}

	// Send an item update notification
	static async sendItemUpdate(houseCode, itemData) {
		return this.sendToHouse(houseCode, "itemUpdate", itemData);
	}
}

export default AblyService;
