
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
import { ArrowLeft, AlertCircle, Loader2, Zap, Bitcoin, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProviderIcon } from "@/components/provider-icon";
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";

type Step = "network" | "provider" | "amount" | "confirm";

export default function BuyPage() {
    const { toast } = useToast();
    const router = useRouter();

    const [step, setStep] = useState<Step>("network");
    const [network, setNetwork] = useState<"on_chain" | "lightning" | null>(null);
    
    const [providers, setProviders] = useState<BuyProvider[]>([]);
    const [isLoadingProviders, setIsLoadingProviders] = useState(false);
    const [providerError, setProviderError] = useState<string | null>(null);
    const [selectedProvider, setSelectedProvider] = useState<BuyProvider | null>(null);
    
    const [amount, setAmount] = useState<string>('');
    const [currency, setCurrency] = useState<string>('');
    const debouncedAmount = useDebounce(parseFloat(amount), 500);

    const [feeCalc, setFeeCalc] = useState<BuyFeeCalculation | null>(null);
    const [isCalculating, setIsCalculating] = useState(false);
    const [calcError, setCalcError] = useState<string | null>(null);
    
    const [isSubmitting, setIsSubmitting] = useState(false);


    const fetchProviders = useCallback(async (net: "on_chain" | "lightning") => {
        setIsLoadingProviders(true);
        setProviderError(null);
        try {
            const response = await api.getBuyProviders(net);
            setProviders(response.data);
            if (response.data.length > 0) {
                setCurrency(response.data[0].currencies[0] || 'BIF');
            }
        } catch (err: any)      {
            setProviderError(err.message || `Échec du chargement des fournisseurs. Veuillez réessayer.`);
        } finally {
            setIsLoadingProviders(false);
        }
    }, []);

    const calculateFee = useCallback(async (prov: BuyProvider, amt: number, curr: string) => {
        if (!prov || !curr || !network) return;
        setIsCalculating(true);
        setCalcError(null);
        try {
            const response = await api.calculateBuyFee(prov.id, amt, curr, network);
            setFeeCalc(response.data);
        } catch (err: any) {
            setCalcError(err.message || "Impossible de calculer les frais.");
            setFeeCalc(null);
        } finally {
            setIsCalculating(false);
        }
    }, [network]);

    useEffect(() => {
        if (debouncedAmount > 0 && currency && selectedProvider) {
            calculateFee(selectedProvider, debouncedAmount, currency);
        } else {
            setFeeCalc(null);
            setCalcError(null);
        }
    }, [debouncedAmount, currency, selectedProvider, calculateFee]);

    const handleNetworkSelect = (net: "on_chain" | "lightning") => {
        setNetwork(net);
        fetchProviders(net);
        setStep("provider");
    };
    
    const handleProviderSelect = (provider: BuyProvider) => {
        setSelectedProvider(provider);
        setCurrency(provider.currencies[0] || 'BIF');
        setStep("amount");
    };

    const handleAmountNext = () => {
        if (!feeCalc) {
            toast({ variant: 'destructive', title: 'Erreur', description: 'Veuillez entrer un montant valide et attendre le calcul des frais.' });
            return;
        }
        setStep("confirm");
    }

    const handleCreateOrder = async () => {
        if (!feeCalc || !network || !selectedProvider) {
            toast({ variant: 'destructive', title: 'Erreur', description: 'Les informations de la commande sont incomplètes.' });
            return;
        }
        setIsSubmitting(true);
        try {
            const orderPayload: BuyOrderPayload = {
                direction: 'buy',
                payment_method: network,
                provider_id: selectedProvider.id,
                amount: parseFloat(amount),
                amount_currency: currency,
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
    
    const goBack = () => {
        if (step === 'provider') { setNetwork(null); setStep('network'); }
        if (step === 'amount') { setSelectedProvider(null); setStep('provider'); }
        if (step === 'confirm') setStep('amount');
    }

    const renderHeader = () => (
        <div className="space-y-2">
            {step !== "network" && <Button variant="ghost" onClick={goBack} className="-ml-4"><ArrowLeft className="mr-2 size-4" /> Retour</Button>}
            <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Acheter des Bitcoins</h1>
            <p className="text-muted-foreground">Suivez les étapes pour acheter des Bitcoins en toute sécurité.</p>
        </div>
    );

    const renderNetworkStep = () => (
        <Card>
            <CardHeader><CardTitle>Étape 1: Choisissez le réseau</CardTitle><CardDescription>Comment souhaitez-vous recevoir vos Bitcoins ?</CardDescription></CardHeader>
            <CardContent>
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    <Card onClick={() => handleNetworkSelect('on_chain')} className="cursor-pointer hover:border-primary transition-colors p-8 flex flex-col items-center justify-center text-center">
                        <Bitcoin className="size-12 text-primary mb-4"/>
                        <h3 className="font-semibold text-lg">On-Chain</h3>
                        <p className="text-sm text-muted-foreground">Transactions standards sur la blockchain Bitcoin. Idéal pour de plus grandes quantités.</p>
                    </Card>
                    <Card onClick={() => handleNetworkSelect('lightning')} className="cursor-pointer hover:border-primary transition-colors p-8 flex flex-col items-center justify-center text-center">
                        <Zap className="size-12 text-primary mb-4"/>
                        <h3 className="font-semibold text-lg">Lightning</h3>
                        <p className="text-sm text-muted-foreground">Transactions instantanées avec des frais très bas. Idéal pour les paiements rapides.</p>
                    </Card>
                </div>
            </CardContent>
        </Card>
    );

    const renderProviderStep = () => {
        const form = useForm<{providerId: string}>();

        return (
            <Card>
                <CardHeader><CardTitle>Étape 2: Choisissez un fournisseur</CardTitle><CardDescription>Sélectionnez un fournisseur pour votre achat via {network === 'on_chain' ? 'On-Chain' : 'Lightning'}.</CardDescription></CardHeader>
                <Form {...form}>
                <form onSubmit={form.handleSubmit(({providerId}) => handleProviderSelect(providers.find(p => p.id === parseInt(providerId))!))}>
                    <CardContent>
                        {isLoadingProviders && <div className="flex justify-center h-40 items-center"><Loader2 className="animate-spin" /></div>}
                        {providerError && <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertTitle>Erreur</AlertTitle><AlertDescription>{providerError}</AlertDescription></Alert>}
                        {!isLoadingProviders && !providerError && (
                             <FormField
                                control={form.control}
                                name="providerId"
                                rules={{ required: "Veuillez sélectionner un fournisseur."}}
                                render={({ field }) => (
                                    <FormItem>
                                        <FormControl>
                                            <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="space-y-2">
                                                {providers.length > 0 ? providers.map(provider => (
                                                    <FormItem key={provider.id}>
                                                        <FormControl>
                                                            <RadioGroupItem value={String(provider.id)} id={`provider-${provider.id}`} className="peer sr-only" />
                                                        </FormControl>
                                                        <Label htmlFor={`provider-${provider.id}`} className="block rounded-lg border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer">
                                                            <div className="flex items-start gap-4">
                                                                <ProviderIcon provider={provider} />
                                                                <div>
                                                                    <p className="font-semibold">{provider.name}</p>
                                                                    <p className="text-sm text-muted-foreground">{provider.description}</p>
                                                                </div>
                                                            </div>
                                                        </Label>
                                                    </FormItem>
                                                )) : <p className="text-muted-foreground text-center py-8">Aucun fournisseur d'achat n'est disponible pour le moment.</p>}
                                            </RadioGroup>
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        )}
                    </CardContent>
                    <CardFooter>
                        <Button type="submit" className="w-full" size="lg" disabled={providers.length === 0}>Suivant</Button>
                    </CardFooter>
                </form>
                </Form>
            </Card>
        );
    };

    const renderAmountStep = () => {
        return (
            <Card>
                <CardHeader>
                    <div className="flex items-start gap-4">
                        {selectedProvider && <ProviderIcon provider={selectedProvider} />}
                        <div className="flex-1">
                            <CardTitle>Étape 3: Entrez le montant</CardTitle>
                            <CardDescription>Entrez le montant que vous souhaitez acheter via {selectedProvider?.name}.</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center gap-2">
                        <Input 
                            type="number" 
                            placeholder="Montant à payer" 
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            className="h-11 text-base"
                        />
                        {selectedProvider && <Select onValueChange={setCurrency} defaultValue={currency}>
                            <SelectTrigger className="h-11 w-32">
                                <SelectValue placeholder="Devise" />
                            </SelectTrigger>
                            <SelectContent>
                                {selectedProvider.currencies.map(c => <SelectItem key={c} value={c}>{c.toUpperCase()}</SelectItem>)}
                            </SelectContent>
                        </Select>}
                    </div>

                    {(isCalculating || feeCalc || calcError) && (
                     <div className="space-y-2 rounded-lg border bg-secondary/30 p-3 text-sm mt-4">
                        {isCalculating && <div className="flex items-center justify-center text-muted-foreground"><Loader2 className="mr-2 size-4 animate-spin" />Calcul...</div>}
                        {calcError && <div className="text-center text-destructive">{calcError}</div>}
                        {feeCalc && (
                            <div className="space-y-2">
                                <div className="flex justify-between font-bold">
                                    <span className="text-muted-foreground">Vous recevrez environ:</span>
                                    <span className="font-mono text-lg">
                                        {network === 'lightning' ? `${feeCalc.sats_amount} sats` : `${feeCalc.btc_amount} BTC`}
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
                    <Button onClick={handleAmountNext} disabled={!feeCalc || isCalculating} className="w-full" size="lg">Suivant</Button>
                </CardFooter>
            </Card>
        )
    };
    
    const renderConfirmStep = () => {
        if (!selectedProvider || !feeCalc) return null;

        return (
            <Card>
                <CardHeader>
                    <CardTitle>Étape 4: Confirmez votre achat</CardTitle>
                    <CardDescription>Veuillez vérifier les détails de votre commande avant de la créer.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="p-4 rounded-lg bg-secondary border space-y-3 text-sm">
                        <div className="flex justify-between items-center"><span className="text-muted-foreground">Fournisseur</span><span className="font-semibold">{selectedProvider.name}</span></div>
                        <div className="flex justify-between items-center"><span className="text-muted-foreground">Vous payez</span><span className="font-mono font-bold text-base">{feeCalc.total_amount} {feeCalc.currency}</span></div>
                        <div className="border-t border-dashed" />
                        <div className="flex justify-between items-center font-semibold"><span className="text-foreground">Vous recevrez</span>
                        <span className="font-mono text-base">
                            {network === 'lightning' ? `${feeCalc.sats_amount} sats` : `${feeCalc.btc_amount} BTC`}
                        </span></div>
                    </div>
                     <AlertCircle className="text-muted-foreground" />
                     <AlertDescription>
                        En cliquant sur "Créer la commande", une commande sera créée. Vous devrez ensuite effectuer le paiement selon les instructions du fournisseur.
                    </AlertDescription>
                </CardContent>
                <CardFooter>
                    <Button onClick={handleCreateOrder} disabled={isSubmitting} className="w-full" size="lg">
                        {isSubmitting ? <Loader2 className="mr-2 size-4 animate-spin"/> : <ShoppingCart className="mr-2 size-5" />}
                        {isSubmitting ? "Création en cours..." : "Créer la commande"}
                    </Button>
                </CardFooter>
            </Card>
        )
    };

    return (
        <div className="mx-auto max-w-2xl space-y-6">
            {renderHeader()}

            {step === 'network' && renderNetworkStep()}
            {step === 'provider' && renderProviderStep()}
            {step === 'amount' && renderAmountStep()}
            {step === 'confirm' && renderConfirmStep()}
        </div>
    );
}
