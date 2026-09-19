import Link from "next/link";
import { Button } from "@/components/ui/button";
export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="glass max-w-md rounded-2xl p-8 text-center">
        <p className="eyebrow">404</p>
        <h1 className="mt-2 text-2xl font-bold">Page not found</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          The page you requested does not exist.
        </p>
        <Button
          asChild
          className="mt-6 bg-gold text-background hover:bg-gold/90"
        >
          <Link href="/">Go home</Link>
        </Button>
      </div>
    </main>
  );
}
