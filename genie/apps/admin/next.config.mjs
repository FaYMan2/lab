/** @type {import('next').NextConfig} */
const nextConfig = {
  // The admin reads @genie/db / @genie/config source directly from the workspace.
  transpilePackages: ["@genie/db", "@genie/config"],
  experimental: { serverActions: { bodySizeLimit: "2mb" } },
};

export default nextConfig;
