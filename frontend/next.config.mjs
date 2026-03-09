/** @type {import('next').NextConfig} */
const nextConfig = {
  output: process.env.NODE_ENV === "production" ? "standalone" : undefined,
  allowedDevOrigins: ["127.0.0.1"],
};

export default nextConfig;
