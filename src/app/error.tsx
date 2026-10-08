"use client";
import Link from "next/link";

export default function ErrorPage({ reset }: { reset: () => void }) {
  return <main className="setup-error"><p className="eyebrow">DAYONE</p><h1>The workspace could not load.</h1><p>Check the database connection and configuration, then try again. Saved records remain in the database.</p><button onClick={reset}>Try again</button><Link href="/login">Return to sign in</Link></main>;
}
