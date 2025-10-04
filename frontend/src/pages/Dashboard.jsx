import React from "react";
import { useEffect } from "react";
import { useState } from "react";
import { toast } from "react-toastify";
import api from "../apiInterceptor";

const Dashboard = () => {
  const [content, setContent] = useState("");
  async function fetchAdminData() {
    try {
      const { data } = await api.get(`${import.meta.env.VITE_BASE_URL}/admin`, {
        withCredentials: true,
      });
      toast.success(data.message);
      setContent(data.message);
    } catch (error) {
      toast.error(error.response.data.message);
    }
  }

  useEffect(() => {
    fetchAdminData();
  }, []);
  return <div>Dashboard {content && <h1>{content}</h1>}</div>;
};

export default Dashboard;
