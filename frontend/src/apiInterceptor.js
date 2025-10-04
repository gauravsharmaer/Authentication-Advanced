// // Creates a custom axios instance with your API base URL

// // withCredentials: true ensures cookies are sent with requests (important for authentication)
// import axios from "axios";

// //as we can read csrf cookie in frontend beacuse we did http:false in backend
// const getCookie = (name) => {
//   const value = `; ${document.cookie}`;
//   const parts = value.split(`; ${name}=`);
//   if (parts.length === 2) return parts.pop().split(";").shift();
// };

// const api = axios.create({
//   baseURL: import.meta.env.VITE_BASE_URL,
//   withCredentials: true,
// });

// //sending csf token in header in case of put , post and delete
// api.interceptors.request.use(
//   (config) => {
//     if (
//       config.method === "post" ||
//       config.method === "put" ||
//       config.method === "delete"
//     ) {
//       const csrfToken = getCookie("csrfToken");
//       if (csrfToken) {
//         config.headers["x-csrf-token"] = csrfToken;
//       }
//     }
//     return config;
//   },
//   (error) => {
//     return Promise.reject(error);
//   }
// );

// //to check if we are calling the api currently liek a  loader
// // isRefreshing: Boolean flag to track if a token refresh is currently in progress

// // failedQueue: Array to store failed requests that need to be retried after token refresh
// let isRefreshing = false;
// let isRefreshingCSRFToken = false;
// //this array will hole all request which failed we will filfil them one by one after refrehing token
// let failedQueue = [];
// let csrfFailedQueue = [];
// // Processes all queued failed requests after token refresh completes

// // If refresh succeeded: resolves all promises (retries requests)

// // If refresh failed: rejects all promises with the error

// // Clears the queue after processing
// //for processing queue elemnets one by one
// const processQueue = (error, token = null) => {
//   failedQueue.forEach((promise) => {
//     //if error then reject all
//     if (error) {
//       promise.reject(error);
//     } else {
//       promise.resolve(token);
//     }
//   });

//   failedQueue = [];
// };

// const processCSRFQueue = (error, token = null) => {
//   csrfFailedQueue.forEach((promise) => {
//     //if error then reject all
//     if (error) {
//       promise.reject(error);
//     } else {
//       promise.resolve(token);
//     }
//   });

//   csrfFailedQueue = [];
// };
// //now we will intercept the api and push failed api to failed queue
// // Intercepts ALL responses from your API

// // Successful responses pass through unchanged

// // Failed responses trigger the error handler

// // originalRequest contains the original failed request configuration
// api.interceptors.response.use(
//   (response) => response,
//   async (error) => {
//     const originalRequest = error.config;
//     // Triggers only on 403 status (unauthorized/token expired)

//     // !originalRequest._retry prevents infinite retry loops
//     // if it is 403 like we made in backend this staus
//     if (error.response?.status === 403 && !originalRequest._retry) {
//       //if error code is for csrf as we set code: in backend while sending response
//       const errorCode = error.response.data?.code || "";
//       if (errorCode.startsWith("CSRF_")) {
//         if (isRefreshingCSRFToken) {
//           return new Promise((resolve, reject) => {
//             csrfFailedQueue.push({ resolve, reject });
//           }).then(() => api(originalRequest));
//         }
//         originalRequest._retry = true;
//         isRefreshingCSRFToken = true;

//         try {
//           await api.post("/refresh-csrf");
//           processCSRFQueue(null);
//           return api(originalRequest);
//         } catch (error) {
//           processCSRFQueue(error, null);
//           return Promise.reject(error);
//         } finally {
//           isRefreshingCSRFToken = false;
//         }
//       }
//       //         If token refresh is already in progress, queues this failed request

//       // Returns a promise that will resolve when token refresh completes

//       // Then retries the original request

//       if (isRefreshing) {
//         return new Promise((resolve, reject) => {
//           failedQueue.push({ resolve, reject });
//         }).then(() => {
//           return api(originalRequest);
//         });
//       }

