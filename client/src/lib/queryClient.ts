import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
	if (!res.ok) {
		// Handle authentication errors
		if (res.status === 401) {
			// Clear any stored authentication data
			localStorage.removeItem("token");
			localStorage.removeItem("user");
			// Redirect to login page if not already there
			if (window.location.pathname !== "/login") {
				window.location.href = "/login";
			}
		}

		try {
			const data = await res.json();
			throw new Error(data.message || `${res.status}: ${res.statusText}`);
		} catch (e) {
			// If we can't parse JSON, just use the status text
			const text = res.statusText || "An error occurred";
			throw new Error(`${res.status}: ${text}`);
		}
	}
}

function getAuthHeaders() {
	const token = localStorage.getItem("token");
	const headers: Record<string, string> = {
		Accept: "application/json",
	};

	if (token) {
		headers["Authorization"] = `Bearer ${token}`;
	}

	return headers;
}

export async function apiRequest(
	method: string,
	url: string,
	data?: unknown | undefined
): Promise<Response> {
	const headers: Record<string, string> = {
		...getAuthHeaders(),
	};

	if (data) {
		headers["Content-Type"] = "application/json";
	}

	const res = await fetch(url, {
		method,
		headers,
		body: data ? JSON.stringify(data) : undefined,
		credentials: "include",
		mode: "cors",
	});

	await throwIfResNotOk(res);
	return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
	on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
	({ on401: unauthorizedBehavior }) =>
	async ({ queryKey }) => {
		// Handle array query keys by building a URL with path parts and query params
		let url = "";
		if (Array.isArray(queryKey)) {
			// The first element is always the base path
			const [basePath, ...rest] = queryKey;
			url = String(basePath);

			// If there are additional path parts or query params
			if (rest.length > 0) {
				// Check if the last item is an object (query params)
				const lastItem = rest[rest.length - 1];
				const pathParts = rest.slice(
					0,
					lastItem && typeof lastItem === "object" ? -1 : undefined
				);

				// Add path parts to the URL
				if (pathParts.length > 0) {
					url += "/" + pathParts.map(String).join("/");
				}

				// Add query params if the last item is an object
				if (lastItem && typeof lastItem === "object") {
					const params = new URLSearchParams();
					for (const [key, value] of Object.entries(lastItem)) {
						if (value !== undefined && value !== null) {
							params.append(key, String(value));
						}
					}
					const queryString = params.toString();
					if (queryString) {
						url += `?${queryString}`;
					}
				}
			}
		} else {
			// Handle non-array query key - make TypeScript happy with as any
			url = String(queryKey as any);
		}

		const res = await fetch(url, {
			headers: getAuthHeaders(),
			credentials: "include",
			mode: "cors",
		});

		if (unauthorizedBehavior === "returnNull" && res.status === 401) {
			return null;
		}

		await throwIfResNotOk(res);
		return await res.json();
	};

export const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			queryFn: getQueryFn({ on401: "throw" }),
			refetchOnWindowFocus: true,
			staleTime: 5 * 1000, // 5 seconds
			gcTime: 5 * 60 * 1000, // 5 minutes
			retry: false,
			refetchOnMount: true,
			refetchOnReconnect: true,
		},
		mutations: {
			retry: false,
			// Automatically invalidate queries after successful mutations
			onSuccess: () => {
				// This will be overridden by individual mutation's onSuccess handlers
				// But provides a default behavior of refreshing the page data
				queryClient.invalidateQueries();
			},
		},
	},
});
