import Link from "next/link";

export default function NotFound() {
  return <main className="setup-error"><p className="eyebrow">DAYONE</p><h1>This page is unavailable.</h1><p>The address may be incorrect or the record may be outside your workspace.</p><Link href="/">Return to your workspace</Link></main>;
}