//       //       Marks request as retried and sets refresh flag

//       // Calls your refresh token endpoint

//       // If successful: processes queue and retries original request

//       // If failed: rejects all queued requests

//       // Always resets the isRefreshing flag
//       originalRequest._retry = true;
//       isRefreshing = true;

//       try {
//         await api.post("/refreshAccessToken");
//         processQueue(null);
//         return api(originalRequest);
//       } catch (error) {
//         processQueue(error, null);
//         return Promise.reject(error);
//       } finally {
//         isRefreshing = false;
//       }
//     }
//     return Promise.reject(error);
//   }
// );
// export default api;

import axios from "axios";

// Utility to get cookie by name
const getCookie = (name) => {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(";").shift();
  return null;
};

const api = axios.create({
  baseURL: import.meta.env.VITE_BASE_URL,
  withCredentials: true,
});

// Attach CSRF token to relevant mutating requests via header
api.interceptors.request.use(
  (config) => {
    if (
      config.method === "post" ||
      config.method === "put" ||
      config.method === "delete"
    ) {
      const csrfToken = getCookie("csrfToken");
      if (csrfToken) {
        config.headers["x-csrf-token"] = csrfToken;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// -- State and helper for refresh queue management --
let isRefreshing = false;
let isRefreshingCSRFToken = false;
let failedQueue = [];
let csrfFailedQueue = [];

// Helper to process queued requests waiting on token refresh
const processQueue = (error, token = null) => {
  failedQueue.forEach((promise) => {
    if (error) {
      promise.reject(error);
    } else {
      promise.resolve(token);
    }
  });
  failedQueue = [];
};

const processCSRFQueue = (error, token = null) => {
  csrfFailedQueue.forEach((promise) => {
    if (error) {
      promise.reject(error);
    } else {
      promise.resolve(token);
    }
  });
  csrfFailedQueue = [];
};

// ---- Enhanced response interceptor for seamless token logic ----
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    // Only run refresh logic if 403 and not already retried
    if (error.response?.status === 403 && !originalRequest._retry) {
      const errorCode = error.response.data?.code || "";

      // ==== CASE 1: BOTH tokens missing, refresh both ====
      // Checks both cookie presence before any queue logic
      if (errorCode === "BOTH_TOKENS_MISSING") {
        originalRequest._retry = true;
        try {
          await api.post("/refreshAccessToken");
          await api.post("/refresh-csrf");
          return api(originalRequest);
        } catch (refreshErr) {
          return Promise.reject(refreshErr);
        }
      }

      // ==== CASE 2: Only CSRF token is missing/expired ====
      if (errorCode.startsWith("CSRF_")) {
        if (isRefreshingCSRFToken) {
          // Queue CSRF failures for parallel requests
          return new Promise((resolve, reject) => {
            csrfFailedQueue.push({ resolve, reject });
          }).then(() => api(originalRequest));
        }
        originalRequest._retry = true;
        isRefreshingCSRFToken = true;
        try {
          await api.post("/refresh-csrf");
          processCSRFQueue(null);
          return api(originalRequest);
        } catch (refreshErr) {
          processCSRFQueue(refreshErr, null);
          return Promise.reject(refreshErr);
        } finally {
          isRefreshingCSRFToken = false;
        }
      }

      // ==== CASE 3: Only access token is missing/expired ====
      if (errorCode.startsWith("ACCESS_")) {
        if (isRefreshing) {
          return new Promise((resolve, reject) => {
            failedQueue.push({ resolve, reject });
          }).then(() => api(originalRequest));
        }
        originalRequest._retry = true;
        isRefreshing = true;
        try {
          await api.post("/refreshAccessToken");
          processQueue(null);
          return api(originalRequest);
        } catch (refreshErr) {
          processQueue(refreshErr, null);
          return Promise.reject(refreshErr);
        } finally {
          isRefreshing = false;
        }
      }
    }
    // No retry logic needed, just pass on the error
    return Promise.reject(error);
  }
);

export default api;
