import { createContext, useState } from "react";
// import axios from "axios";
import { useEffect } from "react";
import { useContext } from "react";
import api from "../apiInterceptor";
import { toast } from "react-toastify";

// eslint-disable-next-line react-refresh/only-export-components
export const AppContext = createContext(undefined);

const AppProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuth, setAuth] = useState(false);

  async function fetchUser() {
    setLoading(true);
    try {
      const { data } = await api.get(`/me`);
      setUser(data);
      setAuth(true);
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  }
  async function logoutUser(navigate) {
    try {
      const { data } = await api.post("/logout");
      toast.success(data.message);
      setAuth(false);
      setUser(null);
      navigate("/login");
    } catch (error) {
      toast.error("something went wrong");
      console.log(error);
    }
  }

  async function getTest() {
    try {
      const { data } = await api.get("/get");
      toast.success(data.message);
    } catch (error) {
      toast.error("something went wrong");
      console.log(error);
    }
  }

  useEffect(() => {
    fetchUser();
  }, []);
  return (
    <AppContext.Provider
      value={{ setAuth, isAuth, user, setUser, loading, logoutUser, getTest }}
    >
      {children}
    </AppContext.Provider>
  );
};

const useAppContext = () => {
  const appContextObject = useContext(AppContext);
  if (!appContextObject) {
    throw new Error("useAppContext() must be used within a app provider");
  }

  return appContextObject;
};

// eslint-disable-next-line react-refresh/only-export-components
export { AppProvider, useAppContext };

// 17 seater-10
// 21 seater-12
//both at 10
// ertiga-4
// cruiser-8
