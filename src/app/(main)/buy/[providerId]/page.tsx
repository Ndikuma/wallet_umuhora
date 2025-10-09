
"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import api from "@/lib/api";
import type { BuyProvider, BuyFeeCalculation, BuyOrderPayload, Order } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { useDebounce } from "@/hooks/use-debounce";
import { ArrowLeft, Loader2, ShoppingCart, Bitcoin, AlertCircle, Zap, CheckCircle, Clock } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ProviderIcon } from "@/components/provider-icon";
import { CopyButton } from "@/components/copy-button";
import { Alert } from "@/components/ui/alert";


const buySchema = z.object({
  amount: z.coerce
    .number({ invalid_type_error: "Veuillez entrer un nombre valide." })
    .min(1, { message: "Le montant doit être d'au moins 1." }),
  currency: z.string().min(1, "Veuillez sélectionner une devise."),
  payment_method: z.enum(['on_chain', 'lightning']),
});

type BuyFormValues = z.infer<typeof buySchema>;

function LightningPaymentScreen({ order, onPaymentSuccess }: { order: Order, onPaymentSuccess: () => void }) {
    const { toast } = useToast();
    const [isPaid, setIsPaid] = useState(order.status === 'completed');

    useEffect(() => {
        if (!order || isPaid || order.status === 'completed') {
            return;
        }

        const intervalId = setInterval(async () => {
            try {
                const response = await api.getOrder(order.id);
                if (response.data.status === 'completed') {
                    setIsPaid(true);
                    onPaymentSuccess();
                    toast({
                        title: "Paiement Reçu!",
                        description: `Votre achat de ${response.data.ln_amount_sats} sats est terminé.`,
                    });
                    clearInterval(intervalId);
                }
            } catch (error) {
                // silent failure
            }
        }, 3000); // Poll every 3 seconds

        return () => clearInterval(intervalId);
    }, [order, isPaid, toast, onPaymentSuccess]);

    if (!order.ln_invoice) {
        return (
            <Card>
                <CardHeader><CardTitle>Erreur</CardTitle></CardHeader>
                <CardContent>
                    <p className="text-destructive">Impossible d'afficher la facture Lightning pour cette commande.</p>
                </CardContent>
            </Card>
        )
    }
    
    if(isPaid) {
        return (
             <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <CheckCircle className="size-8 text-green-500" />
                        Paiement Réussi!
                    </CardTitle>
                    <CardDescription>Votre commande a été complétée avec succès.</CardDescription>
                </CardHeader>
                <CardContent className="text-center">
                    <p className="font-bold text-2xl">{order.ln_amount_sats} sats</p>
                    <p>ont été ajoutés à votre portefeuille.</p>
                </CardContent>
                <CardFooter>
                    <Button asChild className="w-full">
                        <Link href="/lightning">Retour au Portefeuille Lightning</Link>
                    </Button>
                </CardFooter>
            </Card>
        )
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><Zap className="size-5 text-primary" />Payer la facture Lightning</CardTitle>
                <CardDescription>Scannez ce code QR ou copiez la facture pour acheter {order.ln_amount_sats} sats.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-6">
                {order.payment_proof?.qr_code ? (
                     <div className="rounded-lg border bg-white p-4 shadow-sm">
                        <Image
                            src={order.payment_proof.qr_code}
                            alt="Code QR de la facture Lightning"
                            width={256}
                            height={256}
                            className="rounded-md"
                            data-ai-hint="qr code"
                        />
                     </div>
                ) : <Skeleton className="h-64 w-64" />}

                 <div className="flex items-center gap-2 text-sm text-muted-foreground p-2 rounded-lg bg-secondary">
                    <Clock className="size-4 animate-pulse" />
                    <span>En attente du paiement... La page se mettra à jour automatiquement.</span>
                </div>

                <div className="w-full space-y-4">
                    <div className="break-all rounded-md border bg-secondary p-3 font-mono text-sm text-muted-foreground">
                        {order.ln_invoice}
                    </div>
                     <CopyButton textToCopy={order.ln_invoice} toastMessage="Facture copiée dans le presse-papiers">
                        Copier la facture
                    </CopyButton>
                </div>
            </CardContent>
        </Card>
    )
}


