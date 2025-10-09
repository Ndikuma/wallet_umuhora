"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import api from "@/lib/api";

export default function CreateWalletPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [walletCreated, setWalletCreated] = useState(false);

  const createWallet = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await api.createWallet("idris"); // <-- Your API POST endpoint
      setWalletCreated(true);
      toast({
        title: "Portefeuille créé",
        description: "Votre portefeuille a été créé avec succès.",
      });
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || "Impossible de créer le portefeuille.";
      setError(errorMsg);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: errorMsg,
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-secondary p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Créer un portefeuille</CardTitle>
          <CardDescription>
            Cliquez sur le bouton ci-dessous pour créer votre portefeuille.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Erreur</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          {walletCreated && (
            <Alert variant="success" className="mb-4">
              <CheckCircle2 className="h-4 w-4" />
              <AlertTitle>Succès</AlertTitle>
              <AlertDescription>Votre portefeuille a été créé avec succès.</AlertDescription>
            </Alert>
          )}
          <Button
            onClick={createWallet}
            disabled={loading || walletCreated}
            className="w-full"
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {walletCreated ? "Portefeuille créé" : "Créer le portefeuille"}
          </Button>
        </CardContent>
        {walletCreated && (
          <CardFooter>
            <Button asChild className="w-full" size="lg">
              <Link href="/dashboard">Accéder au portefeuille</Link>
            </Button>
          </CardFooter>
        )}
      </Card>
    </div>
  );
}
