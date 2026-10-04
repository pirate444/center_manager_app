const fs = require("fs");
const {
  S3Client,
  PutBucketCorsCommand,
} = require("@aws-sdk/client-s3");

// Read .env.local
const envFile = fs.readFileSync(".env.local", "utf8");
const env = {};

envFile.split(/\r?\n/).forEach((line) => {
  const match = line.match(/^([^=]+)=(.*)$/);

  if (match) {
    const key = match[1].trim();
    let val = match[2].trim();

    if (val.startsWith('"') && val.endsWith('"')) {
      val = val.slice(1, -1);
    }

    env[key] = val;
  }
});

const keyId = env.B2_KEY_ID;
const appKey =
  env.B2_APP_KEY ||
  env.B2_APPLICATION_KEY ||
  env["B2-APPLICATION-KEY"];

const bucketName = env.B2_BUCKET_NAME;

let endpoint = env.B2_ENDPOINT || env["B2-ENDPOINT"];

if (!keyId || !appKey || !bucketName || !endpoint) {
  throw new Error("Missing Backblaze environment variables");
}

if (!endpoint.startsWith("http")) {
  endpoint = `https://${endpoint}`;
}

// Extract region from:
// https://s3.eu-central-003.backblazeb2.com
const endpointMatch = endpoint.match(
  /s3\.([a-z0-9-]+)\.backblazeb2\.com/
);

const region = endpointMatch ? endpointMatch[1] : "us-east-005";

const s3Client = new S3Client({
  endpoint,
  region,
  credentials: {
    accessKeyId: keyId,
    secretAccessKey: appKey,
  },

  // You can keep this for compatibility with B2.
  forcePathStyle: true,
});

async function setCors() {
  const command = new PutBucketCorsCommand({
    Bucket: bucketName,

    CORSConfiguration: {
      CORSRules: [
        {
          ID: "website-access",

          // CHANGE THESE TO YOUR ACTUAL DOMAINS
          AllowedOrigins: [
            "http://localhost:3000",
            "https://center-manager-app.vercel.app",
          ],

          // PUT = upload
          // GET = download/view files
          // HEAD = useful for checking files
          AllowedMethods: ["PUT", "GET", "HEAD"],

          // Easiest during development.
          // You can restrict these later.
          AllowedHeaders: ["*"],

          ExposeHeaders: [
            "ETag",
          ],

          MaxAgeSeconds: 3600,
        },
      ],
    },
  });

  await s3Client.send(command);

  console.log("✅ CORS configured successfully");
  console.log("Bucket:", bucketName);
  console.log("Region:", region);
}

setCors().catch((err) => {
  console.error("❌ Failed to configure CORS");
  console.error(err);
  process.exit(1);
});