
"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import api from "@/lib/api";
import type { BuyProvider, BuyFeeCalculation, BuyOrderPayload } from "@/lib/types";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, AlertCircle, ArrowRight, Landmark, Loader2, Zap, Bitcoin, ShoppingCart } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ProviderIcon } from "@/components/provider-icon";
import { useForm } from "react-hook-form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useDebounce } from "@/hooks/use-debounce";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";


const ProviderBuyCard = ({ provider, paymentMethod }: { provider: BuyProvider, paymentMethod: 'on_chain' | 'lightning' }) => {
    const { toast } = useToast();
    const router = useRouter();

    const [feeCalc, setFeeCalc] = useState<BuyFeeCalculation | null>(null);
    const [isCalculating, setIsCalculating] = useState(false);
    const [calcError, setCalcError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const { register, watch, setValue } = useForm({
      defaultValues: {
        amount: '',
        currency: provider.currencies[0] || 'BIF'
      }
    });

    const watchedAmount = watch("amount");
    const watchedCurrency = watch("currency");
    const debouncedAmount = useDebounce(parseFloat(watchedAmount), 500);

    const calculateFee = useCallback(async (amount: number, currency: string) => {
        if (!provider || !currency) return;
        setIsCalculating(true);
        setCalcError(null);
        try {
            const response = await api.calculateBuyFee(provider.id, amount, currency, paymentMethod);
            setFeeCalc(response.data);
        } catch (err: any) {
            setCalcError(err.message || "Impossible de calculer les frais.");
            setFeeCalc(null);
        } finally {
            setIsCalculating(false);
        }
    }, [provider, paymentMethod]);

    useEffect(() => {
        if (debouncedAmount > 0 && watchedCurrency) {
            calculateFee(debouncedAmount, watchedCurrency);
        } else {
            setFeeCalc(null);
            setCalcError(null);
        }
    }, [debouncedAmount, watchedCurrency, calculateFee]);

     const handleCreateOrder = async () => {
        if (!feeCalc) {
            toast({ variant: 'destructive', title: 'Erreur', description: 'Le calcul des frais n\'est pas terminé.' });
            return;
        }
        setIsSubmitting(true);
        try {
            const orderPayload: BuyOrderPayload = {
                direction: 'buy',
                payment_method: paymentMethod,
                provider_id: provider.id,
                amount: parseFloat(watchedAmount),
                amount_currency: watchedCurrency,
                btc_amount: feeCalc.btc_amount ? parseFloat(feeCalc.btc_amount) : undefined,
                ln_amount_sats: feeCalc.sats_amount ? parseInt(feeCalc.sats_amount) : undefined,
            };

            const createdOrder = await api.createBuyOrder(orderPayload);
            toast({ title: 'Commande créée', description: `Votre commande #${createdOrder.data.id} a été créée.` });
            router.push(`/orders/${createdOrder.data.id}`);

        } catch (err: any) {
            toast({ variant: 'destructive', title: 'Échec de la commande', description: err.message || 'Impossible de créer votre commande.' });
        } finally {
            setIsSubmitting(false);
        }
    };


    return (
        <Card className="flex flex-col">
            <CardHeader>
                <div className="flex items-start gap-4">
                <ProviderIcon provider={provider} />
                <div className="flex-1">
                    <CardTitle>{provider.name}</CardTitle>
                    <CardDescription>{provider.description}</CardDescription>
                </div>
                </div>
            </CardHeader>
            <CardContent className="flex-grow space-y-4">
                 <div className="flex items-center gap-2">
                    <Input 
                        type="number" 
                        placeholder="Montant" 
                        {...register('amount')}
                        className="h-11 text-base"
                    />
                    <Select onValueChange={(val) => setValue('currency', val)} defaultValue={watchedCurrency}>
                        <SelectTrigger className="h-11 w-32">
                            <SelectValue placeholder="Devise" />
                        </SelectTrigger>
                        <SelectContent>
                            {provider.currencies.map(c => <SelectItem key={c} value={c}>{c.toUpperCase()}</SelectItem>)}
                        </SelectContent>
                    </Select>
                 </div>
                 
                 {(isCalculating || feeCalc || calcError) && (
                     <div className="space-y-2 rounded-lg border bg-secondary/30 p-3 text-sm">
                        {isCalculating && <div className="flex items-center justify-center text-muted-foreground"><Loader2 className="mr-2 size-4 animate-spin" />Calcul...</div>}
                        {calcError && <div className="text-center text-destructive">{calcError}</div>}
                        {feeCalc && (
                            <div className="space-y-2">
                                <div className="flex justify-between font-bold">
                                    <span className="text-muted-foreground">Vous recevrez environ:</span>
                                    <span className="font-mono">
                                        {paymentMethod === 'lightning' ? `${feeCalc.sats_amount} sats` : `${feeCalc.btc_amount} BTC`}
                                    </span>
                                </div>
                                <div className="flex justify-between text-xs">
                                    <span className="text-muted-foreground">Total à payer:</span>
                                    <span className="font-mono font-semibold">{feeCalc.total_amount} {feeCalc.currency}</span>
                                </div>
                            </div>
                        )}
                     </div>
                 )}
            </CardContent>
            <CardFooter>
                <Button 
                    className="w-full" 
                    size="lg"
                    disabled={!feeCalc || isCalculating || isSubmitting}
                    onClick={handleCreateOrder}
                >
                    {isSubmitting ? <Loader2 className="mr-2 size-4 animate-spin"/> : <ShoppingCart className="mr-2 size-5" />}
                    {isSubmitting ? "Création..." : "Acheter"}
                </Button>
            </CardFooter>
        </Card>
    )
}


const ProviderList = ({ paymentMethod }: { paymentMethod: 'on_chain' | 'lightning' }) => {
  const [providers, setProviders] = useState<BuyProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProviders = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.getBuyProviders(paymentMethod);
      setProviders(response.data);
    } catch (err: any)      {
      setError(err.message || `Échec du chargement des fournisseurs ${paymentMethod}. Veuillez réessayer plus tard.`);
    } finally {
      setLoading(false);
    }
  }, [paymentMethod]);

  useEffect(() => {
    fetchProviders();
  }, [fetchProviders]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <Card key={i}>
              <CardHeader className="flex flex-row items-start gap-4">
                    <Skeleton className="h-12 w-12 rounded-lg" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-6 w-32" />
                      <Skeleton className="h-4 w-48" />
                    </div>
              </CardHeader>
              <CardContent><Skeleton className="h-11 w-full" /></CardContent>
              <CardFooter><Skeleton className="h-12 w-full" /></CardFooter>
          </Card>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <Card className="flex h-48 items-center justify-center">
        <div className="text-center text-destructive">
          <AlertCircle className="mx-auto h-8 w-8" />
          <p className="mt-2 font-semibold">Erreur de chargement des fournisseurs</p>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto">{error}</p>
          <Button onClick={fetchProviders} variant="secondary" className="mt-4">
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
            Réessayer
          </Button>
        </div>
      </Card>
    )
  }

  return (
     <div className="space-y-4">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {providers.length > 0 ? (
            providers.map((provider) => (
              <ProviderBuyCard key={provider.id} provider={provider} paymentMethod={paymentMethod} />
            ))
          ) : (
            <Card className="col-span-full flex h-48 items-center justify-center">
              <p className="text-muted-foreground">Aucun fournisseur d'achat n'est disponible pour le moment.</p>
            </Card>
          )}
        </div>
      </div>
  )
}


