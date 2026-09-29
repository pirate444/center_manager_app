import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const B2_KEY_ID = process.env.B2_KEY_ID;
const B2_APP_KEY = process.env.B2_APP_KEY || process.env.B2_APPLICATION_KEY;
const B2_BUCKET_NAME = process.env.B2_BUCKET_NAME;
const B2_ENDPOINT = process.env.B2_ENDPOINT || process.env['B2-ENDPOINT'];

if (!B2_KEY_ID || !B2_APP_KEY || !B2_BUCKET_NAME || !B2_ENDPOINT) {
  console.warn(
    'Backblaze B2 env vars are missing (B2_KEY_ID, B2_APP_KEY/B2_APPLICATION_KEY, B2_BUCKET_NAME, B2_ENDPOINT). File uploads will not work.'
  );
}

// Extract region from endpoint (e.g. "s3.eu-central-003.backblazeb2.com" -> "eu-central-003")
const endpointMatch = B2_ENDPOINT?.match(/s3\.([a-z0-9-]+)\.backblazeb2\.com/);
const region = endpointMatch ? endpointMatch[1] : 'us-east-005';

const s3Client = new S3Client({
  endpoint: B2_ENDPOINT?.startsWith('http') ? B2_ENDPOINT : `https://${B2_ENDPOINT}`,
  region: region,
  credentials: {
    accessKeyId: B2_KEY_ID || '',
    secretAccessKey: B2_APP_KEY || '',
  },
  forcePathStyle: true, // Required for B2 S3-compatible API
});

/**
 * Generate a presigned URL for uploading a file to B2.
 * The client will PUT to this URL directly.
 */
export async function getUploadUrl(
  key: string,
  contentType: string,
  expiresIn: number = 600
): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: B2_BUCKET_NAME,
    Key: key,
    ContentType: contentType,
  });
  return getSignedUrl(s3Client, command, { expiresIn });
}

/**
 * Generate a presigned URL for downloading/viewing a file from B2.
 */
export async function getDownloadUrl(
  key: string,
  expiresIn: number = 3600
): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: B2_BUCKET_NAME,
    Key: key,
  });
  return getSignedUrl(s3Client, command, { expiresIn });
}

/**
 * Delete an object from B2.
 */
export async function deleteObject(key: string): Promise<void> {
  const command = new DeleteObjectCommand({
    Bucket: B2_BUCKET_NAME,
    Key: key,
  });
  await s3Client.send(command);
}

/**
 * Generate a safe, unique object key for a file upload.
 * Format: resources/{classId}/{sectionId}/{timestamp}_{sanitizedFileName}
 */
export function generateObjectKey(
  classId: string,
  sectionId: string,
  fileName: string
): string {
  const sanitized = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
  const timestamp = Date.now();
  return `resources/${classId}/${sectionId}/${timestamp}_${sanitized}`;
}
