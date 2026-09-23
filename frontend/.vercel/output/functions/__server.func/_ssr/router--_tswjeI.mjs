import { o as __toESM } from "../_runtime.mjs";
import { i as QueryClientProvider, o as require_jsx_runtime, s as require_react } from "../_libs/react+tanstack__react-query.mjs";
import { _ as createRootRoute, d as HeadContent, g as createFileRoute, h as lazyRouteComponent, m as Outlet, p as createRouter, u as Scripts, y as useRouter } from "../_libs/@tanstack/react-router+[...].mjs";
import { o as TriangleAlert } from "../_libs/lucide-react.mjs";
import { t as instance } from "../_libs/i18next.mjs";
import { r as initReactI18next, t as I18nextProvider } from "../_libs/react-i18next.mjs";
import { t as QueryClient } from "../_libs/tanstack__query-core.mjs";
import { a as union, i as string, n as number, r as object, t as literal } from "../_libs/zod.mjs";
import { t as Browser } from "../_libs/i18next-browser-languagedetector+[...].mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/router--_tswjeI.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var __defProp = Object.defineProperty;
var __exportAll = (all, no_symbols) => {
	let target = {};
	for (var name in all) __defProp(target, name, {
		get: all[name],
		enumerable: true
	});
	if (!no_symbols) __defProp(target, Symbol.toStringTag, { value: "Module" });
	return target;
};
function AppErrorComponent({ error }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("main", {
		className: "flex min-h-screen flex-col items-center justify-center gap-3 px-6 text-center bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "text-red-500",
				"aria-hidden": "true",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TriangleAlert, {
					className: "size-10",
					strokeWidth: 2
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
				className: "text-lg font-semibold",
				children: "Something went wrong"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "max-w-md text-sm break-words text-zinc-500 dark:text-zinc-400",
				children: error.message || "An unexpected error occurred. Try reloading the page."
			})
		]
	});
}
var queryClient = new QueryClient({ defaultOptions: { queries: {
	retry: 1,
	refetchOnWindowFocus: false
} } });
/** Clears React Query after logout so the next actor never sees cached rows. */
function clearAppQueryCache() {
	queryClient.clear();
}
/**
* App-wide client provider mounted once near the root (in `src/routes/__root.tsx`).
*/
function AuthProvider({ children }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(QueryClientProvider, {
		client: queryClient,
		children
	});
}
function isGrokEmbedderOrigin(origin) {
	try {
		const url = new URL(origin);
		if (url.protocol !== "https:" && url.protocol !== "http:") return false;
		const host = url.hostname.toLowerCase();
		if (host === "grok.com" || host.endsWith(".grok.com")) return true;
		if (host === "localhost" || host === "127.0.0.1" || host === "[::1]") return true;
		return false;
	} catch {
		return false;
	}
}
function isSandboxPreviewGuestHost(hostname) {
	const host = hostname.toLowerCase();
	return host === "grok-sandbox.com" || host.endsWith(".grok-sandbox.com");
}
function isRemintPreviewPair(guestHost, parentHost) {
	const guest = guestHost.toLowerCase();
	const parent = parentHost.toLowerCase();
	const i = guest.indexOf(".preview.");
	if (i <= 0) return false;
	const label = guest.slice(0, i);
	const rest = guest.slice(i + 9);
	if (label.includes(".") || !rest.includes(".")) return false;
	return parent === rest || parent === `grok.${rest}`;
}
function resolveParentEmbedderOrigin(parentIsSelf, referrer, ancestorOrigin, guestHostname = "") {
	if (parentIsSelf) return null;
	for (const candidate of [referrer, ancestorOrigin ?? ""].filter(Boolean)) try {
		const url = new URL(candidate.includes("://") ? candidate : `https://${candidate}`);
		if (url.protocol !== "https:" && url.protocol !== "http:") continue;
		if (isGrokEmbedderOrigin(url.origin)) return url.origin;
		if (isSandboxPreviewGuestHost(guestHostname) || isRemintPreviewPair(guestHostname, url.hostname)) return url.origin;
	} catch {}
	return null;
}
/**
* Guest side of the grok-web ↔ sandbox preview postMessage bridge.
*
* Activates only when this page is framed by an allowlisted Grok embedder.
* Top-level runs (download/export, local `npm run dev`, deployed sites) noop.
*/
var PREVIEW_BRIDGE_CHANNEL = "grok-preview-bridge";
var EnvelopeSchema = object({
	channel: literal(PREVIEW_BRIDGE_CHANNEL),
	version: number().int().positive(),
	type: string().min(1)
});
var HelloSchema = EnvelopeSchema.extend({ type: literal("hello") });
var NavigateSchema = EnvelopeSchema.extend({
	type: literal("navigate"),
	path: string().min(1)
});
var HistorySchema = EnvelopeSchema.extend({
	type: literal("history"),
	delta: union([literal(-1), literal(1)])
});
function isSafeBridgePath(path) {
	if (!path.startsWith("/") || path.startsWith("//") || path.includes("\\")) return false;
	try {
		return new URL(path, "https://preview.invalid").origin === "https://preview.invalid";
	} catch {
		return false;
	}
}
/**
* Install host↔guest messaging. Returns a dispose function.
* Noops (returns a no-op dispose) when not embedded under a Grok parent.
*/
function installPreviewHostBridge(options = {}) {
	if (typeof window === "undefined") return () => {};
	const ancestorOrigin = typeof location.ancestorOrigins !== "undefined" && location.ancestorOrigins.length > 0 ? location.ancestorOrigins[0] : null;
	const parentOrigin = resolveParentEmbedderOrigin(window.parent === window, document.referrer, ancestorOrigin, window.location.hostname);
	if (parentOrigin === null) return () => {};
	const ROOT_STATE_KEY = "__grokPreviewBridgeRoot";
	const originalPushState = window.history.pushState.bind(window.history);
	const originalReplaceState = window.history.replaceState.bind(window.history);
	const isAtHistoryRoot = () => {
		const state = window.history.state;
		return Boolean(state && typeof state === "object" && state[ROOT_STATE_KEY] === true);
	};
	try {
		const current = window.history.state;
		if (!(current !== null && typeof current === "object" && Object.prototype.hasOwnProperty.call(current, ROOT_STATE_KEY))) {
			const isRoot = window.history.length <= 1;
			originalReplaceState(current && typeof current === "object" ? {
				...current,
				[ROOT_STATE_KEY]: isRoot
			} : { [ROOT_STATE_KEY]: isRoot }, "", window.location.href);
		}
	} catch {}
	const post = (message) => {
		window.parent.postMessage(message, parentOrigin);
	};
	const reportLocation = () => {
		post({
			channel: PREVIEW_BRIDGE_CHANNEL,
			version: 1,
			type: "location",
			path: window.location.pathname || "/",
			search: window.location.search,
			hash: window.location.hash
		});
	};
	const reportRoutes = () => {
		const paths = options.getRoutePaths?.() ?? [];
		post({
			channel: PREVIEW_BRIDGE_CHANNEL,
			version: 1,
			type: "routes",
			paths
		});
	};
	const defaultNavigate = (path) => {
		if (!isSafeBridgePath(path)) return;
		try {
			const url = new URL(path, window.location.origin);
			if (url.origin !== window.location.origin) return;
			const next = `${url.pathname}${url.search}${url.hash}`;
			window.history.pushState(window.history.state, "", next);
			window.dispatchEvent(new PopStateEvent("popstate", { state: window.history.state }));
		} catch {}
	};
	const navigate = (path) => {
		if (!isSafeBridgePath(path)) return;
		if (options.navigate) {
			options.navigate(path);
			return;
		}
		defaultNavigate(path);
	};
	const announce = () => {
		reportLocation();
		reportRoutes();
		post({
			channel: PREVIEW_BRIDGE_CHANNEL,
			version: 1,
			type: "ready"
		});
	};
	const onMessage = (event) => {
		if (event.source !== window.parent) return;
		if (event.origin !== parentOrigin) return;
		const envelope = EnvelopeSchema.safeParse(event.data);
		if (!envelope.success || envelope.data.version !== 1) return;
		if (envelope.data.type === "hello") {
			if (!HelloSchema.safeParse(event.data).success) return;
			announce();
			return;
		}
		if (envelope.data.type === "navigate") {
			const parsed = NavigateSchema.safeParse(event.data);
			if (!parsed.success) return;
			navigate(parsed.data.path);
			queueMicrotask(reportLocation);
			return;
		}
		if (envelope.data.type === "history") {
			const parsed = HistorySchema.safeParse(event.data);
			if (!parsed.success) return;
			if (parsed.data.delta === -1 && isAtHistoryRoot()) return;
			window.history.go(parsed.data.delta);
		}
	};
	const onPopState = () => {
		reportLocation();
	};
	const onHashChange = () => {
		reportLocation();
	};
	window.history.pushState = (data, unused, url) => {
		const next = data && typeof data === "object" ? {
			...data,
			[ROOT_STATE_KEY]: false
		} : data;
		originalPushState(next, unused, url);
		reportLocation();
	};
	window.history.replaceState = (data, unused, url) => {
		const next = isAtHistoryRoot() ? {
			...data && typeof data === "object" ? data : {},
			[ROOT_STATE_KEY]: true
		} : data;
		originalReplaceState(next, unused, url);
		reportLocation();
	};
	window.addEventListener("message", onMessage);
	window.addEventListener("popstate", onPopState);
	window.addEventListener("hashchange", onHashChange);
	announce();
	return () => {
		window.removeEventListener("message", onMessage);
		window.removeEventListener("popstate", onPopState);
		window.removeEventListener("hashchange", onHashChange);
		window.history.pushState = originalPushState;
		window.history.replaceState = originalReplaceState;
	};
}
/** Collect static path patterns from a TanStack route tree (best-effort). */
function collectRoutePathsFromTree(routeTree) {
	const paths = /* @__PURE__ */ new Set();
	const walk = (node) => {
		if (!node || typeof node !== "object") return;
		const record = node;
		const full = typeof record.fullPath === "string" ? record.fullPath : typeof record.path === "string" ? record.path : null;
		if (full !== null && full !== "") paths.add(full.startsWith("/") ? full : `/${full}`);
		else if (full === "") paths.add("/");
		const children = record.children;
		if (Array.isArray(children)) for (const child of children) walk(child);
		else if (children && typeof children === "object") for (const child of Object.values(children)) walk(child);
	};
	walk(routeTree);
	return [...paths];
}
/**
* Mount once in `__root.tsx` so the Grok preview chrome can drive navigation
* (and later receive registered routes). Noops when the app is not embedded.
*/
function PreviewHostBridge() {
	const router = useRouter();
	(0, import_react.useEffect)(() => {
		return installPreviewHostBridge({
			navigate: (path) => {
				router.history.push(path);
			},
			getRoutePaths: () => collectRoutePathsFromTree(router.routeTree)
		});
	}, [router]);
	return null;
}
var _rolldown_dynamic_import_helper_default = (glob, path, segments) => {
	const query = path.lastIndexOf("?");
	const v = glob[query === -1 || query < path.lastIndexOf("/") ? path : path.slice(0, query)];
	if (v) return typeof v === "function" ? v() : Promise.resolve(v);
	return new Promise((_, reject) => {
		(typeof queueMicrotask === "function" ? queueMicrotask : setTimeout)(reject.bind(null, /* @__PURE__ */ new Error("Unknown variable dynamic import: " + path + (path.split("/").length !== segments ? ". Note that variables only represent file names one level deep." : ""))));
	});
};
var supportedLanguages = [
	"en",
	"de",
	"es",
	"he",
	"tr",
	"zh-CN",
	"zh-HK",
	"ar",
	"te",
	"fr",
	"it",
	"pt-BR",
	"ko"
];
var rtlLanguages = ["he", "ar"];
function resolveSupportedLanguage(lang) {
	const value = lang || "en";
	const exact = supportedLanguages.find((supported) => supported.toLowerCase() === value.toLowerCase());
	if (exact) return exact;
	const parts = value.toLowerCase().split("-");
	const base = parts[0];
	if (base === "zh") {
		const subtags = new Set(parts.slice(1));
		if (subtags.has("hant") || subtags.has("hk") || subtags.has("mo") || subtags.has("tw")) return "zh-HK";
		return "zh-CN";
	}
	return supportedLanguages.find((supported) => supported === base) ?? "en";
}
var lazyLocaleBackend = {
	type: "backend",
	init: () => {},
	read: (language, _namespace, callback) => {
		_rolldown_dynamic_import_helper_default(/* #__PURE__ */ Object.assign({
			"./locales/ar.json": () => import("./ar-CNqfONtb.mjs"),
			"./locales/de.json": () => import("./de-R-GpejLp.mjs"),
			"./locales/en.json": () => import("./en-CSgM0EwA.mjs"),
			"./locales/es.json": () => import("./es-BVf6KHYl.mjs"),
			"./locales/fr.json": () => import("./fr-D7wqAjkz.mjs"),
			"./locales/he.json": () => import("./he-08DdCwnB.mjs"),
			"./locales/it.json": () => import("./it-7BSoojwY.mjs"),
			"./locales/ko.json": () => import("./ko-BIu4Jqv4.mjs"),
			"./locales/pt-BR.json": () => import("./pt-BR-Dv6V0y7W.mjs"),
			"./locales/te.json": () => import("./te-ByacCJsb.mjs"),
			"./locales/tr.json": () => import("./tr-FEwi2qJY.mjs"),
			"./locales/zh-CN.json": () => import("./zh-CN-D2WrCDtg.mjs"),
			"./locales/zh-HK.json": () => import("./zh-HK-Jl0M7NV0.mjs")
		}), `./locales/${language}.json`, 3).then((module) => callback(null, module.default), (error) => callback(error, false));
	}
};
function applyDirection() {
	const resolved = resolveSupportedLanguage(instance.resolvedLanguage || instance.language);
	const dir = rtlLanguages.includes(resolved) ? "rtl" : "ltr";
	if (typeof document !== "undefined") {
		document.documentElement.lang = resolved;
		document.documentElement.dir = dir;
	}
}
instance.on("languageChanged", applyDirection);
instance.use(lazyLocaleBackend).use(Browser).use(initReactI18next).init({
	fallbackLng: "en",
	supportedLngs: supportedLanguages,
	nonExplicitSupportedLngs: false,
	interpolation: { escapeValue: false },
	detection: {
		order: ["localStorage", "navigator"],
		lookupLocalStorage: "openwa_language",
		caches: ["localStorage"],
		convertDetectedLanguage: (lang) => resolveSupportedLanguage(lang)
	},
	react: { useSuspense: false }
});
var i18n_default = instance;
var styles_default = "/assets/styles-UEm0hSmx.css";
var APP_NAME = "WA Gateway";
var Route$8 = createRootRoute({
	head: () => ({
		meta: [
			{ charSet: "utf-8" },
			{
				name: "viewport",
				content: "width=device-width, initial-scale=1"
			},
			{ title: APP_NAME },
			{
				name: "theme-color",
				content: "#0B0618"
			},
			{
				name: "description",
				content: "Multi-account WhatsApp control center"
			},
			{
				name: "openwa-csp-nonce",
				content: "__OPENWA_CSP_NONCE__"
			}
		],
		links: [
			{
				rel: "icon",
				type: "image/svg+xml",
				href: "/favicon.svg"
			},
			{
				rel: "stylesheet",
				href: styles_default
			},
			{
				rel: "manifest",
				href: "/__grok/manifest.webmanifest"
			},
			{
				rel: "apple-touch-icon",
				href: "/__grok/icon-180.png"
			},
			{
				rel: "preconnect",
				href: "https://fonts.googleapis.com"
			},
			{
				rel: "preconnect",
				href: "https://fonts.gstatic.com",
				crossOrigin: "anonymous"
			},
			{
				rel: "stylesheet",
				href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
			}
		]
	}),
	component: () => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("html", {
		lang: "en",
		suppressHydrationWarning: true,
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("head", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(HeadContent, {}) }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("body", { children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PreviewHostBridge, {}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(I18nextProvider, {
				i18n: i18n_default,
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AuthProvider, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Outlet, {}) })
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Scripts, {})
		] })]
	})
});
var $$splitComponentImporter$1 = () => import("./routes-CfC0zDuV.mjs");
var Route$7 = createFileRoute("/")({ component: lazyRouteComponent($$splitComponentImporter$1, "component") });
var $$splitComponentImporter = () => import("./dashboard-1a9zcwot.mjs");
/**
* The app is served from the Express backend at /dashboard, so it needs a route
* at that path — a router `basepath` did not survive the SPA shell hydration.
*/
var Route$6 = createFileRoute("/dashboard")({ component: lazyRouteComponent($$splitComponentImporter, "component") });
/**
* Server-side reverse proxy to the real Chatery WhatsApp backend.
*
* The app's `/api/*` routes used to answer from `demo-data.ts`, so the UI
* looked healthy while nothing reached WhatsApp. These handlers forward to the
* Express gateway instead, which means a failed send now actually reports as
* failed.
*
* Override the target with WA_GATEWAY_URL when the backend is not on :3001.
*/
var GATEWAY_ORIGIN = (process.env.WA_GATEWAY_URL ?? "http://localhost:2785").replace(/\/+$/, "");
/**
* Pipe one request through to the gateway, preserving method, query, body and
* the response's own status and content type.
*
* The body is copied as bytes rather than re-serialized JSON so that
* `/qr/image` (image/png) survives the round trip alongside the JSON routes.
*/
async function forwardToGateway(request, path) {
	const target = `${GATEWAY_ORIGIN}${path}${new URL(request.url).search}`;
	const headers = new Headers();
	const contentType = request.headers.get("content-type");
	if (contentType) headers.set("content-type", contentType);
	const apiKey = request.headers.get("x-api-key");
	if (apiKey) headers.set("x-api-key", apiKey);
	const hasBody = request.method !== "GET" && request.method !== "HEAD";
	const body = hasBody ? await request.arrayBuffer() : void 0;
	let upstream;
	try {
		upstream = await fetch(target, {
			method: request.method,
			headers,
			body: hasBody && body && body.byteLength > 0 ? body : void 0
		});
	} catch (error) {
		return Response.json({
			success: false,
			message: `Gateway unreachable at ${GATEWAY_ORIGIN} — is the backend running? (${error instanceof Error ? error.message : String(error)})`
		}, { status: 502 });
	}
	const payload = await upstream.arrayBuffer();
	return new Response(payload, {
		status: upstream.status,
		headers: { "content-type": upstream.headers.get("content-type") ?? "application/json" }
	});
}
var Route$5 = createFileRoute("/api/health")({ server: { handlers: { GET: ({ request }) => forwardToGateway(request, "/api/health") } } });
/**
* Saved media (/media/<session>/<chat>/<file>) is served by the gateway. In
* production the backend hosts this SPA so the path resolves directly; this
* route keeps it working in the standalone dev server too.
*/
var Route$4 = createFileRoute("/media/$")({ server: { handlers: { GET: ({ request, params }) => forwardToGateway(request, `/media/${params._splat ?? ""}`) } } });
/** Same-origin validate for the Connect screen (avoids CORS on login). Target: WA_GATEWAY_URL. */
var Route$3 = createFileRoute("/api/auth/validate")({ server: { handlers: { POST: ({ request }) => forwardToGateway(request, "/api/auth/validate") } } });
/** Real credential check against DASHBOARD_USERNAME/PASSWORD on the gateway. */
var Route$2 = createFileRoute("/api/dashboard/login")({ server: { handlers: { POST: ({ request }) => forwardToGateway(request, "/api/dashboard/login") } } });
var Route$1 = createFileRoute("/api/websocket/stats")({ server: { handlers: { GET: ({ request }) => forwardToGateway(request, "/api/websocket/stats") } } });
/** Every /api/whatsapp/* call goes to the real gateway (was a demo stub). */
var Route = createFileRoute("/api/whatsapp/$")({ server: { handlers: {
	GET: ({ request, params }) => proxy(request, params._splat),
	POST: ({ request, params }) => proxy(request, params._splat),
	PATCH: ({ request, params }) => proxy(request, params._splat),
	DELETE: ({ request, params }) => proxy(request, params._splat)
} } });
function proxy(request, splat) {
	return forwardToGateway(request, `/api/whatsapp/${splat ?? ""}`);
}
var rootRouteChildren = {
	IndexRoute: Route$7.update({
		id: "/",
		path: "/",
		getParentRoute: () => Route$8
	}),
	DashboardRoute: Route$6.update({
		id: "/dashboard",
		path: "/dashboard",
		getParentRoute: () => Route$8
	}),
	ApiHealthRoute: Route$5.update({
		id: "/api/health",
		path: "/api/health",
		getParentRoute: () => Route$8
	}),
	MediaSplatRoute: Route$4.update({
		id: "/media/$",
		path: "/media/$",
		getParentRoute: () => Route$8
	}),
	ApiAuthValidateRoute: Route$3.update({
		id: "/api/auth/validate",
		path: "/api/auth/validate",
		getParentRoute: () => Route$8
	}),
	ApiDashboardLoginRoute: Route$2.update({
		id: "/api/dashboard/login",
		path: "/api/dashboard/login",
		getParentRoute: () => Route$8
	}),
	ApiWebsocketStatsRoute: Route$1.update({
		id: "/api/websocket/stats",
		path: "/api/websocket/stats",
		getParentRoute: () => Route$8
	}),
	ApiWhatsappSplatRoute: Route.update({
		id: "/api/whatsapp/$",
		path: "/api/whatsapp/$",
		getParentRoute: () => Route$8
	})
};
var routeTree = Route$8._addFileChildren(rootRouteChildren)._addFileTypes();
var router_exports = /* @__PURE__ */ __exportAll({ getRouter: () => getRouter });
function getRouter() {
	return createRouter({
		routeTree,
		defaultErrorComponent: AppErrorComponent
	});
}
//#endregion
export { clearAppQueryCache as n, router_exports as t };