export default function BuyPage() {
  const [method, setMethod] = useState<"on_chain" | "lightning" | null>(null);

  if (!method) {
    return (
       <div className="mx-auto max-w-2xl space-y-6">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Comment voulez-vous acheter ?</h1>
          <p className="text-muted-foreground">
            Choisissez si vous souhaitez recevoir vos Bitcoins sur la chaîne principale (On-Chain) ou via le Lightning Network.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <Card onClick={() => setMethod('on_chain')} className="cursor-pointer hover:border-primary transition-colors p-8 flex flex-col items-center justify-center text-center">
                <Bitcoin className="size-12 text-primary mb-4"/>
                <h3 className="font-semibold text-lg">On-Chain</h3>
                <p className="text-sm text-muted-foreground">Transactions standards sur la blockchain Bitcoin. Idéal pour de plus grandes quantités et un stockage à long terme.</p>
            </Card>
             <Card onClick={() => setMethod('lightning')} className="cursor-pointer hover:border-primary transition-colors p-8 flex flex-col items-center justify-center text-center">
                <Zap className="size-12 text-primary mb-4"/>
                <h3 className="font-semibold text-lg">Lightning</h3>
                <p className="text-sm text-muted-foreground">Transactions instantanées avec des frais très bas. Idéal pour les paiements rapides et les petites quantités.</p>
            </Card>
        </div>
      </div>
    )
  }


  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="space-y-2">
        <Button variant="ghost" size="sm" className="-ml-4" onClick={() => setMethod(null)}><ArrowLeft className="mr-2 size-4" />Changer de méthode</Button>
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Étape 2: Acheter des Bitcoins ({method === 'on_chain' ? 'On-Chain' : 'Lightning'})</h1>
        <p className="text-muted-foreground">
          Choisissez un fournisseur, entrez un montant, et cliquez sur "Acheter" pour créer votre commande.
        </p>
      </div>

      <ProviderList paymentMethod={method} />
      
    </div>
  );
}

    