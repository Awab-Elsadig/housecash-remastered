import { configDotenv } from "dotenv";
import { createTransport } from "nodemailer";
configDotenv();

async function sendVerificationEmail(to, verificationCode) {
	let transporter = createTransport({
		service: "Gmail",
		auth: {
			user: "elsadigawab@gmail.com",
			pass: process.env.GOOGLE_APP_PASSWORD,
		},
	});

	// HTML content
	const htmlContent = `
	<!DOCTYPE html>
	<html lang="en">
	<head>
		<meta charset="UTF-8">
		<meta name="viewport" content="width=device-width, initial-scale=1.0">
		<title>Verification Code</title>
		<style>
			body {
				font-family: Arial, sans-serif;
				background-color: #f4f4f4;
				display: flex;
				justify-content: center;
				align-items: center;
				height: 100vh;
				margin: 0;
			}
			.container {
				background-color: #fff;
				padding: 20px;
				border-radius: 8px;
				box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
				text-align: center;
			}
			.code {
				font-size: 2em;
				font-weight: bold;
				color: #333;
				margin-top: 10px;
			}
		</style>
	</head>
	<body>
		<div class="container">
			<h1>Your Verification Code</h1>
			<p class="code">${verificationCode}</p>
		</div>
	</body>
	</html>
	`;

	// Email options
	let mailOptions = {
		from: '"Awab Alsadig" <elsadigawab@gmail.com>',
		to: [to], // List of receivers
		subject: "HouseCash Verification Email", // Subject line
		html: htmlContent, // HTML body content
	};

	// Send email
	try {
		await transporter.sendMail(mailOptions);
	} catch (error) {
		console.error("Error sending email: " + error);
	}
}

export default sendVerificationEmail;
