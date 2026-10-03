import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-md px-6 py-24 text-center">
      <p className="eyebrow">404</p>
      <h1 className="headline mt-3 text-3xl text-fg">Page not found</h1>
      <p className="mt-3 text-sm leading-relaxed text-fg-muted">
        The page you&apos;re looking for doesn&apos;t exist, or it has moved.
      </p>
      <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
        <Link href="/" className="btn-primary">
          Go home
        </Link>
        <Link href="/explore" className="btn-secondary">
          Explore assessments
        </Link>
      </div>
    </div>
  );
}
