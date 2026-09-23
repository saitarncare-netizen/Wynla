import type { Metadata } from "next";
import Button from "@/components/ui/Button";
import EmptyState from "@/components/ui/EmptyState";

export const metadata: Metadata = {
  title: "Page not found",
  description: "We couldn't find that page on Wynla. Try the map or browse every US ski resort.",
};

/**
 * 404 fallback — branded, links back to the map. Hit when notFound() is
 * called (e.g. a /resort/[slug] that doesn't exist) or any unknown route.
 */
export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-wn-offwhite px-6 py-12">
      <div className="w-full max-w-md">
        <EmptyState
          tone="bare"
          icon="compass"
          title={<h1 className="text-2xl font-extrabold text-wn-navy sm:text-3xl">We couldn&apos;t find that page.</h1>}
          body="The link might be old, mistyped, or the resort may have a different slug now. Try the map — every US resort lives there."
          action={
            <>
              <Button href="/">Open the map</Button>
              <Button href="/deals" variant="secondary">
                Pass deals
              </Button>
            </>
          }
        />
      </div>
    </main>
  );
}
