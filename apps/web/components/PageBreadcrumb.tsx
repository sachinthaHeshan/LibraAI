import Link from "next/link";

type PageBreadcrumbProps = {
  parentLabel: string;
  parentHref: string;
  current: string;
};

export function PageBreadcrumb({
  parentLabel,
  parentHref,
  current,
}: PageBreadcrumbProps) {
  return (
    <nav aria-label="Breadcrumb" className="min-w-0">
      <ol className="flex min-w-0 items-center gap-1.5 text-sm font-semibold">
        <li className="shrink-0">
          <Link className="text-muted transition hover:text-ink" href={parentHref}>
            {parentLabel}
          </Link>
        </li>
        <li aria-hidden className="shrink-0 text-muted">
          /
        </li>
        <li
          aria-current="page"
          className="min-w-0 truncate text-ink"
        >
          {current}
        </li>
      </ol>
    </nav>
  );
}
