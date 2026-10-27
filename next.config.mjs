/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ["gray-matter"],
  outputFileTracingIncludes: { "/**": ["./agents/**/*"] },
};
export default nextConfig;
