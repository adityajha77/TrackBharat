import { notFound } from "next/navigation";

// Any unknown URL inside a language renders that language's not-found page.
export default function Missing() {
  notFound();
}
