
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import api from '@/lib/api';
import { useState } from "react";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import Link from "next/link";
import { AxiosError } from "axios";

const formSchema = z.object({
  identifier: z.string().min(1, { message: "Veuillez entrer votre e-mail ou nom d'utilisateur." }),
  password: z.string().min(1, { message: "Veuillez entrer votre mot de passe." }),
});

export function LoginForm() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      identifier: "",
      password: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    try {
      const response = await api.login(values);
      const { token, message } = response.data;
      
      localStorage.setItem('authToken', token);
      document.cookie = `authToken=${token}; path=/; max-age=604800; samesite=lax`;

      toast({
        title: "Connexion réussie",
        description: "Bienvenue !",
      });

      if (message && message.includes("Email not verified")) {
          toast({
            title: "Vérification de l'e-mail requise",
            description: "Veuillez vérifier votre e-mail pour activer toutes les fonctionnalités.",
            duration: 5000,
          });
      }

      router.push("/dashboard");
      router.refresh();

    } catch (error: any) {
       if (error instanceof AxiosError && error.response?.data?.message?.includes("Email not verified")) {
          const { token } = error.response.data.data;
          if (token) {
              localStorage.setItem('authToken', token);
              document.cookie = `authToken=${token}; path=/; max-age=604800; samesite=lax`;
              router.push(`/verify-email?email=${encodeURIComponent(values.identifier)}`);
              router.refresh();
              return;
          }
       }

        toast({
          variant: "destructive",
          title: "Échec de la connexion",
          description: error.message,
        });
    } finally {
        setIsLoading(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="identifier"
          render={({ field }) => (
            <FormItem>
              <FormLabel>E-mail ou Nom d'utilisateur</FormLabel>
              <FormControl>
                <Input type="text" placeholder="votre e-mail ou nom d'utilisateur" {...field} autoComplete="username" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <div className="flex justify-between items-center">
                <FormLabel>Mot de passe</FormLabel>
                 <Link href="/forgot-password" className="text-sm font-medium text-primary hover:underline">
                    Mot de passe oublié?
                </Link>
              </div>
              <div className="relative">
                <FormControl>
                  <Input 
                    type={showPassword ? "text" : "password"} 
                    placeholder="********" 
                    {...field} 
                    autoComplete="current-password"
                    className="pr-10"
                  />
                </FormControl>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground"
                  aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isLoading ? 'Connexion...' : 'Se connecter'}
        </Button>
      </form>
    </Form>
  );
}
