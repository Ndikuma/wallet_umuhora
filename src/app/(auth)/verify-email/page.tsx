
import { Suspense } from 'react';
import { VerifyEmailComponent } from './verify-email-component';
import { Loader2 } from 'lucide-react';

function VerifyEmailLoading() {
    return (
        <div className="flex h-screen items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin" />
        </div>
    );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<VerifyEmailLoading />}>
      <VerifyEmailComponent />
    </Suspense>
  );
}
