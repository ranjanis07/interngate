const mongoose = require("mongoose");
const dns = require("dns");
const https = require("https");

try {
  dns.setServers(["8.8.8.8", "1.1.1.1"]);
} catch (e) {
  console.warn("Could not set custom DNS servers, using default system DNS.");
}

function getPublicIP() {
  return new Promise((resolve) => {
    https.get("https://api.ipify.org", (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => resolve(data.trim()));
    }).on("error", () => resolve("(unknown)"));
  });
}

async function connectDB() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("Missing MONGODB_URI in .env");

  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 10000,
      family: 4,
    });
    console.log("MongoDB Atlas connected successfully!");
  } catch (err) {
    try { dns.setDefaultResultOrder("ipv4first"); } catch (_) {}
    const ip = await getPublicIP();
    console.error(`\n❌ Failed to connect to MongoDB Atlas.`);
    console.error(`   Your current public IP: ${ip}`);
    console.error(`   👉 Whitelist this IP in Atlas: https://cloud.mongodb.com → Network Access → Add IP Address\n`);
    throw err;
  }
}

module.exports = connectDB;