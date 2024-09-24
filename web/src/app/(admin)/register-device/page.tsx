"use client";

import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { registerDevice } from "./action";
import deviceSchema from "./zod";
import { useAction } from "next-safe-action/hooks";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/toaster";
import Link from "next/link";

type DeviceFormValues = z.infer<typeof deviceSchema>;

const RegisterDevicePage: React.FC = () => {
  const form = useForm<DeviceFormValues>({
    resolver: zodResolver(deviceSchema),
  });

  const { executeAsync, isExecuting, result } = useAction(registerDevice);

  const onSubmit = async (data: DeviceFormValues) => {
    const response = await executeAsync(data);

    if (response?.data.success) {
      toast.success("Device registered successfully");
    } else {
      toast.error("Failed to register device");
    }
  };

  return (
    <div className="flex flex-col gap-4 items-center justify-center h-screen">
      <h1 className="text-2xl font-bold">Register Device</h1>
      <Card className="w-full max-w-md mx-auto">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <CardHeader>
              <CardTitle>Register Device to WhatsApp Bot</CardTitle>
              <CardDescription>
                Enter your device details to connect to the WhatsApp bot.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Device Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Device Name" {...field} />
                    </FormControl>
                    <FormDescription>This is your Device name.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="mobile_number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>WhatsApp Number</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter WhatsApp number" {...field} />
                    </FormControl>
                    <FormDescription>
                      This is your WhatsApp number.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
            <CardFooter className="flex flex-col gap-2">
              <Button type="submit" className="w-full">
                {isExecuting ? "Registering..." : "Register Device"}
              </Button>
              <Button variant="outline" className="w-full" asChild>
                <Link href="/clients">Back</Link>
              </Button>
            </CardFooter>
          </form>
        </Form>
        <Toaster />
      </Card>
    </div>
  );
};

export default RegisterDevicePage;
