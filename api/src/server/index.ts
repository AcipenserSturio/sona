import { Hono } from "hono";

import { cache } from "hono/cache";
import { cors } from "hono/cors";
import { etag } from "hono/etag";
import { logger } from "hono/logger";
import { prettyJSON } from "hono/pretty-json";
import { secureHeaders } from "hono/secure-headers";
import { trimTrailingSlash } from "hono/trailing-slash";
import type { StatusCode } from "hono/utils/http-status";

import v1 from "./v1";

const twentyFourHours = 24 * 60 * 60;

const app = new Hono({ strict: false })
	.use("*", secureHeaders())
	.use("*", prettyJSON())
	.use("*", trimTrailingSlash())
	.use("*", logger())
	.use(
		"*",
		cors({
			origin: "*",
			maxAge: twentyFourHours,
		}),
	)
	.use(
		"*",
		import.meta.env.MODE === "production"
			? cache({
					cacheName: "sona-api",
					cacheControl: `max-age=${twentyFourHours}`,
				})
			: async (c, next) => await next(),
	)
	.use("*", etag())
	.notFound((c) => c.json({ message: "Not Found", ok: false as const }, 404))
	.onError((err: Error & { status?: StatusCode }, c) => {
		console.error(err);
		return c.json(
			{
				ok: false as const,
				message: err.message,
			},
			err.status ?? 500,
		);
	})
	.get("/", (c) => {
		return c.redirect("/v1");
	})
	.get("/jasima", async (c) => {
		const data = await fetch(
			"https://raw.githubusercontent.com/lipu-linku/jasima/main/data.json",
		).then((r) => r.json());

		return c.json(data);
	})
	.route("/v1", v1);

export default app;

export type AppType = typeof app;
