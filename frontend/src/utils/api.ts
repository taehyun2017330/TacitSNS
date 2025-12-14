const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

// Helper function to get user ID from localStorage
const getUserId = (): string | null => {
  return localStorage.getItem('userId');
};

// Helper function to make authenticated API calls
export const apiCall = async (
  endpoint: string,
  options: RequestInit = {}
): Promise<any> => {
  try {
    const userId = getUserId();

    const headers: HeadersInit = {
      "Content-Type": "application/json",
      ...options.headers,
    };

    // Add user ID header for simple auth (HCI study only)
    if (userId) {
      headers["X-User-ID"] = userId;
    }

    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({
        message: "An error occurred",
      }));
      throw new Error(error.message || `HTTP error ${response.status}`);
    }

    return await response.json();
  } catch (error: any) {
    throw new Error(error.message);
  }
};

// GET request
export const get = (endpoint: string) => {
  return apiCall(endpoint, { method: "GET" });
};

// POST request
export const post = (endpoint: string, data: any) => {
  return apiCall(endpoint, {
    method: "POST",
    body: JSON.stringify(data),
  });
};

// PUT request
export const put = (endpoint: string, data: any) => {
  return apiCall(endpoint, {
    method: "PUT",
    body: JSON.stringify(data),
  });
};

// DELETE request
export const del = (endpoint: string) => {
  return apiCall(endpoint, { method: "DELETE" });
};

// Example: Call LLM endpoint
export const chatWithLLM = async (message: string, model: string = "gpt-4o-mini") => {
  return post("/api/llm/chat", { message, model });
};

// Example: Log user activity
export const logActivity = async (userId: string, action: string) => {
  return post("/api/example/log-activity", { user_id: userId, action });
};