export default function BuyWithProviderPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const providerId = Number(params.providerId);

  const [provider, setProvider] = useState<BuyProvider | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [feeCalc, setFeeCalc] = useState<BuyFeeCalculation | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [calcError, setCalcError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [order, setOrder] = useState<Order | null>(null);

  const form = useForm<BuyFormValues>({
    resolver: zodResolver(buySchema),
    mode: 'onChange',
  });

  const watchedAmount = form.watch("amount");
  const watchedCurrency = form.watch("currency");
  const watchedPaymentMethod = form.watch("payment_method");
  const debouncedAmount = useDebounce(watchedAmount, 500);

  const fetchProvider = useCallback(async () => {
      setLoading(true);
      setError(null);
      if (isNaN(providerId)) {
        setError("L'identifiant du fournisseur est invalide.");
        setLoading(false);
        return;
      }
      try {
        const response = await api.getBuyProvider(providerId);
        setProvider(response.data);
        if (response.data.currencies.length > 0) {
          form.setValue('currency', response.data.currencies[0]);
        }
        if (response.data.supported_payment_methods && response.data.supported_payment_methods.length > 0) {
           form.setValue('payment_method', response.data.supported_payment_methods[0]);
        }
      } catch (err: any) {
        setError(err.message || "Échec de la récupération des informations du fournisseur.");
      } finally {
        setLoading(false);
      }
  }, [providerId, form]);

  useEffect(() => {
    fetchProvider();
  }, [fetchProvider]);
  
  const calculateFee = useCallback(async (amount: number, currency: string, paymentMethod: 'on_chain' | 'lightning') => {
    if (!provider || !currency || !paymentMethod) return;
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
  }, [provider]);

  useEffect(() => {
    if (debouncedAmount > 0 && watchedCurrency && watchedPaymentMethod && form.formState.isValid) {
      calculateFee(debouncedAmount, watchedCurrency, watchedPaymentMethod);
    } else {
      setFeeCalc(null);
      setCalcError(null);
    }
  }, [debouncedAmount, watchedCurrency, watchedPaymentMethod, form.formState.isValid, calculateFee]);

  const onSubmit = async (data: BuyFormValues) => {
    if (!provider || !feeCalc) {
        toast({ variant: 'destructive', title: 'Erreur', description: 'Le calcul des frais n\'est pas terminé.' });
        return;
    }
    setIsSubmitting(true);
    try {
        const orderPayload: BuyOrderPayload = {
            direction: 'buy',
            payment_method: feeCalc.payment_method,
            provider_id: provider.id,
            amount: data.amount,
            amount_currency: data.currency,
            btc_amount: feeCalc.btc_amount ? parseFloat(feeCalc.btc_amount) : undefined,
            ln_amount_sats: feeCalc.sats_amount ? parseInt(feeCalc.sats_amount) : undefined,
        };

        const createdOrder = await api.createBuyOrder(orderPayload);
        setOrder(createdOrder.data);
        toast({ title: 'Commande créée', description: `Votre commande #${createdOrder.data.id} a été créée.` });

        if(createdOrder.data.payment_method !== 'lightning') {
            router.push(`/orders/${createdOrder.data.id}`);
        }
        // For lightning, we stay on this page to show the invoice
    } catch (err: any) {
        toast({ variant: 'destructive', title: 'Échec de la commande', description: err.message || 'Impossible de créer votre commande.' });
    } finally {
        setIsSubmitting(false);
    }
  };
  
   const handleNewOrder = () => {
    setOrder(null);
    form.reset();
    setFeeCalc(null);
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-lg space-y-4">
        <Skeleton className="h-8 w-32" />
        <Card>
          <CardHeader><Skeleton className="h-12 w-12 rounded-lg" /><div className="space-y-2"><Skeleton className="h-6 w-40" /><Skeleton className="h-4 w-60" /></div></CardHeader>
          <CardContent className="space-y-6">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
        <div className="mx-auto max-w-lg">
            <Button variant="ghost" asChild className="-ml-4"><Link href="/buy"><ArrowLeft className="mr-2 size-4" />Retour aux fournisseurs</Link></Button>
            <Card className="mt-4 flex h-48 items-center justify-center">
                <div className="text-center text-destructive">
                    <AlertCircle className="mx-auto h-8 w-8" />
                    <p className="mt-2 font-semibold">Erreur de chargement du fournisseur</p>
                    <p className="text-sm text-muted-foreground max-w-sm mx-auto">{error}</p>
                    <Button onClick={fetchProvider} variant="secondary" className="mt-4">
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                        Réessayer
                    </Button>
                </div>
            </Card>
        </div>
    )
  }

  if (!provider) return null;
  
  if (order && order.payment_method === 'lightning') {
      return (
          <div className="mx-auto max-w-lg space-y-4">
             <Button variant="ghost" onClick={handleNewOrder} className="-ml-4">
                <ArrowLeft className="mr-2 size-4" />
                Créer une nouvelle commande
            </Button>
            <LightningPaymentScreen order={order} onPaymentSuccess={handleNewOrder} />
          </div>
      )
  }

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <Button variant="ghost" asChild className="-ml-4">
        <Link href="/buy">
          <ArrowLeft className="mr-2 size-4" />
          Retour aux fournisseurs
        </Link>
      </Button>

      <Card>
        <CardHeader className="flex flex-row items-start gap-4">
            <ProviderIcon provider={provider} />
           <div>
            <CardTitle className="text-2xl">{provider.name}</CardTitle>
            <CardDescription>{provider.description}</CardDescription>
           </div>
        </CardHeader>
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
                <CardContent className="space-y-6">
                     <FormField
                        control={form.control}
                        name="payment_method"
                        render={({ field }) => (
                            <FormItem className="space-y-3">
                               <FormLabel className="text-base font-semibold">Méthode de réception</FormLabel>
                                <FormControl>
                                    <div className="grid grid-cols-2 gap-4">
                                        {provider.supported_payment_methods?.map(method => (
                                        <div key={method}>
                                            <input type="radio" id={method} value={method} checked={field.value === method} onChange={field.onChange} className="peer sr-only" />
                                            <Label htmlFor={method} className="flex flex-col items-center justify-center rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-checked:border-primary peer-checked:shadow-sm cursor-pointer">
                                                {method === 'lightning' ? <Zap className="mb-2 size-6" /> : <Bitcoin className="mb-2 size-6" />}
                                                <span className="font-semibold">{method === 'lightning' ? 'Lightning' : 'On-Chain'}</span>
                                            </Label>
                                        </div>
                                        ))}
                                    </div>
                                </FormControl>
                               <FormMessage />
                            </FormItem>
                        )}
                    />

                    <div className="space-y-2">
                      <Label htmlFor="amount" className="text-base font-semibold">Montant à acheter</Label>
                      <div className="flex gap-2">
                        <FormField
                            control={form.control}
                            name="amount"
                            render={({ field }) => (
                                <FormItem className="flex-1">
                                    <FormControl>
                                        <Input id="amount" type="number" placeholder="100.00" {...field} value={field.value ?? ''} className="text-lg h-12" />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="currency"
                            render={({ field }) => (
                                <FormItem>
                                    <Select onValueChange={field.onChange} value={field.value}>
                                        <FormControl>
                                            <SelectTrigger className="h-12 w-32">
                                                <SelectValue placeholder="Devise" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {provider.currencies.map(c => <SelectItem key={c} value={c}>{c.toUpperCase()}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                      </div>
                    </div>

                    {(isCalculating || feeCalc || calcError) && (
                        <div className="space-y-3 rounded-lg border bg-secondary/30 p-4">
                            {isCalculating && <div className="flex items-center justify-center text-muted-foreground text-sm"><Loader2 className="mr-2 size-4 animate-spin" />Calcul...</div>}
                            {calcError && <div className="text-center text-sm text-destructive">{calcError}</div>}
                            {feeCalc && (
                                <div className="space-y-4">
                                     <div className="space-y-2 text-sm">
                                        <div className="flex justify-between"><span className="text-muted-foreground">Montant</span><span>{feeCalc.amount} {feeCalc.currency}</span></div>
                                        <div className="flex justify-between"><span className="text-muted-foreground">Frais</span><span>{feeCalc.fee} {feeCalc.currency}</span></div>
                                        <Separator />
                                        <div className="flex justify-between font-bold text-base"><span >Total à payer</span><span>{feeCalc.total_amount} {feeCalc.currency}</span></div>
                                    </div>
                                    <Separator className="border-dashed" />
                                    <div className="flex items-center justify-between text-base">
                                        <span className="font-semibold flex items-center gap-2">
                                          {feeCalc.payment_method === 'lightning' ? <Zap className="size-5 text-primary" /> : <Bitcoin className="size-5 text-primary" />}
                                          Vous recevrez
                                        </span>
                                        <span className="font-bold font-mono">
                                          {feeCalc.payment_method === 'lightning'
                                            ? `${feeCalc.sats_amount} sats`
                                            : `${feeCalc.btc_amount} BTC`}
                                        </span>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                </CardContent>
                <CardFooter>
                    <Button type="submit" size="lg" className="w-full" disabled={!feeCalc || isCalculating || isSubmitting}>
                        {isSubmitting ? <Loader2 className="mr-2 size-4 animate-spin" /> : <ShoppingCart className="mr-2 size-5" />}
                        {isSubmitting ? "Création de la commande..." : "Créer une commande d'achat"}
                    </Button>
                </CardFooter>
            </form>
        </Form>
      </Card>
    </div>
  );
}
