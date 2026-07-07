const required = ["VONAGE_API_KEY", "VONAGE_API_SECRET", "VONAGE_FROM", "SMS_TEST_TO"];
const missing = required.filter((name) => !process.env[name]);

if (missing.length > 0) {
  console.error(`Missing required env vars: ${missing.join(", ")}`);
  console.error("Run with: node --env-file=.env send-sms.js");
  process.exit(1);
}

const response = await fetch("https://rest.nexmo.com/sms/json", {
  method: "POST",
  headers: {
    "Content-Type": "application/x-www-form-urlencoded",
  },
  body: new URLSearchParams({
    api_key: process.env.VONAGE_API_KEY,
    api_secret: process.env.VONAGE_API_SECRET,
    from: process.env.VONAGE_FROM,
    to: process.env.SMS_TEST_TO.replace(/\D/g, ""),
    text: "This is an SMS test message sent from AgriConnect via Vonage.",
  }),
});

const payload = await response.json();
console.log(JSON.stringify(payload, null, 2));
