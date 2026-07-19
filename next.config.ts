import type { NextConfig } from "next";

const remotePatterns: NonNullable<NextConfig["images"]>["remotePatterns"] = [];
const minioPublicUrl = process.env.MINIO_PUBLIC_URL;

if (minioPublicUrl) {
  const parsedUrl = new URL(minioPublicUrl);

  remotePatterns.push({
    protocol: parsedUrl.protocol.replace(":", "") as "http" | "https",
    hostname: parsedUrl.hostname,
    port: parsedUrl.port || undefined,
    pathname: "/**",
  });
}

const nextConfig: NextConfig = {
  images: {
    remotePatterns,
  },
};

export default nextConfig;
