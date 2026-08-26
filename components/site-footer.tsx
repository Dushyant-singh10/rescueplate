import Link from "next/link";

const AUTHOR = {
  name: "Dushyant",
  github: "https://github.com/Dushyant-singh10/rescueplate",
  actions: "https://github.com/Dushyant-singh10/rescueplate/actions",
  linkedin: "https://www.linkedin.com/in/dushyant-singh-030175376/",
};

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-1 px-4 py-6 text-sm text-muted-foreground sm:flex-row sm:justify-between">
        <p>&copy; {new Date().getFullYear()} RescuePlate. Built by {AUTHOR.name}.</p>
        <div className="flex items-center gap-4">
          <Link href={AUTHOR.github} target="_blank" rel="noopener noreferrer" className="hover:text-foreground">
            GitHub
          </Link>
          <Link href={AUTHOR.actions} target="_blank" rel="noopener noreferrer" className="hover:text-foreground">
            CI
          </Link>
          {AUTHOR.linkedin ? (
            <Link href={AUTHOR.linkedin} target="_blank" rel="noopener noreferrer" className="hover:text-foreground">
              LinkedIn
            </Link>
          ) : null}
        </div>
      </div>
    </footer>
  );
}
