
"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useSettings } from "@/context/settings-context";
import api from "@/lib/api";
import {
    AlertDialog,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CopyButton } from "@/components/copy-button";
import { ShieldAlert, Loader2, Moon, Sun, Laptop, KeyRound, Eye, EyeOff, ShieldCheck } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useUser } from "@/hooks/use-user";

const passwordChangeSchema = z.object({
  current_password: z.string().min(1, "Le mot de passe actuel est requis."),
  new_password: z.string().min(8, "Le nouveau mot de passe doit contenir au moins 8 caractères."),
});


export function SettingsClient() {
  const { toast } = useToast();
  const { user, refetchUser } = useUser();
  const { settings, setCurrency, setDisplayUnit, setTheme } = useSettings();
  
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  const passwordForm = useForm<z.infer<typeof passwordChangeSchema>>({ resolver: zodResolver(passwordChangeSchema), defaultValues: { current_password: "", new_password: "" } });

  const handlePasswordChange = async (values: z.infer<typeof passwordChangeSchema>) => {
    setIsChangingPassword(true);
    try {
      await api.changePassword(values);
      toast({ title: "Mot de passe modifié", description: "Votre mot de passe a été mis à jour avec succès." });
      passwordForm.reset();
    } catch (error: any) {
      toast({ variant: "destructive", title: "Échec de la modification du mot de passe", description: error.message });
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Préférences d'Affichage</CardTitle>
          <CardDescription>
            Choisissez comment les valeurs et l'apparence sont affichées dans l'application.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
           <div>
            <Label className="font-medium">Thème d'affichage</Label>
            <p className="text-sm text-muted-foreground pt-1">Personnalisez l'apparence de l'application.</p>
            <RadioGroup
              value={settings.theme}
              onValueChange={(value) => setTheme(value as "light" | "dark" | "system")}
              className="mt-3 grid grid-cols-3 gap-4"
            >
              <RadioGroupItem value="light" id="light" className="sr-only peer" />
              <Label htmlFor="light" className="flex flex-col items-center justify-center rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer">
                <Sun className="mb-2 size-5" />
                Clair
              </Label>
              <RadioGroupItem value="dark" id="dark" className="sr-only peer" />
              <Label htmlFor="dark" className="flex flex-col items-center justify-center rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer">
                <Moon className="mb-2 size-5" />
                Sombre
              </Label>
              <RadioGroupItem value="system" id="system" className="sr-only peer" />
              <Label htmlFor="system" className="flex flex-col items-center justify-center rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer">
                <Laptop className="mb-2 size-5" />
                Système
              </Label>
            </RadioGroup>
          </div>
          <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
            <div className="space-y-1">
              <Label htmlFor="currency">Devise</Label>
              <p className="text-sm text-muted-foreground">
                Définissez votre devise fiat préférée.
              </p>
            </div>
            <Select
              value={settings.currency}
              onValueChange={(value) => setCurrency(value as "usd" | "eur" | "jpy" | "bif")}
            >
              <SelectTrigger id="currency" className="w-full sm:w-48">
                <SelectValue placeholder="Choisir la devise" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="usd">USD</SelectItem>
                <SelectItem value="eur">EUR</SelectItem>
                <SelectItem value="jpy">JPY</SelectItem>
                <SelectItem value="bif">BIF</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="font-medium">Unité d'Affichage Principale</Label>
            <p className="text-sm text-muted-foreground pt-1">Sélectionnez l'unité principale pour afficher votre solde.</p>
            <RadioGroup
              value={settings.displayUnit}
              onValueChange={(value) => setDisplayUnit(value as "btc" | "sats" | "usd" | "bif")}
              className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-4"
            >
              <RadioGroupItem value="btc" id="btc" className="sr-only peer" />
              <Label htmlFor="btc" className="flex h-16 flex-col items-center justify-center rounded-md border-2 border-muted bg-popover p-4 text-center text-sm hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer sm:h-auto sm:py-4 sm:text-base">BTC</Label>
              <RadioGroupItem value="sats" id="sats" className="sr-only peer" />
              <Label htmlFor="sats" className="flex h-16 flex-col items-center justify-center rounded-md border-2 border-muted bg-popover p-4 text-center text-sm hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer sm:h-auto sm:py-4 sm:text-base">Sats</Label>
              <RadioGroupItem value="usd" id="usd" className="sr-only peer" />
              <Label htmlFor="usd" className="flex h-16 flex-col items-center justify-center rounded-md border-2 border-muted bg-popover p-4 text-center text-sm hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer sm:h-auto sm:py-4 sm:text-base">USD</Label>
              <RadioGroupItem value="bif" id="bif" className="sr-only peer" />
              <Label htmlFor="bif" className="flex h-16 flex-col items-center justify-center rounded-md border-2 border-muted bg-popover p-4 text-center text-sm hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer sm:h-auto sm:py-4 sm:text-base">BIF</Label>
            </RadioGroup>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Sécurité & Données</CardTitle>
          <CardDescription>Gérez la sécurité et les données du portefeuille.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4 rounded-lg border p-4">
             <div className="space-y-1">
              <p className="font-semibold">Changer le mot de passe</p>
              <p className="text-sm text-muted-foreground">Mettez à jour le mot de passe de votre compte.</p>
            </div>
             <Form {...passwordForm}>
                <form onSubmit={passwordForm.handleSubmit(handlePasswordChange)} className="space-y-4">
                  <FormField
                    control={passwordForm.control}
                    name="current_password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Mot de passe actuel</FormLabel>
                        <div className="relative">
                          <FormControl>
                            <Input type={showCurrentPassword ? "text" : "password"} {...field} className="pr-10" />
                          </FormControl>
                          <button type="button" onClick={() => setShowCurrentPassword(!showCurrentPassword)} className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground">
                            {showCurrentPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                          </button>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={passwordForm.control}
                    name="new_password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nouveau mot de passe</FormLabel>
                        <div className="relative">
                           <FormControl>
                              <Input type={showNewPassword ? "text" : "password"} {...field} className="pr-10" />
                           </FormControl>
                           <button type="button" onClick={() => setShowNewPassword(!showNewPassword)} className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground">
                             {showNewPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                           </button>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" disabled={isChangingPassword}>
                    {isChangingPassword ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <KeyRound className="mr-2 h-4 w-4"/>}
                    Changer le mot de passe
                  </Button>
                </form>
             </Form>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
