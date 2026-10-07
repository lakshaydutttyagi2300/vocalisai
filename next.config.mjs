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
  },
};

export default nextConfig;
