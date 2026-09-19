"use client";
import Link from "next/link";
import { Button } from "@/components/ui/button";
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) { return <main className="flex min-h-screen items-center justify-center px-4"><div className="glass max-w-md rounded-2xl p-8 text-center"><p className="eyebrow">Something went wrong</p><h1 className="mt-2 text-2xl font-bold">We couldn&apos;t load this page</h1><p className="mt-3 text-sm text-muted-foreground">{error.message || "Please try again."}</p><div className="mt-6 flex justify-center gap-3"><Button onClick={reset}>Try again</Button><Button asChild variant="outline"><Link href="/">Go home</Link></Button></div></div></main>; }
