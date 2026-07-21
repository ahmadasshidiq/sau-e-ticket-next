import { Client } from "minio";

function getMinioConfig() {
  const endPoint = process.env.MINIO_ENDPOINT;
  const port = Number(process.env.MINIO_PORT ?? "0");
  const useSSL = process.env.MINIO_USE_SSL === "true";
  const accessKey = process.env.MINIO_ACCESS_KEY;
  const secretKey = process.env.MINIO_SECRET_KEY;
  const bucket = process.env.MINIO_BUCKET_AVATARS;
  const publicUrl = process.env.MINIO_PUBLIC_URL;

  if (
    !endPoint ||
    !port ||
    !accessKey ||
    !secretKey ||
    !bucket ||
    !publicUrl
  ) {
    throw new Error("MinIO environment variables are incomplete.");
  }

  return {
    endPoint,
    port,
    useSSL,
    accessKey,
    secretKey,
    bucket,
    publicUrl: publicUrl.replace(/\/$/, ""),
  };
}

export function getMinioClient() {
  const config = getMinioConfig();

  return new Client({
    endPoint: config.endPoint,
    port: config.port,
    useSSL: config.useSSL,
    accessKey: config.accessKey,
    secretKey: config.secretKey,
  });
}

export async function ensureMinioBucket() {
  const config = getMinioConfig();
  const client = getMinioClient();
  const exists = await client.bucketExists(config.bucket);

  if (!exists) {
    await client.makeBucket(config.bucket);
  }

  return config.bucket;
}

export async function uploadToMinio(params: {
  folder: string;
  fileName: string;
  contentType: string;
  buffer: Buffer;
}) {
  const config = getMinioConfig();
  const client = getMinioClient();
  const bucket = await ensureMinioBucket();
  const sanitizedName = params.fileName.replace(/[^a-zA-Z0-9._-]/g, "-");
  const objectName = `${params.folder}/${Date.now()}-${sanitizedName}`;

  await client.putObject(bucket, objectName, params.buffer, params.buffer.length, {
    "Content-Type": params.contentType,
  });

  return {
    objectName,
    url: `${config.publicUrl}/${bucket}/${objectName}`,
  };
}

export async function removeFromMinio(objectName: string) {
  const client = getMinioClient();
  const bucket = await ensureMinioBucket();
  await client.removeObject(bucket, objectName);
}
