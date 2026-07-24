import { QueryClient } from "@tanstack/react-query";
import { ApiError } from "./problem";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: (intentos, error) => {
        if (error instanceof ApiError && error.status < 500) return false;
        return intentos < 2;
      },
      refetchOnWindowFocus: false,
    },
    mutations: { retry: false },
  },
});
