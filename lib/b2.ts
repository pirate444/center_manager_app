import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

function getB2Config() {
  const keyId = process.env.B2_KEY_ID;
  const appKey = process.env.B2_APP_KEY || process.env.B2_APPLICATION_KEY || process.env['B2-APPLICATION-KEY'];
  const bucketName = process.env.B2_BUCKET_NAME;
  const endpoint = process.env.B2_ENDPOINT || process.env['B2-ENDPOINT'];

  if (!keyId || !appKey || !bucketName || !endpoint) {
    console.warn(
      'Backblaze B2 env vars are missing (B2_KEY_ID, B2_APP_KEY, B2_BUCKET_NAME, B2_ENDPOINT). File uploads will not work.'
    );
  }

  // Extract region from endpoint (e.g. "s3.eu-central-003.backblazeb2.com" -> "eu-central-003")
  const endpointMatch = endpoint?.match(/s3\.([a-z0-9-]+)\.backblazeb2\.com/);
  const region = endpointMatch ? endpointMatch[1] : 'us-east-005';
  
  const formattedEndpoint = endpoint?.startsWith('http') ? endpoint : `https://${endpoint}`;

  return { keyId, appKey, bucketName, endpoint: formattedEndpoint, region };
}

function getS3Client() {
  const config = getB2Config();
  return new S3Client({
    endpoint: config.endpoint,
    region: config.region,
    credentials: {
      accessKeyId: config.keyId || '',
      secretAccessKey: config.appKey || '',
    },
    forcePathStyle: true, // Required for B2 S3-compatible API
  });
}

/**
 * Generate a presigned URL for uploading a file to B2.
 * The client will PUT to this URL directly.
 */
export async function getUploadUrl(
  key: string,
  contentType: string,
  expiresIn: number = 600
): Promise<string> {
  const config = getB2Config();
  if (!config.bucketName) throw new Error('B2_BUCKET_NAME is not configured on the server.');
  
  const command = new PutObjectCommand({
    Bucket: config.bucketName,
    Key: key,
    ContentType: contentType,
  });
  return getSignedUrl(getS3Client(), command, { expiresIn });
}

/**
 * Generate a presigned URL for downloading/viewing a file from B2.
 */
export async function getDownloadUrl(
  key: string,
  expiresIn: number = 3600
): Promise<string> {
  const config = getB2Config();
  if (!config.bucketName) throw new Error('B2_BUCKET_NAME is not configured on the server.');

  const command = new GetObjectCommand({
    Bucket: config.bucketName,
    Key: key,
  });
  return getSignedUrl(getS3Client(), command, { expiresIn });
}

/**
 * Delete an object from B2.
 */
export async function deleteObject(key: string): Promise<void> {
  const config = getB2Config();
  if (!config.bucketName) throw new Error('B2_BUCKET_NAME is not configured on the server.');

  const command = new DeleteObjectCommand({
    Bucket: config.bucketName,
    Key: key,
  });
  await getS3Client().send(command);
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
