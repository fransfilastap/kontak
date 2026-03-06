import type { CreateClientConfig } from "@/types/generated/client.gen";

export const createClientConfig: CreateClientConfig = (config) => ({
	...config,
	headers: {
		"Authorization": `Bearer ${process.env.KONTAK_API_KEY ?? "none"}`,
	},
	next: {
		revalidate: 100,
	},
	baseUrl: process.env.KONTAK_API_URL ?? "http://localhost:8080",
});