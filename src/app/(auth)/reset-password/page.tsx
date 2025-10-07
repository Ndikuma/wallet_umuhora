
import { Suspense } from 'react';
import { ResetPasswordComponent } from './reset-password-component';
import { Loader2 } from 'lucide-react';

function ResetPasswordLoading() {
    return (
        <div className="flex h-screen items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin" />
        </div>
    );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<ResetPasswordLoading />}>
      <ResetPasswordComponent />
    </Suspense>
  );
}
