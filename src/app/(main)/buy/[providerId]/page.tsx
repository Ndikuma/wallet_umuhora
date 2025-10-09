
"use client";

// This page is deprecated and will be removed in a future update.
// The buy flow has been consolidated into the main /buy page.
// This file is kept to prevent breaking existing links until they are updated.

import { useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function DeprecatedBuyPage() {
  const router = useRouter();
  const params = useParams();
  const providerId = params.providerId;

  useEffect(() => {
    // We redirect to the new unified buy flow.
    // We can't pass state, so the user will have to re-select the provider.
    // This is an acceptable trade-off for deprecating the old flow.
    router.replace('/buy');
  }, [router, providerId]);

  return (
    <div className="flex h-full w-full items-center justify-center">
      <div className="flex flex-col items-center gap-4 text-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <h1 className="text-xl font-semibold">Redirection...</h1>
        <p className="text-muted-foreground">
          Le processus d'achat a été mis à jour. Vous allez être redirigé.
        </p>
      </div>
    </div>
  );
}
