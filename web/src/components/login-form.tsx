"use client";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema } from "@/app/login/zod-schema";
import { loginAction } from "@/app/login/action";
import { useAction } from "next-safe-action/hooks";
import { toast } from "sonner";
import type { z } from "zod";

type LoginFormValues = z.infer<typeof loginSchema>;

const DEFAULT_VALUES: LoginFormValues = {
  email: "",
  password: "",
};

export function LoginForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: DEFAULT_VALUES,
  });

  const { executeAsync, isExecuting } = useAction(loginAction);

  const onSubmit = async (data: LoginFormValues) => {
    const res = await executeAsync(data);

    if (res?.serverError) {
      toast.error(res.serverError);
    }
  };

  return (
    <div
      className={cn(
        "flex flex-col gap-6 touch-manipulation",
        className
      )}
      {...props}
    >
      <Card className="border-border/80 shadow-sm">
        <CardHeader className="space-y-2 text-center">
          <h1 className="text-pretty text-xl font-semibold tracking-tight">
            Welcome Back
          </h1>
          <p className="text-pretty text-sm text-muted-foreground">
            Sign in with your email and password.
          </p>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="grid gap-6"
              noValidate
            >
              <div className="grid gap-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          inputMode="email"
                          autoComplete="email"
                          spellCheck={false}
                          placeholder="you@company.com…"
                          {...field}
                        />
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
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          autoComplete="current-password"
                          placeholder="Your password…"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <Button
                type="submit"
                className="w-full"
                disabled={isExecuting}
              >
                {isExecuting ? "Signing in…" : "Sign In"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
