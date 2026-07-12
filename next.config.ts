import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    reactStrictMode: true,
    eslint: { ignoreDuringBuilds: true },
    serverExternalPackages: ["puppeteer-extra", "puppeteer-extra-plugin-stealth", "puppeteer", "clone-deep"],
    webpack: (config) => {
        config.resolve.fallback = {
            ...config.resolve.fallback,
            'webworker-threads': false,
            'lapack': false,
        };
        return config;
    },
};

export default nextConfig;
