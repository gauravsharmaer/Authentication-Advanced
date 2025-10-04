import React from "react";
import { Route, Routes, BrowserRouter } from "react-router-dom";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Regsiter from "./pages/Regsiter";
import { ToastContainer } from "react-toastify";
import { useAppContext } from "./context/AppContext";
import Otp from "./pages/Otp";
import Loading from "./components/Loading";
import VerifyLink from "./pages/VerifyLink";
import { User } from "../../backend/src/models/user.models";
import Dashboard from "./pages/Dashboard";

const App = () => {
  const { isAuth, loading, user } = useAppContext();
  console.log(isAuth);
  return (
    <>
      {loading ? (
        <Loading />
      ) : (
        <BrowserRouter>
          <Routes>
            <Route path="/" element={isAuth ? <Home /> : <Login />} />
            <Route path="/login" element={isAuth ? <Home /> : <Login />} />
            <Route path="/otp" element={isAuth ? <Home /> : <Otp />} />
            <Route
              path="/token/:token"
              element={isAuth ? <Home /> : <VerifyLink />}
            />

            <Route
              path="/register"
              element={isAuth ? <Home /> : <Regsiter />}
            />

            <Route
              path="/dashboard"
              element={
                isAuth ? (
                  user.role == "admin" ? (
                    <Dashboard />
                  ) : (
                    <Home />
                  )
                ) : (
                  <Regsiter />
                )
              }
            />
          </Routes>
          <ToastContainer />
        </BrowserRouter>
      )}
    </>
  );
};

export default App;
