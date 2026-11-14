import { PincodeSearch } from "@/components/pincode-search";

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-xl flex-col items-center px-4 py-24 text-center">
      <p className="font-mono text-sm text-saffron">404</p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight">We couldn&apos;t find that</h1>
      <p className="mt-3 text-muted">The page or PIN code doesn&apos;t exist. Check the 6 digits and try again.</p>
      <PincodeSearch className="mt-8" />
    </div>
  );
}
