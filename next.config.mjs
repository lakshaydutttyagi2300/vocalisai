/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [{ protocol: "https", hostname: "images.unsplash.com" }],
  },
  // Certificate PDFs: PDFKit reads its own font data from disk at runtime, so
  // it stays a plain Node package, and the certificate fonts ship with the route.
  serverExternalPackages: ["pdfkit", "svg-to-pdfkit"],
  outputFileTracingIncludes: {
    "/api/certificates/**": ["./src/lib/certificates/fonts/**/*"],
    // Social Autopilot image cards use the Inter fonts from the certificates folder.
    "/api/social/**": ["./src/lib/certificates/fonts/Inter-*.ttf"],
    "/api/admin/social/**": ["./src/lib/certificates/fonts/Inter-*.ttf"],
  },
};

export default nextConfig;
